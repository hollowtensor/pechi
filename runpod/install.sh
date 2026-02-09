#!/usr/bin/env bash
# ------------------------------------------------------------------
# Qwen3-ASR vLLM Installation Script
# Installs vLLM and system dependencies on a CUDA GPU server.
# Tested on: RunPod (Ubuntu 22.04, Python 3.11, CUDA 12.8, RTX 4090)
# ------------------------------------------------------------------
set -euo pipefail

echo "=== Qwen3-ASR vLLM Installation ==="

# 1. System dependencies
echo "[1/3] Installing system packages..."
apt-get update -qq
apt-get install -y -qq ffmpeg tmux

# 2. Upgrade pip
echo "[2/3] Upgrading pip..."
python -m pip install --upgrade pip -q

# 3. Install vLLM (includes torch, transformers, etc.)
echo "[3/3] Installing vLLM..."
pip install -U vllm -q

# Verify
echo ""
echo "=== Verifying installation ==="
vllm --version 2>/dev/null || python -c "import vllm; print(f'vllm: {vllm.__version__}')"
python -c "import torch; print(f'torch: {torch.__version__}, CUDA: {torch.cuda.is_available()}')"
tmux -V
ffmpeg -version 2>&1 | head -1

echo ""
echo "=== Installation complete ==="
echo "Run: bash start.sh"
