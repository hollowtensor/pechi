#!/usr/bin/env bash
# ------------------------------------------------------------------
# Qwen3-ASR vLLM Startup Script
# Starts vLLM serving Qwen3-ASR in a tmux session.
# Run this on the RunPod GPU server.
# ------------------------------------------------------------------
set -euo pipefail

MODEL="${QWEN_ASR_MODEL:-Qwen/Qwen3-ASR-1.7B}"
HOST="${QWEN_ASR_HOST:-0.0.0.0}"
PORT="${QWEN_ASR_PORT:-8000}"
SESSION="vllm"

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -m, --model MODEL    Model name (default: Qwen/Qwen3-ASR-1.7B)"
    echo "  -p, --port PORT      Server port (default: 8000)"
    echo "  -h, --help           Show this help"
    echo ""
    echo "Environment variables: QWEN_ASR_MODEL, QWEN_ASR_HOST, QWEN_ASR_PORT"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--model)  MODEL="$2"; shift 2 ;;
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

echo "=== Starting Qwen3-ASR (vLLM) ==="
echo "  Model: $MODEL"
echo "  Host:  $HOST"
echo "  Port:  $PORT"
echo ""

tmux new-session -d -s "$SESSION" \
    "vllm serve $MODEL \
        --host $HOST \
        --port $PORT \
        2>&1 | tee /tmp/vllm.log"

echo "vLLM starting in tmux session '$SESSION'..."
echo "Waiting for model to load..."

# Wait for server to be ready (up to 120s)
for i in $(seq 1 60); do
    sleep 2
    if curl -s "http://localhost:$PORT/v1/models" 2>/dev/null | grep -q "$MODEL"; then
        echo ""
        echo "=== vLLM is ready ==="
        echo "  Local:    http://localhost:$PORT"
        echo "  Models:   http://localhost:$PORT/v1/models"
        echo "  ASR API:  http://localhost:$PORT/v1/audio/transcriptions"
        echo ""
        echo "Commands:"
        echo "  View logs:    tmux attach -t $SESSION"
        echo "  Stop server:  bash stop.sh"
        exit 0
    fi
    printf "."
done

echo ""
echo "WARNING: Server did not respond within 120s. Check logs:"
echo "  tail -50 /tmp/vllm.log"
echo "  tmux attach -t $SESSION"
