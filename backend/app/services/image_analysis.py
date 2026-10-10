"""
Image quality metrics: MSE, PSNR, SSIM and capacity statistics.
"""

from __future__ import annotations

from typing import Any, Dict

import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim


def calculate_mse(img1: np.ndarray, img2: np.ndarray) -> float:
    """Mean Squared Error between two images (same shape)."""
    if img1.shape != img2.shape:
        raise ValueError("Images must have the same dimensions for MSE")
    err = np.mean((img1.astype(np.float64) - img2.astype(np.float64)) ** 2)
    return float(err)


def calculate_psnr(mse: float, max_pixel: float = 255.0) -> float:
    """Peak Signal-to-Noise Ratio in dB. Returns inf for identical images."""
    if mse == 0:
        return float("inf")
    return float(20 * np.log10(max_pixel) - 10 * np.log10(mse))


def calculate_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    """
    Structural Similarity Index for RGB images.
    Uses channel_axis for multi-channel support.
    """
    if img1.shape != img2.shape:
        raise ValueError("Images must have the same dimensions for SSIM")

    # Ensure float in [0, 1] or keep uint8; scikit-image handles data_range
    data_range = 255.0
    # For RGB, channel_axis=-1
    score = ssim(
        img1,
        img2,
        data_range=data_range,
        channel_axis=-1,
        win_size=min(7, min(img1.shape[0], img1.shape[1])),
    )
    return float(score)


def analyze_images(
    cover: Image.Image,
    stego: Image.Image,
    payload_size_bytes: int | None = None,
) -> Dict[str, Any]:
    """
    Compute quality metrics and capacity statistics.
    Both images are converted to RGB for comparison.
    """
    cover_rgb = cover.convert("RGB")
    stego_rgb = stego.convert("RGB")

    if cover_rgb.size != stego_rgb.size:
        raise ValueError("Cover and stego images must have identical dimensions")

    arr1 = np.array(cover_rgb, dtype=np.uint8)
    arr2 = np.array(stego_rgb, dtype=np.uint8)

    mse = calculate_mse(arr1, arr2)
    psnr = calculate_psnr(mse)
    ssim_val = calculate_ssim(arr1, arr2)

    from app.services.steganography import calculate_capacity

    capacity = calculate_capacity(cover_rgb)
    width, height = cover_rgb.size

    result: Dict[str, Any] = {
        "mse": mse if mse != float("inf") else None,
        "psnr_db": psnr if psnr != float("inf") else None,
        "psnr_infinite": psnr == float("inf"),
        "ssim": ssim_val,
        "dimensions": {"width": width, "height": height},
        "theoretical_capacity_bytes": capacity,
        "theoretical_capacity_bits": capacity * 8,
    }

    if payload_size_bytes is not None:
        used_pct = (payload_size_bytes / capacity * 100) if capacity > 0 else 0.0
        result.update(
            {
                "payload_size_bytes": payload_size_bytes,
                "bits_embedded": payload_size_bytes * 8,
                "capacity_used_percent": round(used_pct, 4),
            }
        )

    return result
