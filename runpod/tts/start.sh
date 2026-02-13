#!/usr/bin/env bash
# ------------------------------------------------------------------
# Qwen3-TTS Dual Mode Startup Script
# Starts TTS server with both Base (Pechi clone) and CustomVoice
# (emotion control) models in a tmux session.
# ------------------------------------------------------------------
set -euo pipefail

HOST="${TTS_HOST:-0.0.0.0}"
PORT="${TTS_PORT:-8007}"
BASE_MODEL="${TTS_BASE_MODEL:-Qwen/Qwen3-TTS-12Hz-0.6B-Base}"
CUSTOM_MODEL="${TTS_CUSTOM_MODEL:-Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice}"
REF_AUDIO="${TTS_REF_AUDIO:-/root/tts-server/pechi-voice-ref.wav}"
REF_TEXT="${TTS_REF_TEXT:-I am Pechi. Your AI assistant. How can I help you today.}"
SESSION="tts"

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -p, --port PORT      Server port (default: 8007)"
    echo "  -h, --help           Show this help"
    echo ""
    echo "Environment variables:"
    echo "  TTS_PORT, TTS_BASE_MODEL, TTS_CUSTOM_MODEL, TTS_REF_AUDIO, TTS_REF_TEXT"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)   PORT="$2"; shift 2 ;;
        -h|--help)   usage; exit 0 ;;
        *)           echo "Unknown option: $1"; usage; exit 1 ;;
    esac
done

# Kill existing session if running
if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "Stopping existing $SESSION session..."
    tmux kill-session -t "$SESSION"
    sleep 2
fi

echo "=== Starting Qwen3-TTS (Dual Mode) ==="
echo "  Base Model:   $BASE_MODEL"
echo "  Custom Model: $CUSTOM_MODEL"
echo "  Port:         $PORT"
echo "  Ref Audio:    $REF_AUDIO"
echo ""

tmux new-session -d -s "$SESSION" \
    "TTS_PORT=$PORT \
     TTS_BASE_MODEL=$BASE_MODEL \
     TTS_CUSTOM_MODEL=$CUSTOM_MODEL \
     TTS_REF_AUDIO=$REF_AUDIO \
     TTS_REF_TEXT='$REF_TEXT' \
    python /root/tts-server/tts_server.py \
        2>&1 | tee /tmp/tts_server.log"

echo "TTS server starting in tmux session '$SESSION'..."
echo "Waiting for models to load..."

# Wait for server to be ready (up to 90s for dual model load)
for i in $(seq 1 45); do
    sleep 2
    if curl -s "http://localhost:$PORT/health" 2>/dev/null | grep -q '"ok"'; then
        echo ""
        echo "=== TTS server is ready ==="
        echo "  Health:         http://localhost:$PORT/health"
        echo ""
        echo "  Voice Clone (Pechi):"
        echo "    POST /tts          — returns WAV"
        echo "    POST /tts/base64   — returns JSON (base64)"
        echo "    POST /tts/batch    — batch generation"
        echo ""
        echo "  CustomVoice (emotion control):"
        echo "    POST /tts/custom        — returns WAV"
        echo "    POST /tts/custom/base64 — returns JSON (base64)"
        echo ""
        echo "  Speakers: Aiden, Ryan (English) | Vivian, Serena, Dylan, Eric, Uncle_Fu (Chinese)"
        echo ""
        echo "Commands:"
        echo "  View logs:    tmux attach -t $SESSION"
        echo "  Stop server:  bash stop.sh"
        exit 0
    fi
    printf "."
done

echo ""
echo "WARNING: Server did not respond within 90s. Check logs:"
echo "  tail -50 /tmp/tts_server.log"
echo "  tmux attach -t $SESSION"
