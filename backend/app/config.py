"""
Pechi Backend — Configuration
All settings in one place. Override via environment variables.
"""

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "maruti_service.db"

# ---------------------------------------------------------------------------
# LiveKit
# ---------------------------------------------------------------------------

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "ws://localhost:7880")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "secret")

# ---------------------------------------------------------------------------
# vLLM (ASR)
# ---------------------------------------------------------------------------

VLLM_URL = os.getenv("VLLM_URL", "https://sl6b8qqermny8m-8000.proxy.runpod.net")

# ---------------------------------------------------------------------------
# LM Studio (LLM)
# ---------------------------------------------------------------------------

LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://localhost:1234/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen/qwen3-4b-2507")

# ---------------------------------------------------------------------------
# Redis
# ---------------------------------------------------------------------------

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
SESSION_TTL = int(os.getenv("SESSION_TTL", "3600"))  # 1 hour

# ---------------------------------------------------------------------------
# Audio / VAD
# ---------------------------------------------------------------------------

WEBRTC_SAMPLE_RATE = 48000
TARGET_SAMPLE_RATE = 16000

VAD_ENERGY_THRESHOLD = 1000
VAD_SILENCE_DURATION = 0.8
VAD_MIN_SPEECH_DURATION = 0.8
MIN_AUDIO_SECONDS = 0.5
MIN_SPEECH_RMS = 800

# ---------------------------------------------------------------------------
# LLM token budget
# ---------------------------------------------------------------------------

TOKEN_BUDGET = 24000
SUMMARIZE_THRESHOLD = 16000
RECENT_MESSAGES_KEEP = 8
TOOL_RESULT_MAX_CHARS = 800
MAX_TOOL_ROUNDS = 5

# ---------------------------------------------------------------------------
# ASR languages
# ---------------------------------------------------------------------------

ASR_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
}
