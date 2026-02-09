#!/usr/bin/env bash
# ------------------------------------------------------------------
# Qwen3-ASR vLLM Stop Script
# ------------------------------------------------------------------

SESSION="vllm"

if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux kill-session -t "$SESSION"
    echo "vLLM stopped."
else
    pkill -f 'vllm serve' 2>/dev/null && echo "Killed vllm process." || echo "No vLLM process found."
fi
