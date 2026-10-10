"""
API routes for encode, decode, analyze and health.
"""

from __future__ import annotations

import io
import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image, UnidentifiedImageError

from app.services.encryption import (
    build_payload,
    decrypt_message,
    encrypt_message,
    parse_payload,
    payload_overhead_bytes,
)
from app.services.image_analysis import analyze_images
from app.services.steganography import (
    calculate_capacity,
    embed_payload,
    extract_payload,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

# Reasonable limits
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_MESSAGE_CHARS = 500_000
ALLOWED_MODES = {"RGB", "RGBA"}
ALLOWED_FORMATS = {"PNG", "BMP"}


def _load_image(file: UploadFile) -> Image.Image:
    """Load and validate an uploaded image."""
    content = file.file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 15 MB)")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        img = Image.open(io.BytesIO(content))
        img.load()  # force load to catch truncated files
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Unsupported or corrupted image file")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read image: {exc}")

    # Validate format
    fmt = (img.format or "").upper()
    if fmt not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Only PNG and BMP images are supported (got {fmt or 'unknown'}). "
            "JPEG is not suitable because lossy compression destroys LSB data.",
        )

    if img.mode not in ALLOWED_MODES:
        # convert common modes
        if img.mode in ("L", "P", "CMYK"):
            img = img.convert("RGB")
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image mode: {img.mode}. Use RGB or RGBA.",
            )

    return img


@router.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@router.post("/encode")
async def encode(
    cover_image: UploadFile = File(...),
    message: str = Form(...),
    password: str = Form(...),
):
    """
    Encrypt message with AES-256-GCM (Scrypt KDF) and embed into image LSBs.
    Returns the stego PNG image as a binary stream with metadata in headers
    or as a multipart-like JSON + base64 for simplicity.
    We return JSON with base64-encoded stego image for easy frontend handling.
    """
    if not message or not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(message) > MAX_MESSAGE_CHARS:
        raise HTTPException(status_code=400, detail="Message too long")
    if not password:
        raise HTTPException(status_code=400, detail="Password cannot be empty")
    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    try:
        cover = _load_image(cover_image)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Image load failed")
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        # 1. Encrypt
        enc = encrypt_message(message, password)
        payload = build_payload(enc)

        # 2. Capacity check
        capacity = calculate_capacity(cover)
        if len(payload) > capacity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Message too large for this image. "
                    f"Payload size: {len(payload)} bytes, "
                    f"capacity: {capacity} bytes. "
                    "Use a larger image or shorter message."
                ),
            )

        # 3. Embed
        stego = embed_payload(cover, payload)

        # 4. Quality metrics (compare cover vs stego)
        metrics = analyze_images(cover, stego, payload_size_bytes=len(payload))

        # 5. Encode stego as PNG bytes
        buf = io.BytesIO()
        stego.save(buf, format="PNG", compress_level=6)
        stego_bytes = buf.getvalue()

        import base64

        stego_b64 = base64.b64encode(stego_bytes).decode("ascii")

        return {
            "success": True,
            "message": "Encoding successful",
            "stego_image_base64": stego_b64,
            "stego_filename": "stego_image.png",
            "metadata": {
                "payload_size_bytes": len(payload),
                "ciphertext_size_bytes": len(enc.ciphertext),
                "overhead_bytes": payload_overhead_bytes(),
                "theoretical_capacity_bytes": capacity,
                "capacity_used_percent": metrics.get("capacity_used_percent"),
                "bits_embedded": len(payload) * 8,
                "image_width": cover.width,
                "image_height": cover.height,
                "original_mode": cover.mode,
                "mse": metrics.get("mse"),
                "psnr_db": metrics.get("psnr_db"),
                "psnr_infinite": metrics.get("psnr_infinite"),
                "ssim": metrics.get("ssim"),
                "stego_file_size_bytes": len(stego_bytes),
            },
        }
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Encode failed")
        raise HTTPException(status_code=500, detail="Internal encoding error")


@router.post("/decode")
async def decode(
    stego_image: UploadFile = File(...),
    password: str = Form(...),
):
    """Extract and decrypt the hidden message."""
    if not password:
        raise HTTPException(status_code=400, detail="Password cannot be empty")

    try:
        stego = _load_image(stego_image)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        payload = extract_payload(stego)
        salt, nonce, ciphertext = parse_payload(payload)
        plaintext = decrypt_message(salt, nonce, ciphertext, password)
        return {
            "success": True,
            "message": "Decryption successful",
            "recovered_text": plaintext,
        }
    except ValueError as exc:
        # Friendly messages for common failures
        msg = str(exc)
        if "magic header" in msg.lower() or "no supported stego" in msg.lower():
            raise HTTPException(
                status_code=400,
                detail="No supported hidden payload found in this image.",
            )
        if "incorrect password" in msg.lower() or "tampered" in msg.lower():
            raise HTTPException(
                status_code=401,
                detail="Incorrect password or the data has been tampered with.",
            )
        if "truncated" in msg.lower() or "incomplete" in msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Payload appears incomplete or damaged.",
            )
        raise HTTPException(status_code=400, detail=msg)
    except Exception as exc:
        logger.exception("Decode failed")
        raise HTTPException(status_code=500, detail="Internal decoding error")


@router.post("/analyze")
async def analyze(
    cover_image: UploadFile = File(...),
    stego_image: UploadFile = File(...),
    payload_size_bytes: Optional[int] = Form(None),
):
    """Compare cover and stego images and return quality metrics."""
    try:
        cover = _load_image(cover_image)
        stego = _load_image(stego_image)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        metrics = analyze_images(cover, stego, payload_size_bytes=payload_size_bytes)
        return {"success": True, "metrics": metrics}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Analyze failed")
        raise HTTPException(status_code=500, detail="Internal analysis error")
