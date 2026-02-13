import { useRef, useCallback } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { loginApi, logoutApi, resolveUrl } from '../services/api';
import type { JobCard, AppState } from '../types';

interface UseLiveKitParams {
  language: 'en' | 'hi';
  setConnected: (v: boolean) => void;
  setConnecting: (v: boolean) => void;
  setStatus: (v: string) => void;
  setAppState: (v: AppState) => void;
  setMicActive: (v: boolean) => void;
  handleDataMessage: (msg: unknown) => void;
  resultTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
}

export function useLiveKit({
  language,
  setConnected,
  setConnecting,
  setStatus,
  setAppState,
  setMicActive,
  handleDataMessage,
  resultTimerRef,
}: UseLiveKitParams) {
  const roomRef = useRef<Room | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Connect to LiveKit room (no mic yet)
  const connect = useCallback(async () => {
    if (roomRef.current) return; // already connected
    setConnecting(true);
    setStatus('Connecting...');
    try {
      const data = await loginApi(language);
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
        (
          payload: Uint8Array,
          _participant: unknown,
          _kind: unknown,
          topic: string | undefined,
        ) => {
          if (topic !== 'transcription') return;
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload));
            handleDataMessage(msg);
          } catch {
            // ignore parse errors
          }
        },
      );

      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setMicActive(false);
        setAppState('idle');
        setStatus('Disconnected');
      });

      const livekitUrl = resolveUrl(data.livekitUrl);
      await room.connect(livekitUrl, data.token);

      setConnected(true);
      setConnecting(false);
      setAppState('connected');
      setStatus('Ready');
    } catch (err) {
      setStatus(`Connection failed: ${(err as Error).message}`);
      setConnecting(false);
      setAppState('idle');
    }
  }, [language, setConnected, setConnecting, setStatus, setAppState, setMicActive, handleDataMessage]);

  // Toggle microphone on/off
  const toggleMic = useCallback(async () => {
    if (!roomRef.current) return;
    const participant = roomRef.current.localParticipant;
    const micOn = participant.isMicrophoneEnabled;
    await participant.setMicrophoneEnabled(!micOn);
    setMicActive(!micOn);
    if (!micOn) {
      setAppState('connected');
      setStatus('Speak now');
    } else {
      setAppState('connected');
      setStatus('Ready');
    }
  }, [setMicActive, setAppState, setStatus]);

  // Full disconnect + cleanup
  const disconnect = useCallback(async () => {
    clearTimeout(resultTimerRef.current);
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
    setConnected(false);
    setMicActive(false);
    setAppState('idle');
    setStatus('Disconnected');
  }, [setConnected, setMicActive, setAppState, setStatus, resultTimerRef]);

  const publishJobCard = useCallback((jobCard: JobCard) => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: 'confirm_job_card', data: jobCard }),
      ),
      { reliable: true, topic: 'user_action' },
    );
  }, []);

  const publishTextMessage = useCallback((text: string) => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: 'user_text', text }),
      ),
      { reliable: true, topic: 'user_action' },
    );
  }, []);

  const publishImageFeedback = useCallback((mediaId: number) => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: 'set_image_feedback', mediaId }),
      ),
      { reliable: true, topic: 'user_action' },
    );
  }, []);

  const clearImageFeedback = useCallback(() => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: 'clear_image_feedback' }),
      ),
      { reliable: true, topic: 'user_action' },
    );
  }, []);

  const publishImageContext = useCallback((mediaId: number, analysis: string, tags: string[]) => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: 'image_context', mediaId, analysis, tags }),
      ),
      { reliable: true, topic: 'user_action' },
    );
  }, []);

  return { connect, disconnect, toggleMic, publishJobCard, publishTextMessage, publishImageFeedback, clearImageFeedback, publishImageContext };
}
