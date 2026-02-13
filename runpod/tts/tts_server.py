"""
Qwen3-TTS FastAPI Server — Dual Mode
Serves both voice-cloned (Base) and emotion-controlled (CustomVoice) TTS.

Endpoints:
  POST /tts          — Voice clone (Pechi) generation, returns WAV
  POST /tts/base64   — Voice clone (Pechi) generation, returns JSON with base64 audio
  POST /tts/custom   — CustomVoice with emotion instruct, returns WAV
  POST /tts/custom/base64 — CustomVoice with emotion instruct, returns JSON
  GET  /health       — Health check
"""

import io
import os
import time
import torch
import base64
import logging
import soundfile as sf
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from qwen_tts import Qwen3TTSModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tts-server")

# --- Config ---
BASE_MODEL_ID = os.getenv("TTS_BASE_MODEL", "Qwen/Qwen3-TTS-12Hz-0.6B-Base")
CUSTOM_MODEL_ID = os.getenv("TTS_CUSTOM_MODEL", "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice")
REF_AUDIO = os.getenv("TTS_REF_AUDIO", "/root/tts-server/pechi-voice-ref.wav")
REF_TEXT = os.getenv("TTS_REF_TEXT", "I am Pechi. Your AI assistant. How can I help you today.")
DEVICE = os.getenv("TTS_DEVICE", "cuda:0")
PORT = int(os.getenv("TTS_PORT", "8007"))

app = FastAPI(title="Qwen3-TTS Dual Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
base_model = None
custom_model = None
voice_prompt = None


# --- Request schemas ---

class CloneRequest(BaseModel):
    text: str
    language: str = "English"
    ref_audio: Optional[str] = None  # base64 wav to override default voice
    ref_text: Optional[str] = None


class CustomRequest(BaseModel):
    text: str
    language: str = "English"
    speaker: str = "Aiden"
    instruct: str = ""


class BatchRequest(BaseModel):
    texts: list[str]
    language: str = "English"


# --- Helpers ---

def _load_model(model_id: str):
    try:
        return Qwen3TTSModel.from_pretrained(
            model_id,
            device_map=DEVICE,
            dtype=torch.bfloat16,
            attn_implementation="flash_attention_2",
        )
    except Exception:
        logger.warning(f"Flash attention not available for {model_id}, falling back to sdpa")
        return Qwen3TTSModel.from_pretrained(
            model_id,
            device_map=DEVICE,
            dtype=torch.bfloat16,
            attn_implementation="sdpa",
        )


def _wav_response(wav, sr, elapsed):
    buf = io.BytesIO()
    sf.write(buf, wav, sr, format="WAV")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="audio/wav",
        headers={
            "X-Generation-Time": f"{elapsed:.3f}",
            "X-Audio-Duration": f"{len(wav)/sr:.3f}",
            "X-Sample-Rate": str(sr),
        },
    )


def _b64_response(wav, sr, elapsed):
    buf = io.BytesIO()
    sf.write(buf, wav, sr, format="WAV")
    buf.seek(0)
    return JSONResponse({
        "audio_base64": base64.b64encode(buf.read()).decode(),
        "sample_rate": sr,
        "duration": len(wav) / sr,
        "generation_time": elapsed,
        "format": "wav",
    })


# --- Startup ---

@app.on_event("startup")
async def load_models():
    global base_model, custom_model, voice_prompt
    t0 = time.time()

    # Load Base model (voice cloning)
    logger.info(f"Loading Base model: {BASE_MODEL_ID}")
    base_model = _load_model(BASE_MODEL_ID)
    logger.info(f"Base model loaded in {time.time() - t0:.1f}s")

    # Pre-compute Pechi voice clone prompt
    if os.path.exists(REF_AUDIO):
        logger.info(f"Creating voice clone prompt from: {REF_AUDIO}")
        voice_prompt = base_model.create_voice_clone_prompt(
            ref_audio=REF_AUDIO,
            ref_text=REF_TEXT,
            x_vector_only_mode=False,
        )
        logger.info("Voice clone prompt ready")
    else:
        logger.warning(f"Reference audio not found: {REF_AUDIO}")

    # Load CustomVoice model (emotion control)
    t1 = time.time()
    logger.info(f"Loading CustomVoice model: {CUSTOM_MODEL_ID}")
    custom_model = _load_model(CUSTOM_MODEL_ID)
    logger.info(f"CustomVoice model loaded in {time.time() - t1:.1f}s")

    logger.info(f"Both models ready in {time.time() - t0:.1f}s total")


# --- Endpoints ---

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "base_model": BASE_MODEL_ID,
        "custom_model": CUSTOM_MODEL_ID,
        "voice_loaded": voice_prompt is not None,
    }


