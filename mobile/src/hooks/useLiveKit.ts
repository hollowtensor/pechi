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
  handleDataMessage: (msg: unknown) => void;
  resultTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
}

export function useLiveKit({
  language,
  setConnected,
  setConnecting,
  setStatus,
  setAppState,
  handleDataMessage,
  resultTimerRef,
}: UseLiveKitParams) {
  const roomRef = useRef<Room | null>(null);
  const userIdRef = useRef<string | null>(null);

  const connect = useCallback(async () => {
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
        setAppState('idle');
        setStatus('Disconnected');
      });

      const livekitUrl = resolveUrl(data.livekitUrl);
      await room.connect(livekitUrl, data.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      setConnected(true);
      setConnecting(false);
      setAppState('connected');
      setStatus('Speak now');
    } catch (err) {
      setStatus(`Connection failed: ${(err as Error).message}`);
      setConnecting(false);
      setAppState('idle');
    }
  }, [language, setConnected, setConnecting, setStatus, setAppState, handleDataMessage]);

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
    setAppState('idle');
    setStatus('Stopped');
  }, [setConnected, setAppState, setStatus, resultTimerRef]);

  const publishJobCard = useCallback((jobCard: JobCard) => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: 'confirm_job_card', data: jobCard }),
      ),
      { reliable: true, topic: 'user_action' },
    );
  }, []);

  return { connect, disconnect, publishJobCard };
}
