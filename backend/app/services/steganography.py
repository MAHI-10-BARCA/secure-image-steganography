"""
LSB steganography for RGB images.
Embeds payload bits into the least significant bit of R, G, B channels
in row-major order (top-left to bottom-right, channel order R-G-B).
"""

from __future__ import annotations

from typing import Tuple

import numpy as np
from PIL import Image


def _bytes_to_bits(data: bytes) -> np.ndarray:
    """Convert bytes to a flat array of bits (MSB first within each byte)."""
    arr = np.frombuffer(data, dtype=np.uint8)
    bits = np.unpackbits(arr)
    return bits


def _bits_to_bytes(bits: np.ndarray) -> bytes:
    """Convert a flat bit array back to bytes (must be multiple of 8)."""
    if len(bits) % 8 != 0:
        # pad with zeros if needed (should not happen with correct length)
        pad = 8 - (len(bits) % 8)
        bits = np.concatenate([bits, np.zeros(pad, dtype=np.uint8)])
    packed = np.packbits(bits)
    return packed.tobytes()


def calculate_capacity(image: Image.Image) -> int:
    """
    Theoretical raw LSB capacity in bytes for an RGB image.
    Uses only the three colour channels; alpha is ignored.
    """
    if image.mode not in ("RGB", "RGBA"):
        raise ValueError(f"Unsupported image mode: {image.mode}. Use RGB or RGBA.")
    width, height = image.size
    # 3 bits per pixel (R, G, B)
    total_bits = width * height * 3
    return total_bits // 8


def embed_payload(image: Image.Image, payload: bytes) -> Image.Image:
    """
    Embed payload into the LSB of RGB channels.
    Returns a new RGB image (alpha channel discarded if present).
    """
    if image.mode not in ("RGB", "RGBA"):
        raise ValueError(f"Unsupported image mode: {image.mode}")

    # Work on RGB only
    rgb = image.convert("RGB")
    arr = np.array(rgb, dtype=np.uint8)
    height, width, _ = arr.shape

    capacity_bits = width * height * 3
    payload_bits = _bytes_to_bits(payload)
    needed_bits = len(payload_bits)

    if needed_bits > capacity_bits:
        raise ValueError(
            f"Payload too large: needs {needed_bits} bits, "
            f"image capacity is {capacity_bits} bits "
            f"({capacity_bits // 8} bytes)."
        )

    # Flatten RGB channels in order: for each pixel R then G then B
    flat = arr.reshape(-1, 3).copy()  # shape (N, 3)
    # We will write into the LSB of each channel sequentially

    bit_idx = 0
    for i in range(flat.shape[0]):
        for c in range(3):
            if bit_idx >= needed_bits:
                break
            # Clear LSB and set new bit
            flat[i, c] = (flat[i, c] & 0xFE) | int(payload_bits[bit_idx])
            bit_idx += 1
        if bit_idx >= needed_bits:
            break

    stego_arr = flat.reshape(height, width, 3)
    stego_img = Image.fromarray(stego_arr, mode="RGB")
    return stego_img


def extract_payload(image: Image.Image, max_bytes: int | None = None) -> bytes:
    """
    Extract bits from LSB of RGB channels and reconstruct payload.
    First reads a fixed-size header to determine the exact payload length,
    then extracts exactly that many bytes.
    """
    from app.services.encryption import (
        MAGIC_HEADER,
        VERSION,
        SALT_SIZE,
        NONCE_SIZE,
        parse_payload,
        payload_overhead_bytes,
    )

    if image.mode not in ("RGB", "RGBA"):
        raise ValueError(f"Unsupported image mode: {image.mode}")

    rgb = image.convert("RGB")
    arr = np.array(rgb, dtype=np.uint8)
    height, width, _ = arr.shape
    flat = arr.reshape(-1, 3)

    total_available_bits = width * height * 3

    # First extract enough bits for the fixed header to learn the length
    # Header layout:
    # MAGIC(4) + VERSION(1) + SALT_LEN(1) + SALT(16) + NONCE_LEN(1) + NONCE(12) + CT_LEN(4)
    header_bytes = payload_overhead_bytes()
    header_bits_needed = header_bytes * 8

    if total_available_bits < header_bits_needed:
        raise ValueError("Image too small to contain a valid payload header")

    # Collect bits
    bits = []
    for i in range(flat.shape[0]):
        for c in range(3):
            bits.append(flat[i, c] & 1)
            if len(bits) >= header_bits_needed:
                break
        if len(bits) >= header_bits_needed:
            break

    header_bits = np.array(bits[:header_bits_needed], dtype=np.uint8)
    header = _bits_to_bytes(header_bits)

    # Parse just enough to get ciphertext length
    # We already know the structure; extract CT_LEN
    # offset after MAGIC+VER+SALT_LEN+SALT+NONCE_LEN+NONCE = 4+1+1+16+1+12 = 35
    ct_len_offset = 4 + 1 + 1 + SALT_SIZE + 1 + NONCE_SIZE
    if len(header) < ct_len_offset + 4:
        raise ValueError("Incomplete header")

    magic = header[0:4]
    if magic != MAGIC_HEADER:
        raise ValueError("Invalid magic header – no supported stego payload found")

    version = header[4]
    if version != VERSION:
        raise ValueError(f"Unsupported payload version: {version}")

    ct_len = int.from_bytes(header[ct_len_offset : ct_len_offset + 4], "big")
    total_payload_bytes = header_bytes + ct_len
    total_bits_needed = total_payload_bytes * 8

    if total_bits_needed > total_available_bits:
        raise ValueError(
            f"Declared payload length ({total_payload_bytes} bytes) exceeds image capacity"
        )

    if max_bytes is not None and total_payload_bytes > max_bytes:
        raise ValueError("Payload exceeds configured maximum size")

    # Extract the full payload bits
    if len(bits) < total_bits_needed:
        # continue collecting
        for i in range(flat.shape[0]):
            for c in range(3):
                # skip already collected
                current_idx = i * 3 + c
                if current_idx < len(bits):
                    continue
                bits.append(flat[i, c] & 1)
                if len(bits) >= total_bits_needed:
                    break
            if len(bits) >= total_bits_needed:
                break

    full_bits = np.array(bits[:total_bits_needed], dtype=np.uint8)
    payload = _bits_to_bytes(full_bits)
    return payload[:total_payload_bytes]  # exact length


def embed_and_get_capacity_info(
    image: Image.Image, payload: bytes
) -> Tuple[Image.Image, dict]:
    """Convenience wrapper that returns stego image + capacity statistics."""
    capacity = calculate_capacity(image)
    payload_size = len(payload)
    used_percent = (payload_size / capacity * 100) if capacity > 0 else 0.0

    stego = embed_payload(image, payload)

    info = {
        "theoretical_capacity_bytes": capacity,
        "payload_size_bytes": payload_size,
        "bits_embedded": payload_size * 8,
        "capacity_used_percent": round(used_percent, 4),
        "image_width": image.width,
        "image_height": image.height,
    }
    return stego, info
