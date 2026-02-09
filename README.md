# Pechi

Real-time speech-to-text using Qwen3-ASR on a remote GPU (RunPod) with a local
LiveKit WebRTC frontend.

*Named after the red-billed hornbill, called "pechi" in Arunachal Pradesh.*

## Architecture

```
Browser (localhost:5173)
    |
    v  WebRTC (mic audio)
LiveKit Server (local Docker, port 7880)
    |
    v  LiveKit SDK
ASR Agent (local Python, port 8021)
    |  - Receives 48kHz audio from LiveKit
    |  - VAD detects speech segments
    |  - Resamples to 16kHz WAV
    |
    v  HTTPS POST /v1/audio/transcriptions
vLLM on RunPod (remote GPU, port 8000)
    |  - Qwen3-ASR-1.7B model
    |
    v  JSON response
ASR Agent
    |  - Sends transcription text via LiveKit data channel
    v
Browser (displays text)
```

## File Structure

```
qwen_asr/
  asr_agent.py            # LiveKit bot + FastAPI server (local)
  docker-compose.yml      # LiveKit + Redis containers (local)
  livekit.yaml            # LiveKit server config
  frontend/               # React Vite app
    src/App.jsx            # Main UI component
    src/App.css
    ...
  runpod/
    install.sh             # Install vLLM + deps on GPU server
    start.sh               # Start vLLM in tmux
    stop.sh                # Stop vLLM
```

## Prerequisites

**Local (macOS/Linux):**
- Docker Desktop
- Python 3.11+ with venv
- Node.js 18+

**Remote (RunPod / GPU server):**
- CUDA GPU (tested: RTX 4090, 24GB VRAM)
- SSH access

## Setup

### 1. RunPod — Install and start vLLM

```bash
# SSH into RunPod
ssh root@<IP> -p <PORT> -i ~/.ssh/id_ed25519

# Copy and run install script (first time only)
bash install.sh

# Start vLLM in tmux
bash start.sh
```

This starts `vllm serve Qwen/Qwen3-ASR-1.7B` in a tmux session.
The model takes ~30s to load. The script waits and confirms when ready.

The API is available at:
- Local (on RunPod): `http://localhost:8000/v1/audio/transcriptions`
- Public (via RunPod proxy): `https://<pod-id>-8000.proxy.runpod.net/v1/audio/transcriptions`

### 2. Local — Update the vLLM URL

Edit `asr_agent.py` line 34:
```python
VLLM_URL = "https://<your-pod-id>-8000.proxy.runpod.net"
```

### 3. Local — Start Docker (LiveKit + Redis)

```bash
cd qwen_asr
docker compose up -d
```

### 4. Local — Start the ASR agent

```bash
cd qwen_asr
../.venv/bin/python asr_agent.py
```

Or if you have a project-level venv:
```bash
python asr_agent.py
```

The agent runs on port 8021.

### 5. Local — Start the frontend

```bash
cd qwen_asr/frontend
npm install    # first time only
npm run dev
```

### 6. Open browser

Go to **http://localhost:5173**, click **Start**, allow mic access, and speak.

## RunPod Management

```bash
# SSH into RunPod
ssh root@<IP> -p <PORT> -i ~/.ssh/id_ed25519

# View vLLM logs
tmux attach -t vllm

# Detach from tmux (keep running)
# Press: Ctrl+B, then D

# Stop vLLM
bash stop.sh

# Start with different model
bash start.sh -m Qwen/Qwen3-ASR-0.6B
```

## Stopping

```bash
# Local: stop agent (Ctrl+C or)
pkill -f asr_agent.py

# Local: stop frontend (Ctrl+C or)
pkill -f "vite"

# Local: stop Docker
cd qwen_asr && docker compose down

# RunPod: stop vLLM
ssh root@<IP> -p <PORT> -i ~/.ssh/id_ed25519 "bash stop.sh"
```

## API Reference

### ASR Agent (local, port 8021)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/login` | POST | Start session, get LiveKit token |
| `/api/logout` | POST | End session |

### vLLM (RunPod, port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/models` | GET | List models |
| `/v1/audio/transcriptions` | POST | Transcribe audio file (OpenAI-compatible) |
| `/v1/chat/completions` | POST | Chat with audio input |

#### Transcription API (used by agent)

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8000/v1", api_key="EMPTY")

transcription = client.audio.transcriptions.create(
    model="Qwen/Qwen3-ASR-1.7B",
    file=audio_bytes,
)
print(transcription.text)
```

#### Chat Completions with audio URL

```python
response = client.chat.completions.create(
    model="Qwen/Qwen3-ASR-1.7B",
    messages=[{
        "role": "user",
        "content": [{
            "type": "audio_url",
            "audio_url": {"url": "https://example.com/audio.wav"}
        }]
    }]
)
print(response.choices[0].message.content)
```

#### cURL

```bash
curl http://localhost:8000/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": [
        {"type": "audio_url", "audio_url": {"url": "https://example.com/audio.wav"}}
    ]}]}'
```

Ref: https://docs.vllm.ai/projects/recipes/en/latest/Qwen/Qwen3-ASR.html

### LiveKit Data Channel

The bot sends JSON messages on topic `transcription`:

| Type | Description |
|------|-------------|
| `transcript` | Final transcription text |
| `status` | Status updates ("Listening...", "Transcribing...") |
| `error` | Error messages |

## Configuration

Key parameters in `asr_agent.py`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `VLLM_URL` | RunPod proxy URL | vLLM endpoint |
| `VAD_ENERGY_THRESHOLD` | 300 | RMS threshold for speech detection |
| `VAD_SILENCE_DURATION` | 0.8s | Silence before triggering transcription |
| `VAD_MIN_SPEECH_DURATION` | 0.3s | Minimum speech to avoid noise triggers |

## Troubleshooting

**"Connection failed" in browser**
- Check agent is running: `curl http://localhost:8021/health`
- Check Docker: `docker ps` (LiveKit + Redis should be running)

**No transcription appears**
- Check vLLM is reachable: `curl https://<pod-id>-8000.proxy.runpod.net/v1/models`
- Check agent logs for errors
- Speak louder / closer to mic (VAD threshold is 300 RMS)

**Slow transcription**
- RunPod proxy adds some latency (~200-500ms)
- Longer audio segments take more time to process
- Consider using the smaller model: `Qwen/Qwen3-ASR-0.6B`

**LiveKit connection issues**
- Verify `livekit.yaml` has `node_ip: "127.0.0.1"`
- Restart Docker: `docker compose down && docker compose up -d`
