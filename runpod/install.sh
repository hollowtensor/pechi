#!/usr/bin/env bash
# ------------------------------------------------------------------
# Qwen3-ASR vLLM Installation Script
# Installs vLLM nightly (required for Qwen3-ASR) and system deps.
# Tested on: RunPod (Ubuntu 22.04, Python 3.11, CUDA 12.8, RTX 4090)
# ------------------------------------------------------------------
set -euo pipefail

echo "=== Qwen3-ASR vLLM Installation ==="

# 1. System dependencies
echo "[1/4] Installing system packages..."
apt-get update -qq
apt-get install -y -qq ffmpeg tmux

# 2. Upgrade pip + install uv
echo "[2/4] Installing uv..."
pip install -q uv

# 3. Install vLLM nightly (stable doesn't support Qwen3-ASR yet)
echo "[3/4] Installing vLLM nightly (cu129)..."
uv pip install --system -U vllm --pre \
    --extra-index-url https://wheels.vllm.ai/nightly/cu129 \
    --extra-index-url https://download.pytorch.org/whl/cu129 \
    --index-strategy unsafe-best-match

# 4. Install audio extras
echo "[4/4] Installing vLLM audio support..."
uv pip install --system "vllm[audio]"

# Verify
echo ""
echo "=== Verifying installation ==="
python -c "import vllm; print(f'vllm: {vllm.__version__}')"
python -c "import torch; print(f'torch: {torch.__version__}, CUDA: {torch.cuda.is_available()}')"
tmux -V
ffmpeg -version 2>&1 | head -1

echo ""
echo "=== Installation complete ==="
echo "Run: bash start.sh"
