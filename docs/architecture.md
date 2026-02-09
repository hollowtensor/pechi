# Pechi — Architecture

## System Overview

Pechi is a real-time speech-to-text system that splits compute across two
machines: a local Mac (or Linux) handles WebRTC media transport and audio
processing, while a remote GPU server runs the Qwen3-ASR model via vLLM.

```
┌─────────────────────────────────────────────────────────┐
│  LOCAL MACHINE (macOS / Linux)                          │
│                                                         │
│  ┌──────────┐  WebRTC   ┌────────────┐                 │
│  │ Browser  │◄─────────►│  LiveKit    │                 │
│  │ React UI │  (audio)  │  Server    │                 │
│  │ :5173    │           │  :7880     │                 │
│  └──────────┘           └─────┬──────┘                 │
│                               │ LiveKit SDK             │
│                         ┌─────▼──────┐                 │
│                         │ ASR Agent  │                 │
│                         │ (Python)   │                 │
│                         │ :8021      │                 │
│                         └─────┬──────┘                 │
│                               │                         │
└───────────────────────────────┼─────────────────────────┘
                                │ HTTPS POST
                                │ /v1/audio/transcriptions
┌───────────────────────────────┼─────────────────────────┐
│  REMOTE GPU (RunPod)          │                         │
│                         ┌─────▼──────┐                 │
│                         │   vLLM     │                 │
│                         │ Qwen3-ASR  │                 │
│                         │ :8000      │                 │
│                         └────────────┘                 │
│                                                         │
│  GPU: RTX 4090 (24GB VRAM)                             │
│  Access: RunPod proxy HTTPS                             │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. Browser Frontend (React + Vite)

**Port:** 5173 (dev server)

The frontend is a single-page React app. On "Start":

1. POSTs to `/api/login` on the ASR agent
2. Receives a LiveKit token and room name
3. Connects to LiveKit via `livekit-client` SDK
4. Publishes the microphone as an audio track
5. Listens for `DataReceived` events on topic `transcription`
6. Renders transcription text with timestamps

The browser does **no** audio processing — LiveKit handles all WebRTC
negotiation, codec selection (Opus), and transport.

### 2. LiveKit Server (Docker)

**Port:** 7880 (signaling), 7881 (WebRTC TCP), 7882 (TURN UDP)

LiveKit is an open-source WebRTC SFU (Selective Forwarding Unit). It runs
in Docker alongside Redis (used by LiveKit for state).

Responsibilities:
- WebRTC signaling and session management
- Audio/video track routing between participants
- TURN relay for NAT traversal (configured for localhost)
- Room management (create, join, leave)

Configuration is in `livekit.yaml`. Key settings for local dev:
- `node_ip: "127.0.0.1"` — no external IP discovery
- `use_external_ip: false`
- UDP range `50200-50300` — avoids macOS port conflicts

### 3. ASR Agent (Python + FastAPI)

**Port:** 8021

The core orchestrator. It has two roles:

**HTTP API (FastAPI):**
- `POST /api/login` — creates a LiveKit room, spawns an ASR bot, returns
  a token for the browser to join
- `POST /api/logout` — stops the bot, cleans up
- `GET /health` — status check

**LiveKit Bot (ASRBot class):**
- Joins the LiveKit room as a participant
- Subscribes to the user's audio track
- Runs VAD on incoming audio frames
- On speech end: resamples, encodes WAV, sends to vLLM
- Sends transcription text back via LiveKit data channel

### 4. vLLM + Qwen3-ASR (RunPod)

**Port:** 8000 (exposed via RunPod proxy as HTTPS)

vLLM serves the Qwen3-ASR-1.7B model with an OpenAI-compatible API. The
agent calls `/v1/audio/transcriptions` with WAV audio files and receives
JSON with the transcribed text.

---

## Data Flow

### Session Establishment

```
Browser                Agent (:8021)        LiveKit (:7880)
   │                      │                      │
   │  POST /api/login     │                      │
   │─────────────────────►│                      │
   │                      │  Create room + token │
   │                      │─────────────────────►│
   │                      │                      │
   │                      │  Bot joins room      │
   │                      │─────────────────────►│
   │                      │                      │
   │  { token, room }     │                      │
   │◄─────────────────────│                      │
   │                      │                      │
   │  WebRTC connect      │                      │
   │─────────────────────────────────────────────►│
   │                      │                      │
   │  Publish mic track   │                      │
   │─────────────────────────────────────────────►│
   │                      │                      │
   │                      │  Subscribe to audio  │
   │                      │◄─────────────────────│
