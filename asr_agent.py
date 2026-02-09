"""
Qwen3-ASR LiveKit Agent
Receives audio via LiveKit WebRTC, transcribes via vLLM on RunPod,
sends text back via LiveKit data channel.
"""

import asyncio
import io
import json
import logging
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

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

LIVEKIT_URL = "ws://localhost:7880"
LIVEKIT_API_KEY = "devkey"
LIVEKIT_API_SECRET = "secret"
VLLM_URL = "https://sl6b8qqermny8m-8000.proxy.runpod.net"

WEBRTC_SAMPLE_RATE = 48000
TARGET_SAMPLE_RATE = 16000

VAD_ENERGY_THRESHOLD = 600
VAD_SILENCE_DURATION = 0.8
VAD_MIN_SPEECH_DURATION = 0.8
MIN_AUDIO_SECONDS = 0.5  # skip very short clips (keystrokes, clicks)

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
# ASR Bot
# ---------------------------------------------------------------------------

class ASRBot:
    def __init__(self, room_name: str, user_id: str):
        self.room_name = room_name
        self.user_id = user_id
        self.room = rtc.Room()
        self.stop_event = asyncio.Event()
        self.generating = False
        self.http = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))
        self._tasks: list[asyncio.Task] = []

    async def start(self):
        token = (
            api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
            .with_identity(f"asr-bot-{self.user_id[:8]}")
            .with_name("ASR Bot")
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

            log.info(f"Transcribing {duration:.2f}s of audio")

            await self._send_data({"type": "status", "text": "Transcribing..."})

            # Encode as WAV bytes
            wav_bytes = audio_to_wav_bytes(audio_16k, TARGET_SAMPLE_RATE)

            # POST to vLLM /v1/audio/transcriptions (OpenAI-compatible)
            resp = await self.http.post(
                f"{VLLM_URL}/v1/audio/transcriptions",
                files={"file": ("audio.wav", wav_bytes, "audio/wav")},
                data={"model": "Qwen/Qwen3-ASR-1.7B"},
            )

            if resp.status_code == 200:
                result = resp.json()
                text = result.get("text", "").strip()
                if text:
                    log.info(f"Transcription: {text}")
                    await self._send_data({"type": "transcript", "text": text})
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
        log.info("Bot stopped")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

active_bots: dict[str, ASRBot] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("ASR Agent starting...")
    yield
    for bot in list(active_bots.values()):
        await bot.stop()
    log.info("ASR Agent stopped")


app = FastAPI(title="Qwen3-ASR Agent", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "asr-agent", "vllm_url": VLLM_URL}


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
    bot = ASRBot(room_name, user_id)
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
