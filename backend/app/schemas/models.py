"""Pydantic models for request/response validation."""

from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"


class EncodeResponse(BaseModel):
    success: bool = True
    message: str = "Encoding successful"
    metadata: Dict[str, Any]
    # stego image is returned as binary; metadata goes in a separate JSON part
    # or we return base64 for simplicity in some clients


class DecodeResponse(BaseModel):
    success: bool = True
    message: str
    recovered_text: str


class AnalyzeResponse(BaseModel):
    success: bool = True
    metrics: Dict[str, Any]


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
