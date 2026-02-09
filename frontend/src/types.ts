export type AppState = "idle" | "connected" | "listening" | "transcribing" | "result";

export interface TranscriptEntry {
  text: string;
  time: string;
}
