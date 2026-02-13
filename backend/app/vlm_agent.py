"""
VLM Agent — Image analysis for vehicle damage / service context.
Sends images to a local LM Studio vision model and returns structured analysis.
"""

import base64
import logging
from pathlib import Path

import httpx
from PIL import Image

from .config import MAX_IMAGE_SIZE, VLM_MODEL, VLM_URL

log = logging.getLogger("vlm_agent")

SYSTEM_PROMPT = """You are a vehicle inspection analyst at a Maruti Suzuki service center.

Analyze the uploaded image and provide:
1. **Description**: What the image shows (vehicle part, damage, condition, warning light, etc.)
2. **Damage/Issue**: Type and severity of any damage or issue visible (none, minor, moderate, severe)
3. **Affected Parts**: List any vehicle parts visible or affected
4. **Recommended Action**: What service action is recommended based on what you see

Be concise and factual. Focus on details relevant to vehicle service and repair.
If the image is not related to a vehicle or service, describe what you see and note it is unrelated.

After your analysis, on a new line write:
TAGS: comma-separated list of relevant tags (e.g. "bonnet, dent, moderate damage, body repair")"""


def _resize_image(image_path: Path) -> Path:
    """Resize image so longest side is at most MAX_IMAGE_SIZE. Returns path (may be same file)."""
    with Image.open(image_path) as img:
        w, h = img.size
        if max(w, h) <= MAX_IMAGE_SIZE:
            return image_path

        if w >= h:
            new_w = MAX_IMAGE_SIZE
            new_h = int(h * MAX_IMAGE_SIZE / w)
        else:
            new_h = MAX_IMAGE_SIZE
            new_w = int(w * MAX_IMAGE_SIZE / h)

        img = img.resize((new_w, new_h), Image.LANCZOS)
        img.save(image_path)
        log.info(f"Resized {image_path.name}: {w}x{h} → {new_w}x{new_h}")
    return image_path


def _image_to_base64_url(image_path: Path) -> str:
    """Read image file and return a data URL for the OpenAI vision API."""
    suffix = image_path.suffix.lower()
    mime = "image/jpeg" if suffix in (".jpg", ".jpeg") else "image/png"
    data = image_path.read_bytes()
    b64 = base64.b64encode(data).decode()
    return f"data:{mime};base64,{b64}"


async def analyze_image(image_path: Path, context: str = "") -> dict:
    """Analyze a vehicle image using the VLM.

    Args:
        image_path: Path to the saved image file.
        context: Optional extra context (e.g. "Customer says bonnet is damaged").

    Returns:
        {"analysis": str, "tags": list[str]}
    """
    _resize_image(image_path)
    data_url = _image_to_base64_url(image_path)

    user_content = [
        {"type": "image_url", "image_url": {"url": data_url}},
    ]
    if context:
        user_content.append({"type": "text", "text": f"Additional context: {context}"})
    else:
        user_content.append({"type": "text", "text": "Analyze this image."})

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
        try:
            resp = await client.post(
                f"{VLM_URL}/chat/completions",
                json={
                    "model": VLM_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 512,
                },
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError as e:
            log.error(f"VLM request failed: {e}")
            return {"analysis": "Image analysis unavailable — VLM service error.", "tags": []}
        except Exception as e:
            log.error(f"VLM error: {e}")
            return {"analysis": "Image analysis unavailable.", "tags": []}

    text = data["choices"][0]["message"]["content"].strip()

    # Parse tags from the response
    tags = []
    analysis = text
    if "TAGS:" in text:
        parts = text.rsplit("TAGS:", 1)
        analysis = parts[0].strip()
        tags = [t.strip() for t in parts[1].strip().split(",") if t.strip()]

    log.info(f"VLM analysis complete: {len(analysis)} chars, {len(tags)} tags")
    return {"analysis": analysis, "tags": tags}
