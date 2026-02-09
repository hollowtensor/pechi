"""
Pechi — Maruti Suzuki Service Agent
Receives audio via LiveKit WebRTC, transcribes via vLLM on RunPod,
passes transcript to LLM (LM Studio) for agentic response with DB search.
"""

import asyncio
import base64
import io
import json
import logging
import re
import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import httpx
import numpy as np
import soundfile as sf
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from livekit import api, rtc
from pydantic import BaseModel
from scipy.signal import resample_poly

from database import init_database, save_job_card
from llm_agent import LLMAgent
from text_normalizer import normalize_asr_text

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

LIVEKIT_URL = "ws://localhost:7880"
LIVEKIT_API_KEY = "devkey"
LIVEKIT_API_SECRET = "secret"
VLLM_URL = "https://sl6b8qqermny8m-8000.proxy.runpod.net"

WEBRTC_SAMPLE_RATE = 48000
TARGET_SAMPLE_RATE = 16000

VAD_ENERGY_THRESHOLD = 1000
VAD_SILENCE_DURATION = 0.8
VAD_MIN_SPEECH_DURATION = 0.8
MIN_AUDIO_SECONDS = 0.5  # skip very short clips (keystrokes, clicks)
MIN_SPEECH_RMS = 800  # minimum average RMS to send to ASR (skip pure noise)

ASR_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
}


def build_asr_prompt(language: str) -> str:
    lang_name = ASR_LANGUAGES.get(language, "English")
    return (
        f"Transcribe in {lang_name}. "
        "Use digits for all numbers (e.g. 1234 not one two three four). "
        "Format Indian vehicle registration numbers with hyphens (e.g. XX-00-YY-0000)."
    )

# Pattern to parse Qwen3-ASR output: "language English<asr_text>..."
ASR_OUTPUT_PATTERN = re.compile(r"language\s+\w+<asr_text>(.*)", re.DOTALL)


def parse_asr_output(content: str) -> str:
    """Extract transcription text from Qwen3-ASR chat completions output."""
    m = ASR_OUTPUT_PATTERN.search(content)
    if m:
        return m.group(1).strip()
    return content.strip()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("asr_agent")

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    userId: Optional[str] = "default_user"
    language: Optional[str] = "en"

class LoginResponse(BaseModel):
    success: bool
    userId: Optional[str] = None
    sessionId: Optional[str] = None
    token: Optional[str] = None
    livekitUrl: str = "ws://localhost:7880"
    message: str = ""

class LogoutRequest(BaseModel):
    userId: str

# ---------------------------------------------------------------------------
# Audio utilities
# ---------------------------------------------------------------------------

