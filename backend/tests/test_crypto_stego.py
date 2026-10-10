"""
Unit and integration tests for encryption, steganography and analysis.
"""

from __future__ import annotations

import io
import os

import numpy as np
import pytest
from PIL import Image

from app.services.encryption import (
    MAGIC_HEADER,
    build_payload,
    decrypt_message,
    encrypt_message,
    parse_payload,
    payload_overhead_bytes,
)
from app.services.image_analysis import analyze_images, calculate_mse, calculate_psnr
from app.services.steganography import (
    calculate_capacity,
    embed_payload,
    extract_payload,
)


def make_test_image(width: int = 64, height: int = 64) -> Image.Image:
    """Create a deterministic RGB test image."""
    rng = np.random.default_rng(42)
    arr = rng.integers(0, 256, size=(height, width, 3), dtype=np.uint8)
    return Image.fromarray(arr, mode="RGB")


class TestEncryption:
    def test_roundtrip_simple(self):
        msg = "Hello, steganography!"
        password = "secret123"
        enc = encrypt_message(msg, password)
        payload = build_payload(enc)
        salt, nonce, ct = parse_payload(payload)
        recovered = decrypt_message(salt, nonce, ct, password)
        assert recovered == msg

    def test_roundtrip_unicode(self):
        msg = "你好世界 🌍 café naïve 🚀"
        password = "pässwörd"
        enc = encrypt_message(msg, password)
        recovered = decrypt_message(enc.salt, enc.nonce, enc.ciphertext, password)
        assert recovered == msg

    def test_empty_message_raises(self):
        with pytest.raises(ValueError):
            encrypt_message("", "password")

    def test_wrong_password(self):
        msg = "secret data"
        enc = encrypt_message(msg, "correct")
        with pytest.raises(ValueError, match="incorrect password|tampered"):
            decrypt_message(enc.salt, enc.nonce, enc.ciphertext, "wrong")

    def test_tampered_ciphertext(self):
        msg = "secret data"
        enc = encrypt_message(msg, "password")
        # flip a bit in the ciphertext
        tampered = bytearray(enc.ciphertext)
        tampered[0] ^= 0x01
        with pytest.raises(ValueError, match="incorrect password|tampered"):
            decrypt_message(enc.salt, enc.nonce, bytes(tampered), "password")

    def test_payload_magic(self):
        enc = encrypt_message("test", "pw")
        payload = build_payload(enc)
        assert payload[:4] == MAGIC_HEADER

    def test_invalid_magic(self):
        bad = b"XXXX" + b"\x00" * 50
        with pytest.raises(ValueError, match="magic"):
            parse_payload(bad)


class TestSteganography:
    def test_capacity(self):
        img = make_test_image(100, 80)
        cap = calculate_capacity(img)
        assert cap == (100 * 80 * 3) // 8

    def test_embed_extract_roundtrip(self):
        img = make_test_image(128, 128)
        msg = "Hidden message for testing LSB embedding"
        password = "testpass"
        enc = encrypt_message(msg, password)
        payload = build_payload(enc)
        stego = embed_payload(img, payload)
        recovered_payload = extract_payload(stego)
        assert recovered_payload == payload
        salt, nonce, ct = parse_payload(recovered_payload)
        assert decrypt_message(salt, nonce, ct, password) == msg

    def test_payload_too_large(self):
        img = make_test_image(16, 16)  # capacity = 16*16*3//8 = 96 bytes
        big = os.urandom(200)
        with pytest.raises(ValueError, match="too large"):
            embed_payload(img, big)

    def test_png_roundtrip_disk(self, tmp_path):
        """Save stego as PNG, reopen, extract."""
        img = make_test_image(96, 96)
        msg = "Persist across PNG save/load"
        password = "diskpass"
        enc = encrypt_message(msg, password)
        payload = build_payload(enc)
        stego = embed_payload(img, payload)

        path = tmp_path / "stego.png"
        stego.save(path, format="PNG")
        reopened = Image.open(path)
        reopened.load()

        recovered_payload = extract_payload(reopened)
        assert recovered_payload == payload
        salt, nonce, ct = parse_payload(recovered_payload)
        assert decrypt_message(salt, nonce, ct, password) == msg


class TestImageAnalysis:
    def test_identical_images(self):
        img = make_test_image(32, 32)
        metrics = analyze_images(img, img)
        assert metrics["mse"] == 0.0 or metrics["mse"] is None
        assert metrics["psnr_infinite"] is True
        assert metrics["ssim"] == pytest.approx(1.0, abs=1e-5)

    def test_mse_psnr(self):
        a = np.zeros((10, 10, 3), dtype=np.uint8)
        b = np.ones((10, 10, 3), dtype=np.uint8) * 2
        mse = calculate_mse(a, b)
        assert mse == 4.0
        psnr = calculate_psnr(mse)
        assert psnr > 0

    def test_after_embedding(self):
        img = make_test_image(64, 64)
        msg = "quality test"
        password = "qpass"
        enc = encrypt_message(msg, password)
        payload = build_payload(enc)
        stego = embed_payload(img, payload)
        metrics = analyze_images(img, stego, payload_size_bytes=len(payload))
        assert metrics["mse"] is not None and metrics["mse"] >= 0
        assert metrics["ssim"] > 0.99  # LSB changes are tiny
        assert "capacity_used_percent" in metrics


class TestEndToEnd:
    def test_full_pipeline(self):
        cover = make_test_image(120, 100)
        secret = "The quick brown fox jumps over the lazy dog. 你好 🌟"
        password = "Str0ng!Pass"

        enc = encrypt_message(secret, password)
        payload = build_payload(enc)
        assert len(payload) <= calculate_capacity(cover)

        stego = embed_payload(cover, payload)
        extracted = extract_payload(stego)
        assert extracted == payload

        salt, nonce, ct = parse_payload(extracted)
        recovered = decrypt_message(salt, nonce, ct, password)
        assert recovered == secret
