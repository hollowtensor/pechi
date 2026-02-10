"""
Pechi — Maruti Suzuki Service Agent
FastAPI application entry point.
"""

import logging
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from pydantic import BaseModel

from .asr_bot import ASRBot
from .config import (
    ASR_LANGUAGES,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    LIVEKIT_URL,
    VLLM_URL,
)
from .database import init_database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("pechi")

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
    uvicorn.run("app.main:app", host="0.0.0.0", port=8021)
