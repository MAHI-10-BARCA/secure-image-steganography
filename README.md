# Secure Image Steganography Using AES Encryption and LSB Data Hiding

A complete academic mini-project that encrypts a secret message with **AES-256-GCM** (password-derived key via **Scrypt**) and embeds the authenticated ciphertext into the least-significant bits of a PNG or BMP cover image. The resulting stego image can later be used to extract and decrypt the original message with the correct password.

## Features

- AES-256-GCM authenticated encryption
- Scrypt password-based key derivation (random salt per encryption)
- Deterministic LSB embedding (RGB, row-major)
- Payload format with magic header, version, length field
- Image quality metrics: MSE, PSNR, SSIM
- Capacity estimation and validation
- Modern React + FastAPI web interface
- Comprehensive unit tests

## Project Structure

```
secure-steganography/
├── frontend/          # React + TypeScript + Vite + Tailwind
├── backend/           # FastAPI + Pillow + cryptography + scikit-image
├── README.md
└── .gitignore
```

## Prerequisites (Windows)

- Python 3.10+
- Node.js 18+
- npm or yarn

## Setup & Run (Windows)

### 1. Backend

```powershell
cd secure-steganography\backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
$env:PYTHONPATH = "."
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs: http://127.0.0.1:8000/docs  
Health: http://127.0.0.1:8000/api/health

### 2. Frontend

Open a **new** terminal:

```powershell
cd secure-steganography\frontend

npm install
npm run dev
```

Open http://localhost:5173

### 3. Run Tests

```powershell
cd secure-steganography\backend
.\venv\Scripts\activate
$env:PYTHONPATH = "."
pytest tests/ -v
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/encode` | Encrypt + embed (multipart: cover_image, message, password) |
| POST | `/api/decode` | Extract + decrypt (multipart: stego_image, password) |
| POST | `/api/analyze` | Quality metrics (multipart: cover_image, stego_image, optional payload_size_bytes) |

## Payload Format

```
MAGIC (4 bytes) = "SSTG"
VERSION (1 byte) = 1
SALT_LEN (1) + SALT (16)
NONCE_LEN (1) + NONCE (12)
CT_LEN (4 bytes, big-endian)
CIPHERTEXT (variable, includes GCM tag)
```

## Security Notes

- Keys are never stored or logged.
- Passwords and plaintext messages are never written to disk or logs.
- AES-GCM authentication rejects tampered ciphertext.
- Only lossless formats (PNG/BMP) are accepted; JPEG would destroy LSBs.
- LSB steganography is **not** undetectable and is fragile under image transformations.

## Known Limitations

- Statistical steganalysis can detect LSB embedding.
- Resize, crop, or lossy re-encoding destroys the payload.
- Theoretical capacity = (width × height × 3) / 8 bytes.
- Designed for educational / demonstration use.

## License

Academic / educational use.
