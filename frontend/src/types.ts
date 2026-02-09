export type AppState = "idle" | "connected" | "listening" | "transcribing" | "thinking" | "result";

export type MessageRole = "user" | "agent";

export interface ChatMessage {
  role: MessageRole;
  text: string;
  time: string;
}
