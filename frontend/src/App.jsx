import { useState, useRef, useCallback, useEffect } from "react";
import { Room, RoomEvent } from "livekit-client";
import "./App.css";

const API_URL = "http://localhost:8021";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("Click Start to begin");
  const [transcripts, setTranscripts] = useState([]);
  const roomRef = useRef(null);
  const userIdRef = useRef(null);
  const scrollRef = useRef(null);

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

      room.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
        if (topic !== "transcription") return;
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));
          if (msg.type === "transcript") {
            setTranscripts((prev) => [
              ...prev,
              { text: msg.text, time: new Date().toLocaleTimeString() },
            ]);
            setStatus("Ready — start speaking");
          } else if (msg.type === "status") {
            setStatus(msg.text);
          } else if (msg.type === "error") {
            setStatus(`Error: ${msg.text}`);
          }
        } catch {
          // ignore parse errors
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setStatus("Disconnected");
      });

      await room.connect(data.livekitUrl, data.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      setConnected(true);
      setConnecting(false);
      setStatus("Connected — speak now");
    } catch (err) {
      setStatus(`Connection failed: ${err.message}`);
      setConnecting(false);
    }
  }, []);

  const handleStop = useCallback(async () => {
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
    setStatus("Stopped");
  }, []);

  const handleClear = useCallback(() => {
    setTranscripts([]);
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Qwen3-ASR</h1>
        <p className="subtitle">Live Transcription via WebRTC + vLLM</p>
      </header>

      <div className="controls">
        {!connected ? (
          <button
            onClick={handleStart}
            disabled={connecting}
            className="btn start"
          >
            {connecting ? "Connecting..." : "Start"}
          </button>
        ) : (
          <button onClick={handleStop} className="btn stop">
            Stop
          </button>
        )}
        <button
          onClick={handleClear}
          className="btn clear"
          disabled={transcripts.length === 0}
        >
          Clear
        </button>
      </div>

      <div className="status-bar">
        <span className={`dot ${connected ? "green" : ""}`} />
        <span>{status}</span>
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
  );
}
