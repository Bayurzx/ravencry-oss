"""
RAVENCRY Whisper Service — Audio Transcription Server

Endpoints:
  POST /transcribe  — multipart/form-data: audio file → { transcript, language }
  GET  /health      — health check

Supports: English, Hausa, Yoruba, Igbo, Nigerian Pidgin
Model:    faster-whisper (CTranslate2, CPU-optimised)
"""

import os
import tempfile
import time
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")
FLASK_PORT = int(os.getenv("FLASK_PORT", "8000"))

# CPU-optimised: int8 quantisation + 2 threads (t3.large has 2 vCPUs)
# ---------------------------------------------------------------------------
# Init
# ---------------------------------------------------------------------------
start_time = time.time()

COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type=COMPUTE_TYPE, num_workers=2)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024  # 25MB max upload

# ---------------------------------------------------------------------------
# Language mapping for Nigerian languages
# ---------------------------------------------------------------------------
LANGUAGE_MAP = {
    "en": "English",
    "ha": "Hausa",
    "yo": "Yoruba",
    "ig": "Igbo",
    "pcm": "Nigerian Pidgin",
    "ff": "Fulfulde",
    "kr": "Kanuri",
}


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": MODEL_SIZE,
        "device": "cpu",
        "uptime_seconds": round(time.time() - start_time, 1),
    })


@app.route("/transcribe", methods=["POST"])
def transcribe():
    # Validate file presence
    if "audio" not in request.files:
        return jsonify({"error": "missing_audio_file"}), 400

    audio_file = request.files["audio"]
    if audio_file.filename == "":
        return jsonify({"error": "empty_filename"}), 400

    # Optional language hint (e.g. "ha", "en", "yo", "ig")
    language = request.form.get("language") or None

    # Optional: disable VAD (set "vad=0" to bypass)
    use_vad = request.form.get("vad", "1") != "0"

    # Write to temp file (faster-whisper needs a file path, not a stream)
    suffix = os.path.splitext(audio_file.filename or "audio.ogg")[1] or ".ogg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        transcribe_start = time.time()

        # Transcribe with language detection (or forced language)
        transcribe_kwargs = {
            "beam_size": 5,
            "language": language,
            "vad_filter": use_vad,
        }
        if use_vad:
            transcribe_kwargs["vad_parameters"] = dict(min_silence_duration_ms=500)

        segments, info = model.transcribe(tmp_path, **transcribe_kwargs)

        # Collect all segments
        full_text = " ".join(segment.text.strip() for segment in segments)

        # Map detected language
        detected_lang = LANGUAGE_MAP.get(info.language, info.language)

        latency = round(time.time() - transcribe_start, 2)

        return jsonify({
            "transcript": full_text,
            "language_detected": info.language,
            "language_name": detected_lang,
            "language_confidence": round(info.language_probability, 3),
            "duration_seconds": round(info.duration, 1),
            "transcription_latency_ms": int(latency * 1000),
        })

    except Exception as e:
        return jsonify({
            "error": "transcription_failed",
            "details": str(e),
            "transcript": "[audio - transcription failed]",
        }), 500

    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


if __name__ == "__main__":
    print(f"🎙️  RAVENCRY Whisper Service starting on port {FLASK_PORT}")
    print(f"   Model: {MODEL_SIZE} (CPU, int8)")
    app.run(host="0.0.0.0", port=FLASK_PORT, debug=False)
