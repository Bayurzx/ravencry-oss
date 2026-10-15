"""
T-035 · Whisper Service Verification Script

Tests the /health and /transcribe endpoints.
Run after the Docker container is up:
  docker compose up -d whisper
  python services/whisper/test_transcribe.py

Or from outside Docker (if running whisper_server.py directly):
  python services/whisper/test_transcribe.py http://localhost:8000
"""

import sys
import os
import urllib.request
import json

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"


def test_health():
    """Verify /health returns ok."""
    response = urllib.request.urlopen(f"{BASE}/health")
    data = json.loads(response.read())
    assert data["status"] == "ok", f"Expected ok, got {data}"
    assert "model" in data
    assert "uptime_seconds" in data
    print(f"  ✅ /health: model={data['model']}, uptime={data['uptime_seconds']}s")


def test_transcribe_missing_file():
    """Verify 400 when no audio file provided."""
    try:
        req = urllib.request.Request(f"{BASE}/transcribe", method="POST")
        req.add_header("Content-Type", "multipart/form-data")
        urllib.request.urlopen(req)
        assert False, "Expected 400"
    except urllib.error.HTTPError as e:
        assert e.code == 400, f"Expected 400, got {e.code}"
        print(f"  ✅ /transcribe: correctly returns 400 on missing file")


def main():
    print(f"🎙️  Testing Whisper Service at {BASE}")
    try:
        test_health()
        test_transcribe_missing_file()
        print("\n✅ All Whisper service tests passed")
        print("\n📝 To test with real audio:")
        print("   curl -X POST http://localhost:8000/transcribe -F 'audio=@test_hausa.ogg'")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
