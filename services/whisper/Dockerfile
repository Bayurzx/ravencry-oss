# =============================================================================
# RAVENCRY Whisper Service — Dockerfile
# Python 3.11 + faster-whisper + Flask
# CPU-optimised for EC2 t3.large (no GPU required)
# =============================================================================

FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies for faster-whisper + audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Validate critical imports before model download (catches missing transitive deps early)
RUN python -c "import requests; print(f'requests {requests.__version__} OK')"
RUN python -c "import faster_whisper; print('faster-whisper OK')"

COPY whisper_server.py .

# Run as non-root
RUN useradd -m -u 1001 whisper && chown -R whisper:whisper /app
USER whisper

# Pre-download the model at build time (cached in image layer, whisper user home)
ARG WHISPER_MODEL=small
ENV HF_HOME=/home/whisper/.cache/huggingface
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('${WHISPER_MODEL}', device='cpu', compute_type='int8')"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "whisper_server.py"]
