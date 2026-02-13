#!/usr/bin/env bash
# ------------------------------------------------------------------
# Qwen3-TTS Stop Script
# ------------------------------------------------------------------

SESSION="tts"

if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux kill-session -t "$SESSION"
    echo "TTS server stopped."
else
    pkill -f 'tts_server.py' 2>/dev/null && echo "Killed TTS process." || echo "No TTS process found."
fi
