"""
AES-256-GCM encryption with Scrypt key derivation.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.backends import default_backend


# Protocol constants
MAGIC_HEADER = b"SSTG"  # Secure STeganography
VERSION = 1
SALT_SIZE = 16
NONCE_SIZE = 12
KEY_SIZE = 32  # AES-256
TAG_SIZE = 16  # GCM authentication tag


@dataclass
class EncryptionResult:
    salt: bytes
    nonce: bytes
    ciphertext: bytes  # includes the GCM tag at the end


def derive_key(password: str, salt: bytes) -> bytes:
    """Derive a 32-byte key from password using Scrypt."""
    if not password:
        raise ValueError("Password cannot be empty")
    kdf = Scrypt(
        salt=salt,
        length=KEY_SIZE,
        n=2**14,  # 16384
        r=8,
        p=1,
        backend=default_backend(),
    )
    return kdf.derive(password.encode("utf-8"))


def encrypt_message(message: str, password: str) -> EncryptionResult:
    """
    Encrypt a UTF-8 message with AES-256-GCM.
    Returns salt, nonce, and ciphertext (ciphertext || tag).
    """
    if not message:
        raise ValueError("Message cannot be empty")
    if not password:
        raise ValueError("Password cannot be empty")

    salt = os.urandom(SALT_SIZE)
    nonce = os.urandom(NONCE_SIZE)
    key = derive_key(password, salt)

    aesgcm = AESGCM(key)
    plaintext = message.encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)  # associated data = None

    return EncryptionResult(salt=salt, nonce=nonce, ciphertext=ciphertext)


def decrypt_message(
    salt: bytes,
    nonce: bytes,
    ciphertext: bytes,
    password: str,
) -> str:
    """
    Decrypt and authenticate ciphertext.
    Raises ValueError / InvalidTag on failure.
    """
    if len(salt) != SALT_SIZE:
        raise ValueError("Invalid salt length")
    if len(nonce) != NONCE_SIZE:
        raise ValueError("Invalid nonce length")
    if len(ciphertext) < TAG_SIZE:
        raise ValueError("Ciphertext too short")

    key = derive_key(password, salt)
    aesgcm = AESGCM(key)

    try:
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    except Exception as exc:
        # cryptography raises InvalidTag for auth failures
        raise ValueError("Decryption failed: incorrect password or tampered data") from exc

    return plaintext.decode("utf-8")


def build_payload(enc: EncryptionResult) -> bytes:
    """
    Build binary payload:
    MAGIC (4) | VERSION (1) | SALT_LEN (1) | SALT | NONCE_LEN (1) | NONCE |
    CT_LEN (4 big-endian) | CIPHERTEXT
    """
    if len(enc.salt) != SALT_SIZE or len(enc.nonce) != NONCE_SIZE:
        raise ValueError("Invalid salt or nonce size")

    ct_len = len(enc.ciphertext)
    payload = (
        MAGIC_HEADER
        + bytes([VERSION])
        + bytes([SALT_SIZE])
        + enc.salt
        + bytes([NONCE_SIZE])
        + enc.nonce
        + ct_len.to_bytes(4, "big")
        + enc.ciphertext
    )
    return payload


def parse_payload(payload: bytes) -> Tuple[bytes, bytes, bytes]:
    """
    Parse payload and return (salt, nonce, ciphertext).
    Raises ValueError on malformed payload.
    """
    min_header = 4 + 1 + 1 + SALT_SIZE + 1 + NONCE_SIZE + 4
    if len(payload) < min_header:
        raise ValueError("Payload too short for header")

    offset = 0
    magic = payload[offset : offset + 4]
    offset += 4
    if magic != MAGIC_HEADER:
        raise ValueError("Invalid magic header – no supported stego payload found")

    version = payload[offset]
    offset += 1
    if version != VERSION:
        raise ValueError(f"Unsupported payload version: {version}")

    salt_len = payload[offset]
    offset += 1
    if salt_len != SALT_SIZE:
        raise ValueError("Unexpected salt length")
    salt = payload[offset : offset + salt_len]
    offset += salt_len

    nonce_len = payload[offset]
    offset += 1
    if nonce_len != NONCE_SIZE:
        raise ValueError("Unexpected nonce length")
    nonce = payload[offset : offset + nonce_len]
    offset += nonce_len

    if offset + 4 > len(payload):
        raise ValueError("Payload truncated while reading ciphertext length")
    ct_len = int.from_bytes(payload[offset : offset + 4], "big")
    offset += 4

    if ct_len < TAG_SIZE:
        raise ValueError("Ciphertext length too small")
    if offset + ct_len > len(payload):
        raise ValueError("Payload truncated – incomplete ciphertext")

    ciphertext = payload[offset : offset + ct_len]
    return salt, nonce, ciphertext


def payload_overhead_bytes() -> int:
    """Fixed overhead excluding the variable ciphertext length."""
    # MAGIC + VERSION + SALT_LEN + SALT + NONCE_LEN + NONCE + CT_LEN
    return 4 + 1 + 1 + SALT_SIZE + 1 + NONCE_SIZE + 4