```

### Audio Transcription

```
Browser          LiveKit         Agent              vLLM (RunPod)
   │                │               │                    │
   │  Audio frames  │               │                    │
   │  (Opus/48kHz)  │               │                    │
   │───────────────►│               │                    │
   │                │  PCM frames   │                    │
   │                │  (48kHz)      │                    │
   │                │──────────────►│                    │
   │                │               │                    │
   │                │               │  VAD: accumulate   │
   │                │               │  speech frames     │
   │                │               │                    │
   │                │               │  Speech ended!     │
   │                │               │  Resample 48→16kHz │
   │                │               │  Encode WAV        │
   │                │               │                    │
   │                │               │  POST /v1/audio/   │
   │                │               │  transcriptions    │
   │                │               │───────────────────►│
   │                │               │                    │
   │                │               │  { "text": "..." } │
   │                │               │◄───────────────────│
   │                │               │                    │
   │                │  Data channel │                    │
   │                │  (transcript) │                    │
   │  Data event    │◄──────────────│                    │
   │◄───────────────│               │                    │
   │                │               │                    │
   │  Display text  │               │                    │
```

---

## Audio Pipeline Detail

### Capture → Transcription

```
Mic (browser)
  │  Hardware sample rate (typically 48kHz)
  ▼
WebRTC / Opus codec
  │  Encoded, transported via LiveKit
  ▼
LiveKit → Agent (PCM int16, 48kHz, mono)
  │  AudioStream provides frames
  ▼
VAD (energy-based)
  │  Accumulates frames in buffer
  │  Computes RMS on last 100ms (4800 samples)
  │  Speech start:  RMS > 300
  │  Speech end:    RMS < 300 for 0.8s, after 0.3s+ speech
  ▼
Resample (scipy.signal.resample_poly)
  │  48kHz → 16kHz (factor 1/3)
  ▼
Encode WAV (soundfile)
  │  float32 normalized, 16kHz, mono
  ▼
HTTP POST to vLLM
  │  multipart/form-data: file=audio.wav
  ▼
Qwen3-ASR-1.7B (GPU inference)
  │  Audio encoder → LLM → text
  ▼
JSON response: { "text": "..." }
```

### VAD State Machine

```
          RMS > 300
  IDLE ─────────────► SPEECH
   ▲                    │
   │                    │ RMS < 300
   │                    ▼
   │               SILENCE_TIMER
   │                    │
   │  RMS > 300         │ 0.8s elapsed
   │  (reset timer)     │ AND speech > 0.3s
   │◄───────────────    │
   │                    ▼
   │               TRANSCRIBE
   │                    │
   │  buffer cleared    │
   │◄───────────────────│
```

### Sample Rates

| Stage | Sample Rate | Format |
|-------|-------------|--------|
| Browser mic | Hardware (usually 48kHz) | Float32 |
| WebRTC transport | 48kHz (Opus encoded) | Opus packets |
| Agent receives | 48kHz | int16 PCM |
| Agent resamples | 16kHz | int16 PCM |
| WAV encoding | 16kHz | float32 WAV |
| vLLM input | 16kHz | WAV file |

---

## Network Topology

### Why Local LiveKit + Remote GPU?

| Approach | Pros | Cons |
|----------|------|------|
| Everything remote | Single machine | RunPod lacks UDP forwarding for WebRTC |
| Everything local | No network latency | No GPU for ASR model |
| **Local LiveKit + Remote GPU** | WebRTC works on localhost, GPU via HTTP | Slight latency on transcription POST |

The hybrid approach works because:
- **WebRTC needs UDP** — LiveKit on localhost has zero NAT/firewall issues
- **vLLM only needs HTTP** — RunPod proxy handles HTTPS to port 8000
- **Transcription is not real-time streaming** — batch POST per utterance is fine (~200-500ms round trip)

### Ports

| Port | Service | Protocol | Location |
|------|---------|----------|----------|
| 5173 | Vite dev server | HTTP | Local |
| 7880 | LiveKit signaling | WebSocket | Local (Docker) |
| 7881 | LiveKit WebRTC | TCP | Local (Docker) |
| 7882 | LiveKit TURN | UDP | Local (Docker) |
| 8000 | vLLM API | HTTPS (proxy) | RunPod |
| 8021 | ASR Agent API | HTTP | Local |
| 6379 | Redis | TCP | Local (Docker) |
| 50200-50300 | LiveKit media | UDP | Local (Docker) |

---

## Security Notes

- LiveKit uses dev credentials (`devkey`/`secret`) — not for production
- vLLM endpoint is public via RunPod proxy (no auth) — use API keys in production
- CORS is fully open (`allow_origins=["*"]`) — restrict in production
- All local traffic is unencrypted HTTP/WS — fine for localhost

---

## Future: Two-Way Audio

The current architecture is one-way (speech → text). To add TTS responses:

```
Agent receives transcription text
  │
  ▼
POST to TTS API (e.g., another vLLM model, or external TTS)
  │
  ▼
Receive audio bytes
  │
  ▼
Resample to 48kHz, push via rtc.AudioSource
  │
  ▼
LiveKit → Browser speaker
```

The ASR agent already has the LiveKit publishing infrastructure (`can_publish=True`).
Adding `rtc.AudioSource` and `rtc.LocalAudioTrack` (same pattern as `native_backend.py`)
would enable the bot to speak back.
