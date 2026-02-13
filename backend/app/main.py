"""
Pechi — Maruti Suzuki Service Agent
FastAPI application entry point.
"""

import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from pydantic import BaseModel

from .asr_bot import ASRBot
from . import vlm_agent
from .config import (
    ASR_LANGUAGES,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    LIVEKIT_URL,
    UPLOAD_DIR,
    VLLM_URL,
)
from .database import (
    init_database,
    get_job_cards,
    get_job_card_by_id,
    advance_job_card_status,
    update_job_card_fields,
    update_checklist_item,
    get_media_analyses,
    get_media_analysis_by_id,
    save_media_analysis,
    update_media_analysis,
    JOB_CARD_STATUSES,
)

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
    mode: Optional[str] = "full"  # "full" | "transcribe_only"


class LoginResponse(BaseModel):
    success: bool
    userId: Optional[str] = None
    sessionId: Optional[str] = None
    token: Optional[str] = None
    livekitUrl: str = "ws://localhost:7880"
    message: str = ""


class LogoutRequest(BaseModel):
    userId: str


class StatusUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = ""


class JobCardUpdateRequest(BaseModel):
    assigned_technician: Optional[str] = None
    actual_cost: Optional[float] = None
    notes: Optional[str] = None
    advisor_remarks: Optional[str] = None


class ChecklistToggleRequest(BaseModel):
    key: str
    checked: bool


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

active_bots: dict[str, ASRBot] = {}


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Pechi Service Agent starting...")
    init_database()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
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
    mode = req.mode or "full"
    log.info(f"Language: {ASR_LANGUAGES.get(lang, lang)}, mode: {mode}")
    bot = ASRBot(room_name, user_id, language=lang, mode=mode)
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


# ---------------------------------------------------------------------------
# Job card execution endpoints
# ---------------------------------------------------------------------------


@app.get("/api/job-cards")
async def list_job_cards(status: Optional[str] = None):
    """List all job cards, optionally filtered by status."""
    cards = get_job_cards(status_filter=status)
    return {"success": True, "jobCards": cards}


@app.get("/api/job-cards/{job_id}")
async def get_job_card_detail(job_id: int):
    """Get a single job card with full detail."""
    card = get_job_card_by_id(job_id)
    if not card:
        return {"success": False, "message": "Job card not found"}
    return {"success": True, "jobCard": card}


@app.patch("/api/job-cards/{job_id}/status")
async def update_status(job_id: int, req: StatusUpdateRequest):
    """Advance job card status (service advisor workflow)."""
    if req.status not in JOB_CARD_STATUSES:
        return {"success": False, "message": f"Invalid status. Valid: {JOB_CARD_STATUSES}"}
    return advance_job_card_status(job_id, req.status, req.notes or "")


@app.patch("/api/job-cards/{job_id}")
async def update_job_card(job_id: int, req: JobCardUpdateRequest):
    """Update job card fields (technician, actual cost, notes)."""
    fields = {k: v for k, v in req.model_dump().items() if v is not None}
    if not fields:
        return {"success": False, "message": "No fields to update"}
    return update_job_card_fields(job_id, fields)


@app.patch("/api/job-cards/{job_id}/checklist")
async def toggle_checklist(job_id: int, req: ChecklistToggleRequest):
    """Toggle a checklist item on a job card."""
    return update_checklist_item(job_id, req.key, req.checked)


# ---------------------------------------------------------------------------
# Media upload + VLM analysis endpoints
# ---------------------------------------------------------------------------


@app.post("/api/upload-media")
async def upload_media(
    file: UploadFile = File(...),
    customer_id: Optional[int] = Form(None),
    vehicle_id: Optional[int] = Form(None),
    context: Optional[str] = Form(None),
):
    """Upload an image for VLM analysis. Saves file, analyzes, stores result."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        return {"success": False, "message": f"Invalid file type: {file.content_type}. Allowed: JPEG, PNG, WebP"}

    # Save file with UUID name
    ext = Path(file.filename or "image.jpg").suffix or ".jpg"
    file_id = uuid.uuid4().hex
    file_path = UPLOAD_DIR / f"{file_id}{ext}"
    content = await file.read()
    file_path.write_bytes(content)
    log.info(f"Saved upload: {file_path.name} ({len(content)} bytes)")

    # Analyze with VLM
    result = await vlm_agent.analyze_image(file_path, context=context or "")

    # Save to database
    media_id = save_media_analysis(
        customer_id=customer_id,
        vehicle_id=vehicle_id,
        file_path=str(file_path),
        file_name=file.filename or file_path.name,
        analysis=result["analysis"],
        tags=result["tags"],
        customer_note=context,
    )

    return {
        "success": True,
        "mediaId": media_id,
        "fileName": file.filename,
        "analysis": result["analysis"],
        "tags": result["tags"],
    }


@app.get("/api/media/{customer_id}")
async def list_media(customer_id: int, vehicle_id: Optional[int] = None):
    """List all media analyses for a customer."""
    analyses = get_media_analyses(customer_id, vehicle_id=vehicle_id)
    return {"success": True, "analyses": analyses}


class ReanalyzeRequest(BaseModel):
    context: str


@app.post("/api/media/{media_id}/reanalyze")
async def reanalyze_media(media_id: int, req: ReanalyzeRequest):
    """Re-analyze an existing image with customer feedback context."""
    record = get_media_analysis_by_id(media_id)
    if not record:
        return {"success": False, "message": "Media not found"}

    image_path = Path(record["file_path"])
    if not image_path.exists():
        return {"success": False, "message": "Image file not found"}

    result = await vlm_agent.analyze_image(image_path, context=req.context)

    update_media_analysis(
        media_id,
        analysis=result["analysis"],
        tags=result["tags"],
        customer_note=req.context,
    )

    return {
        "success": True,
        "mediaId": media_id,
        "analysis": result["analysis"],
        "tags": result["tags"],
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8021)
