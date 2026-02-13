#!/usr/bin/env bash
# ------------------------------------------------------------------
# Qwen3-TTS Dual Mode Installation Script
# Installs qwen-tts, flash-attention, and system deps.
# Loads both Base (voice clone) and CustomVoice (emotion) models.
# Tested on: RunPod (Ubuntu 22.04, Python 3.11, CUDA 12.8, RTX 4090)
# ------------------------------------------------------------------
set -euo pipefail

echo "=== Qwen3-TTS Dual Mode Installation ==="

# 1. System dependencies
echo "[1/5] Installing system packages..."
apt-get update -qq
apt-get install -y -qq sox libsox-dev ffmpeg tmux

# 2. Install qwen-tts + server deps
echo "[2/5] Installing qwen-tts..."
pip install -U qwen-tts soundfile fastapi uvicorn

# 3. Install flash-attention for faster inference
echo "[3/5] Installing flash-attention..."
pip install -U flash-attn --no-build-isolation

# 4. Copy server files
echo "[4/5] Setting up server files..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p /root/tts-server
cp "$SCRIPT_DIR/tts_server.py" /root/tts-server/
cp "$SCRIPT_DIR/pechi-voice-ref.wav" /root/tts-server/ 2>/dev/null || echo "WARNING: pechi-voice-ref.wav not found in $SCRIPT_DIR, copy it manually"

# 5. Pre-download both models
echo "[5/5] Pre-downloading models..."
python -c "
from huggingface_hub import snapshot_download
print('Downloading Base model...')
snapshot_download('Qwen/Qwen3-TTS-12Hz-0.6B-Base')
print('Downloading CustomVoice model...')
snapshot_download('Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice')
print('Downloading Tokenizer...')
snapshot_download('Qwen/Qwen3-TTS-Tokenizer-12Hz')
print('Done.')
"

# Verify
echo ""
echo "=== Verifying installation ==="
python -c "from qwen_tts import Qwen3TTSModel; print('qwen-tts: OK')"
python -c "import torch; print(f'torch: {torch.__version__}, CUDA: {torch.cuda.is_available()}')"
python -c "import flash_attn; print(f'flash-attn: {flash_attn.__version__}')"

echo ""
echo "=== Installation complete ==="
echo "Run: bash start.sh"