def resample_audio(audio: np.ndarray, from_sr: int, to_sr: int) -> np.ndarray:
    if from_sr == to_sr:
        return audio
    from math import gcd
    g = gcd(from_sr, to_sr)
    return resample_poly(audio, to_sr // g, from_sr // g).astype(audio.dtype)


def audio_to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    """Convert int16 audio array to WAV file bytes."""
    buf = io.BytesIO()
    sf.write(buf, audio.astype(np.float32) / 32768.0, sample_rate, format="WAV")
    return buf.getvalue()


def compute_rms(audio: np.ndarray) -> float:
    return float(np.sqrt(np.mean(audio.astype(np.float64) ** 2)))

# ---------------------------------------------------------------------------
# ASR Bot with LLM Agent
# ---------------------------------------------------------------------------

class ASRBot:
    def __init__(self, room_name: str, user_id: str, language: str = "en"):
        self.room_name = room_name
        self.user_id = user_id
        self.language = language
        self.room = rtc.Room()
        self.stop_event = asyncio.Event()
        self.generating = False
        self.http = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))
        self.llm = LLMAgent(user_id, send_data_callback=self._send_data)
        self._tasks: list[asyncio.Task] = []

    async def start(self):
        token = (
            api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
            .with_identity(f"asr-bot-{self.user_id[:8]}")
            .with_name("Pechi Service Agent")
            .with_grants(
                api.VideoGrants(
                    room_join=True, room=self.room_name,
                    can_publish=True, can_subscribe=True,
                )
            )
            .to_jwt()
        )

        self.room.on("track_subscribed")(self._on_track_subscribed)
        self.room.on("disconnected")(self._on_disconnected)
        self.room.on("data_received")(self._on_data_received)

        await self.room.connect(LIVEKIT_URL, token)
        log.info(f"Bot connected to room {self.room_name}")

        # Verify vLLM is reachable
        try:
            resp = await self.http.get(f"{VLLM_URL}/v1/models")
            models = resp.json()
            log.info(f"vLLM models: {[m['id'] for m in models['data']]}")
        except Exception as e:
            log.error(f"vLLM not reachable: {e}")
            raise

        # Restore LLM session from Redis if available
        restored = await self.llm.load_from_redis()
        if restored:
            await self._send_data({"type": "status", "text": "Welcome back — session restored"})
        else:
            await self._send_data({"type": "status", "text": "Ready — start speaking"})

    async def _send_data(self, msg: dict):
        await self.room.local_participant.publish_data(
            json.dumps(msg).encode(), reliable=True, topic="transcription",
        )

    def _on_track_subscribed(
        self, track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        log.info(f"Subscribed to {track.kind} from {participant.identity}")
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            audio_stream = rtc.AudioStream(
                track, sample_rate=WEBRTC_SAMPLE_RATE, num_channels=1,
            )
            task = asyncio.create_task(self._process_audio(audio_stream))
            self._tasks.append(task)

    def _on_data_received(self, packet: rtc.DataPacket):
        """Handle incoming data from user (e.g., job card confirmations)."""
        if packet.topic != "user_action":
            return
        try:
            msg = json.loads(packet.data.decode())
            if msg.get("type") == "confirm_job_card":
                asyncio.create_task(self._handle_job_card_confirmation(msg["data"]))
        except Exception as e:
            log.error(f"Data receive error: {e}")

    async def _handle_job_card_confirmation(self, data: dict):
        """Save confirmed job card to database."""
        try:
            job_id = save_job_card(data)
            log.info(f"Job card #{job_id} saved")
            await self._send_data({
                "type": "job_card_confirmed",
                "jobId": job_id,
            })
            await self._send_data({
                "type": "agent_message",
                "text": (
                    f"Your service booking is confirmed! Job card **#{job_id}** has been created "
                    f"for **{data['vehicle']['registrationNo']}** on **{data.get('preferredDate', 'TBD')}**. "
                    f"We'll send you a reminder before your appointment."
                ),
            })
        except Exception as e:
            log.error(f"Job card save error: {e}", exc_info=True)
            await self._send_data({"type": "error", "text": f"Failed to save booking: {e}"})

    def _on_disconnected(self, reason):
        log.info(f"Room disconnected: {reason}")
        self.stop_event.set()

    async def _process_audio(self, audio_stream: rtc.AudioStream):
        log.info("Audio processing started")
        audio_buffer = np.array([], dtype=np.int16)
        speech_detected = False
        speech_start_time = 0.0
        silence_start_time = 0.0

        async for frame_event in audio_stream:
            if self.stop_event.is_set():
                break

            frame = frame_event.frame
            samples = np.frombuffer(frame.data, dtype=np.int16).copy()
            audio_buffer = np.concatenate([audio_buffer, samples])

            if len(audio_buffer) < 4800:  # 100ms at 48kHz
                continue

            rms = compute_rms(audio_buffer[-4800:])
            now = time.time()

            if rms > VAD_ENERGY_THRESHOLD:
                if not speech_detected:
                    speech_detected = True
                    speech_start_time = now
                    log.info(f"Speech started (RMS={rms:.0f})")
                    await self._send_data({"type": "status", "text": "Listening..."})
                silence_start_time = 0.0
            else:
                if speech_detected and silence_start_time == 0.0:
                    silence_start_time = now

            speech_duration = now - speech_start_time if speech_detected else 0
            silence_duration = now - silence_start_time if silence_start_time > 0 else 0

            if (
                speech_detected
                and silence_duration >= VAD_SILENCE_DURATION
                and speech_duration >= VAD_MIN_SPEECH_DURATION
                and not self.generating
            ):
                log.info(f"Speech ended: {speech_duration:.1f}s")
                await self._transcribe(audio_buffer.copy())
                audio_buffer = np.array([], dtype=np.int16)
                speech_detected = False
                silence_start_time = 0.0

            # Keep buffer manageable (max 30s)
            max_samples = WEBRTC_SAMPLE_RATE * 30
            if len(audio_buffer) > max_samples:
                audio_buffer = audio_buffer[-max_samples:]

        log.info("Audio processing ended")

    async def _transcribe(self, audio: np.ndarray):
        self.generating = True
        try:
            # Resample 48kHz → 16kHz
            audio_16k = resample_audio(audio, WEBRTC_SAMPLE_RATE, TARGET_SAMPLE_RATE)
            duration = len(audio_16k) / TARGET_SAMPLE_RATE

            if duration < MIN_AUDIO_SECONDS:
                log.info(f"Skipping short audio ({duration:.2f}s < {MIN_AUDIO_SECONDS}s)")
                await self._send_data({"type": "status", "text": "Ready — start speaking"})
                return

            # Check average energy — skip if it's just background noise
            avg_rms = compute_rms(audio_16k)
            if avg_rms < MIN_SPEECH_RMS:
                log.info(f"Skipping low-energy audio (RMS={avg_rms:.0f} < {MIN_SPEECH_RMS})")
                await self._send_data({"type": "status", "text": "Ready — start speaking"})
                return

            log.info(f"Transcribing {duration:.2f}s of audio (RMS={avg_rms:.0f})")
            await self._send_data({"type": "status", "text": "Transcribing..."})

            # Encode as WAV bytes → base64 data URL
            wav_bytes = audio_to_wav_bytes(audio_16k, TARGET_SAMPLE_RATE)
            audio_b64 = base64.b64encode(wav_bytes).decode()
            audio_data_url = f"data:audio/wav;base64,{audio_b64}"

            # Use chat completions API with system prompt for language/format control
            resp = await self.http.post(
                f"{VLLM_URL}/v1/chat/completions",
                json={
                    "model": "Qwen/Qwen3-ASR-1.7B",
                    "messages": [
                        {"role": "system", "content": build_asr_prompt(self.language)},
                        {
                            "role": "user",
                            "content": [
                                {"type": "audio_url", "audio_url": {"url": audio_data_url}},
                            ],
                        },
                    ],
                    "temperature": 0.01,
                    "max_tokens": 256,
                },
            )

            if resp.status_code == 200:
                result = resp.json()
                raw_content = result["choices"][0]["message"]["content"]
                text = parse_asr_output(raw_content)
                if text:
                    log.info(f"ASR raw: {raw_content[:150]}")
                    log.info(f"Transcription: {text}")
                    # Normalize ASR output as fallback (spoken numbers, registration format)
                    normalized = normalize_asr_text(text)
                    if normalized != text:
                        log.info(f"Normalized: {normalized}")
                    # Send user's speech as a message
                    await self._send_data({"type": "user_message", "text": normalized})

                    # Now pass to LLM agent
                    await self._send_data({"type": "thinking"})
                    log.info("Sending to LLM agent...")
                    agent_response = await self.llm.chat(normalized)
                    log.info(f"Agent response: {agent_response[:100]}...")
                    await self._send_data({"type": "agent_message", "text": agent_response})
                else:
                    log.info("Empty transcription")
                    await self._send_data({"type": "status", "text": "No speech detected"})
            else:
                log.error(f"vLLM error {resp.status_code}: {resp.text}")
                await self._send_data({"type": "error", "text": f"ASR error: {resp.status_code}"})

            await self._send_data({"type": "status", "text": "Ready — start speaking"})

        except Exception as e:
            log.error(f"Transcribe error: {e}", exc_info=True)
            await self._send_data({"type": "error", "text": str(e)})
        finally:
            self.generating = False

    async def stop(self):
        log.info("Stopping bot...")
        self.stop_event.set()
        for task in self._tasks:
            task.cancel()
        await self.room.disconnect()
        await self.http.aclose()
        await self.llm.close()
        log.info("Bot stopped")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

active_bots: dict[str, ASRBot] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Pechi Service Agent starting...")
    init_database()
    yield
    for bot in list(active_bots.values()):
        await bot.stop()
    log.info("Pechi Service Agent stopped")


app = FastAPI(title="Pechi Service Agent", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "pechi-agent", "vllm_url": VLLM_URL}


@app.post("/api/login")
async def login(req: LoginRequest):
    user_id = str(uuid.uuid4())
    room_name = f"asr-{user_id[:8]}"

    # Generate user token
    user_token = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(user_id)
        .with_name(f"user-{user_id[:8]}")
        .with_grants(
            api.VideoGrants(
                room_join=True, room=room_name,
                can_publish=True, can_subscribe=True,
                can_publish_data=True,
            )
        )
        .to_jwt()
    )

    # Create and start bot
    lang = req.language or "en"
    log.info(f"Language: {ASR_LANGUAGES.get(lang, lang)}")
    bot = ASRBot(room_name, user_id, language=lang)
    active_bots[user_id] = bot

    try:
        await bot.start()
    except Exception as e:
        log.error(f"Bot start failed: {e}", exc_info=True)
        del active_bots[user_id]
        return LoginResponse(success=False, message=f"Bot start failed: {e}")

    log.info(f"Login: user={user_id}, room={room_name}")
    return LoginResponse(
        success=True,
        userId=user_id,
        sessionId=room_name,
        token=user_token,
        livekitUrl=LIVEKIT_URL,
        message="Connected",
    )


@app.post("/api/logout")
async def logout(req: LogoutRequest):
    bot = active_bots.pop(req.userId, None)
    if bot:
        await bot.stop()
        log.info(f"Logout: user={req.userId}")
    return {"success": True}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8021)