@app.post("/tts")
async def synthesize_clone(req: CloneRequest):
    """Voice clone TTS (Pechi voice), returns WAV."""
    if base_model is None:
        raise HTTPException(503, "Base model not loaded yet")

    t0 = time.time()
    try:
        if req.ref_audio:
            audio_bytes = base64.b64decode(req.ref_audio)
            tmp_path = "/tmp/custom_ref.wav"
            with open(tmp_path, "wb") as f:
                f.write(audio_bytes)
            wavs, sr = base_model.generate_voice_clone(
                text=req.text,
                language=req.language,
                ref_audio=tmp_path,
                ref_text=req.ref_text or None,
            )
        elif voice_prompt is not None:
            wavs, sr = base_model.generate_voice_clone(
                text=req.text,
                language=req.language,
                voice_clone_prompt=voice_prompt,
            )
        else:
            raise HTTPException(500, "No voice prompt loaded and no ref_audio provided")

        elapsed = time.time() - t0
        logger.info(f"[clone] {len(wavs[0])/sr:.2f}s audio in {elapsed:.2f}s (RTF: {elapsed/(len(wavs[0])/sr):.3f})")
        return _wav_response(wavs[0], sr, elapsed)

    except Exception as e:
        logger.error(f"Clone TTS error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@app.post("/tts/base64")
async def synthesize_clone_b64(req: CloneRequest):
    """Voice clone TTS (Pechi voice), returns base64 JSON."""
    if base_model is None:
        raise HTTPException(503, "Base model not loaded yet")

    t0 = time.time()
    try:
        if req.ref_audio:
            audio_bytes = base64.b64decode(req.ref_audio)
            tmp_path = "/tmp/custom_ref.wav"
            with open(tmp_path, "wb") as f:
                f.write(audio_bytes)
            wavs, sr = base_model.generate_voice_clone(
                text=req.text,
                language=req.language,
                ref_audio=tmp_path,
                ref_text=req.ref_text or None,
            )
        elif voice_prompt is not None:
            wavs, sr = base_model.generate_voice_clone(
                text=req.text,
                language=req.language,
                voice_clone_prompt=voice_prompt,
            )
        else:
            raise HTTPException(500, "No voice prompt loaded and no ref_audio provided")

        elapsed = time.time() - t0
        logger.info(f"[clone/b64] {len(wavs[0])/sr:.2f}s audio in {elapsed:.2f}s")
        return _b64_response(wavs[0], sr, elapsed)

    except Exception as e:
        logger.error(f"Clone TTS error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@app.post("/tts/custom")
async def synthesize_custom(req: CustomRequest):
    """CustomVoice TTS with emotion instruct, returns WAV."""
    if custom_model is None:
        raise HTTPException(503, "CustomVoice model not loaded yet")

    t0 = time.time()
    try:
        wavs, sr = custom_model.generate_custom_voice(
            text=req.text,
            language=req.language,
            speaker=req.speaker,
            instruct=req.instruct,
        )

        elapsed = time.time() - t0
        logger.info(f"[custom] speaker={req.speaker} instruct='{req.instruct}' | {len(wavs[0])/sr:.2f}s in {elapsed:.2f}s")
        return _wav_response(wavs[0], sr, elapsed)

    except Exception as e:
        logger.error(f"Custom TTS error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@app.post("/tts/custom/base64")
async def synthesize_custom_b64(req: CustomRequest):
    """CustomVoice TTS with emotion instruct, returns base64 JSON."""
    if custom_model is None:
        raise HTTPException(503, "CustomVoice model not loaded yet")

    t0 = time.time()
    try:
        wavs, sr = custom_model.generate_custom_voice(
            text=req.text,
            language=req.language,
            speaker=req.speaker,
            instruct=req.instruct,
        )

        elapsed = time.time() - t0
        logger.info(f"[custom/b64] speaker={req.speaker} instruct='{req.instruct}' | {len(wavs[0])/sr:.2f}s in {elapsed:.2f}s")
        return _b64_response(wavs[0], sr, elapsed)

    except Exception as e:
        logger.error(f"Custom TTS error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@app.post("/tts/batch")
async def synthesize_batch(req: BatchRequest):
    """Batch voice clone TTS (Pechi voice), returns base64 JSON array."""
    if base_model is None:
        raise HTTPException(503, "Base model not loaded yet")
    if voice_prompt is None:
        raise HTTPException(500, "No voice prompt loaded")

    t0 = time.time()
    try:
        wavs, sr = base_model.generate_voice_clone(
            text=req.texts,
            language=[req.language] * len(req.texts),
            voice_clone_prompt=voice_prompt,
        )

        elapsed = time.time() - t0
        results = []
        for wav in wavs:
            buf = io.BytesIO()
            sf.write(buf, wav, sr, format="WAV")
            buf.seek(0)
            results.append({
                "audio_base64": base64.b64encode(buf.read()).decode(),
                "duration": len(wav) / sr,
            })

        return JSONResponse({
            "results": results,
            "sample_rate": sr,
            "generation_time": elapsed,
            "format": "wav",
        })

    except Exception as e:
        logger.error(f"Batch TTS error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
