"""
Secure Image Steganography API
FastAPI application entry point.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.api import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Secure Image Steganography API",
    description=(
        "AES-256-GCM encryption + LSB steganography. "
        "Encrypt a secret message, hide it inside a PNG/BMP image, "
        "and later extract & decrypt it with the correct password."
    ),
    version="1.0.0",
)

# CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
async def startup():
    logger.info("Secure Steganography API started")


@app.get("/")
async def root():
    return {
        "name": "Secure Image Steganography API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
