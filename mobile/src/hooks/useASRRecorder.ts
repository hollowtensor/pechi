import { useRef, useState, useCallback } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { loginApi, logoutApi, resolveUrl } from '../services/api';

/**
 * Lightweight LiveKit connection for transcribe-only ASR.
 * Connects to backend in "transcribe_only" mode — no LLM agent, just speech-to-text.
 */
export function useASRRecorder(language: 'en' | 'hi' = 'en') {
  const roomRef = useRef<Room | null>(null);
  const userIdRef = useRef<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');

  const startRecording = useCallback(async () => {
    setConnecting(true);
    try {
      const data = await loginApi(language, 'transcribe_only');
      if (!data.success) {
        setConnecting(false);
        return;
      }

      userIdRef.current = data.userId;
      const room = new Room();
      roomRef.current = room;

      room.on(
        RoomEvent.DataReceived,
        (
          payload: Uint8Array,
          _participant: unknown,
          _kind: unknown,
          topic: string | undefined,
        ) => {
          if (topic !== 'transcription') return;
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload));
            if (msg.type === 'transcription_result' && msg.text) {
              setTranscribedText((prev) =>
                prev ? `${prev} ${msg.text}` : msg.text,
              );
            }
          } catch {
            // ignore parse errors
          }
        },
      );

      room.on(RoomEvent.Disconnected, () => {
        setRecording(false);
      });

      const livekitUrl = resolveUrl(data.livekitUrl);
      await room.connect(livekitUrl, data.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      setRecording(true);
      setConnecting(false);
    } catch {
      setConnecting(false);
    }
  }, [language]);

  const stopRecording = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (userIdRef.current) {
      try {
        await logoutApi(userIdRef.current);
      } catch {
        // ignore
      }
      userIdRef.current = null;
    }
    setRecording(false);
  }, []);

  return {
    recording,
    connecting,
    transcribedText,
    setTranscribedText,
    startRecording,
    stopRecording,
  };
}
