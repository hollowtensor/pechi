import { useState, useRef, useCallback, useEffect } from "react";
import { Room, RoomEvent } from "livekit-client";
import { ParticleBackground } from "./components/ParticleBackground";
import type { AppState, TranscriptEntry } from "./types";
import "./App.css";

const API_URL = "http://localhost:8021";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [appState, setAppState] = useState<AppState>("idle");
  const roomRef = useRef<Room | null>(null);
  const userIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const handleStart = useCallback(async () => {
    setConnecting(true);
    setStatus("Connecting...");
    try {
      const resp = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user" }),
      });
      const data = await resp.json();
      if (!data.success) {
        setStatus(`Error: ${data.message}`);
        setConnecting(false);
        return;
      }

      userIdRef.current = data.userId;
      const room = new Room();
      roomRef.current = room;

      room.on(
        RoomEvent.DataReceived,
        (payload: Uint8Array, _participant: unknown, _kind: unknown, topic: string | undefined) => {
          if (topic !== "transcription") return;
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload));
            if (msg.type === "transcript") {
              setTranscripts((prev) => [
                ...prev,
                { text: msg.text, time: new Date().toLocaleTimeString() },
              ]);
              // Burst animation, then return to connected
              setAppState("result");
              clearTimeout(resultTimerRef.current);
              resultTimerRef.current = setTimeout(() => setAppState("connected"), 1500);
            } else if (msg.type === "status") {
              setStatus(msg.text);
              // Map bot status messages to app states
              if (msg.text.includes("Listening")) {
                setAppState("listening");
              } else if (msg.text.includes("Transcribing")) {
                setAppState("transcribing");
              } else if (msg.text.includes("Ready") || msg.text.includes("speaking")) {
                setAppState("connected");
              }
            } else if (msg.type === "error") {
              setStatus(`Error: ${msg.text}`);
            }
          } catch {
            // ignore parse errors
          }
        },
      );

      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setAppState("idle");
        setStatus("Disconnected");
      });

      await room.connect(data.livekitUrl, data.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      setConnected(true);
      setConnecting(false);
      setAppState("connected");
      setStatus("Speak now");
    } catch (err) {
      setStatus(`Connection failed: ${(err as Error).message}`);
      setConnecting(false);
      setAppState("idle");
    }
  }, []);

  const handleStop = useCallback(async () => {
    clearTimeout(resultTimerRef.current);
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (userIdRef.current) {
      try {
        await fetch(`${API_URL}/api/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userIdRef.current }),
        });
      } catch {
        // ignore
      }
      userIdRef.current = null;
    }
    setConnected(false);
    setAppState("idle");
    setStatus("Stopped");
  }, []);

  const handleClear = useCallback(() => {
    setTranscripts([]);
  }, []);

  return (
    <>
      <ParticleBackground state={appState} />

      <div className="app">
        <header>
          <h1 className="title">Pechi</h1>
          <p className="tagline">Live transcription powered by Qwen3-ASR</p>
        </header>

        <div className="glass-panel">
          <div className="controls">
            {!connected ? (
              <button
                onClick={handleStart}
                disabled={connecting}
                className="btn btn-start"
              >
                {connecting ? "Connecting..." : "Start"}
              </button>
            ) : (
              <button onClick={handleStop} className="btn btn-stop">
                Stop
              </button>
            )}
            <button
              onClick={handleClear}
              className="btn btn-clear"
              disabled={transcripts.length === 0}
            >
              Clear
            </button>
          </div>

          <div className="status-bar">
            <span className={`dot ${connected ? "active" : ""}`} />
            <span className="status-text">{status}</span>
          </div>

          <div className="transcript-container" ref={scrollRef}>
            {transcripts.length === 0 ? (
              <p className="placeholder">Transcriptions will appear here...</p>
            ) : (
              transcripts.map((t, i) => (
                <div key={i} className="transcript-line">
                  <span className="time">{t.time}</span>
                  <span className="text">{t.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
