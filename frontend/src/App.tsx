import { useState, useRef, useCallback, useEffect } from "react";
import { Room, RoomEvent } from "livekit-client";
import Markdown from "react-markdown";
import { ParticleBackground } from "./components/ParticleBackground";
import { SidePanel } from "./components/SidePanel";
import type { AppState, ChatMessage, JobCard, SidePanelItem } from "./types";
import "./App.css";

const API_URL = "http://localhost:8021";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [appState, setAppState] = useState<AppState>("idle");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [sidePanels, setSidePanels] = useState<SidePanelItem[]>([]);
  const roomRef = useRef<Room | null>(null);
  const userIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // -- Side panel helpers --

  const addSidePanel = useCallback(
    (msg: { panelType: string; title: string; data: unknown; isActionable?: boolean }) => {
      setSidePanels((prev) => {
        const collapsed = prev.map((p) => ({ ...p, isExpanded: false }));
        const newPanel: SidePanelItem = {
          id: `sp-${Date.now()}`,
          panelType: msg.panelType as SidePanelItem["panelType"],
          title: msg.title,
          content: { type: msg.panelType as SidePanelItem["panelType"], data: msg.data } as SidePanelItem["content"],
          isActionable: msg.isActionable || msg.panelType === "job_card",
          isExpanded: true,
        };
        return [...collapsed, newPanel];
      });
    },
    [],
  );

  const handleToggleExpand = useCallback((panelId: string) => {
    setSidePanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, isExpanded: !p.isExpanded } : p)),
    );
  }, []);

  const handleDismissPanel = useCallback((panelId: string) => {
    setSidePanels((prev) => prev.filter((p) => p.id !== panelId));
  }, []);

  const handleConfirmJobCard = useCallback((jobCard: JobCard) => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: "confirm_job_card", data: jobCard }),
      ),
      { reliable: true, topic: "user_action" },
    );
  }, []);

  const handleCancelJobCard = useCallback((panelId: string) => {
    setSidePanels((prev) => prev.filter((p) => p.id !== panelId));
  }, []);

  const handleUpdateJobCard = useCallback((panelId: string, jobCard: JobCard) => {
    setSidePanels((prev) =>
      prev.map((p) =>
        p.id === panelId
          ? { ...p, content: { type: "job_card" as const, data: jobCard } }
          : p,
      ),
    );
  }, []);

  // -- Connection --

  const handleStart = useCallback(async () => {
    setConnecting(true);
    setStatus("Connecting...");
    try {
      const resp = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user", language }),
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
            if (msg.type === "user_message") {
              setMessages((prev) => [
                ...prev,
                { role: "user", text: msg.text, time: new Date().toLocaleTimeString() },
              ]);
              setAppState("transcribing");
            } else if (msg.type === "agent_message") {
              setMessages((prev) => [
                ...prev,
                { role: "agent", text: msg.text, time: new Date().toLocaleTimeString() },
              ]);
              setAppState("result");
              clearTimeout(resultTimerRef.current);
              resultTimerRef.current = setTimeout(() => setAppState("connected"), 1500);
            } else if (msg.type === "thinking") {
              setAppState("thinking");
              setStatus("Thinking...");
            } else if (msg.type === "status") {
              setStatus(msg.text);
              if (msg.text.includes("Listening")) {
                setAppState("listening");
              } else if (msg.text.includes("Transcribing")) {
                setAppState("transcribing");
              } else if (msg.text.includes("Ready") || msg.text.includes("speaking")) {
                setAppState("connected");
              }
            } else if (msg.type === "error") {
              setStatus(`Error: ${msg.text}`);
            } else if (msg.type === "side_panel") {
              addSidePanel(msg);
            } else if (msg.type === "job_card_confirmed") {
              setSidePanels((prev) => prev.filter((p) => p.panelType !== "job_card"));
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
  }, [language, addSidePanel]);

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
    setMessages([]);
    setSidePanels([]);
  }, []);

  return (
    <>
      <ParticleBackground state={appState} />

      <div className="app-layout">
        <div className="app-chat">
          <header>
            <h1 className="title">Pechi</h1>
            <p className="tagline">Maruti Suzuki Service Assistant</p>
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
                disabled={messages.length === 0}
              >
                Clear
              </button>
              <div className="lang-toggle">
                <button
                  className={`lang-btn ${language === "en" ? "lang-active" : ""}`}
                  onClick={() => setLanguage("en")}
                  disabled={connected}
                >
                  EN
                </button>
                <button
                  className={`lang-btn ${language === "hi" ? "lang-active" : ""}`}
                  onClick={() => setLanguage("hi")}
                  disabled={connected}
                >
                  HI
                </button>
              </div>
            </div>

            <div className="status-bar">
              <span className={`dot ${connected ? "active" : ""}`} />
              <span className="status-text">{status}</span>
            </div>

            <div className="chat-container" ref={scrollRef}>
              {messages.length === 0 ? (
                <p className="placeholder">
                  {connected
                    ? "Ask about your vehicle, service history, or parts..."
                    : "Press Start and speak to begin..."}
                </p>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`message message-${m.role}`}>
                    <div className="message-bubble">
                      {m.role === "agent" ? (
                        <div className="message-text">
                          <Markdown>{m.text}</Markdown>
                        </div>
                      ) : (
                        <span className="message-text">{m.text}</span>
                      )}
                      <span className="message-time">{m.time}</span>
                    </div>
                  </div>
                ))
              )}
              {appState === "thinking" && (
                <div className="message message-agent">
                  <div className="message-bubble thinking-bubble">
                    <span className="thinking-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {sidePanels.length > 0 && (
          <div className="app-side">
            <SidePanel
              panels={sidePanels}
              onToggleExpand={handleToggleExpand}
              onDismiss={handleDismissPanel}
              onConfirmJobCard={handleConfirmJobCard}
              onCancelJobCard={handleCancelJobCard}
              onUpdateJobCard={handleUpdateJobCard}
            />
          </div>
        )}
      </div>
    </>
  );
}
