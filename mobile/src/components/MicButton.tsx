import React, { useEffect, useRef, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import LottieView from 'lottie-react-native';
import type { AppState } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';

/* ── Lottie frame segments (24 fps, 306 total frames) ──
 * 0–116   Mic Wake        (idle / connecting)
 * 117–155 Listening        (recording)
 * 156–214 Thinking         (processing)
 * 215–260 Yes response
 * 305     Mic ON (static)
 */
const SEGMENTS = {
  wake:      [0, 116] as [number, number],
  listening: [117, 155] as [number, number],
  thinking:  [156, 214] as [number, number],
  result:    [215, 260] as [number, number],
  micOn:     305,
} as const;

interface Props {
  connected: boolean;
  connecting: boolean;
  micActive: boolean;
  appState: AppState;
  onPress: () => void;
}

export function MicButton({ connected, connecting, micActive, appState, onPress }: Props) {
  const { colors } = useTheme();
  const lottieRef = useRef<LottieView>(null);
  const prevStateRef = useRef<string>('idle');

  const getStateKey = useCallback((): string => {
    if (connecting) return 'connecting';
    if (!connected) return 'idle';
    if (!micActive) return 'idle';
    if (appState === 'listening' || appState === 'transcribing') return 'listening';
    if (appState === 'thinking') return 'thinking';
    if (appState === 'result') return 'result';
    return 'connected';
  }, [connected, connecting, micActive, appState]);

  useEffect(() => {
    const anim = lottieRef.current;
    if (!anim) return;

    const stateKey = getStateKey();
    if (stateKey === prevStateRef.current) return;
    prevStateRef.current = stateKey;

    switch (stateKey) {
      case 'idle':
        anim.reset();
        break;
      case 'connecting':
        anim.play(SEGMENTS.wake[0], SEGMENTS.wake[1]);
        break;
      case 'connected':
        // Jump to mic-on frame
        anim.play(SEGMENTS.micOn, SEGMENTS.micOn);
        break;
      case 'listening':
        anim.play(SEGMENTS.listening[0], SEGMENTS.listening[1]);
        break;
      case 'thinking':
        anim.play(SEGMENTS.thinking[0], SEGMENTS.thinking[1]);
        break;
      case 'result':
        anim.play(SEGMENTS.result[0], SEGMENTS.result[1]);
        break;
    }
  }, [getStateKey]);

  const stateKey = getStateKey();
  const shouldLoop = stateKey === 'connecting' || stateKey === 'listening' || stateKey === 'thinking';

  // Outer ring color for visual feedback
  const ringColor = micActive ? colors.accent : 'transparent';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={connecting || !connected}>
      <View style={styles.container}>
        {/* Subtle accent ring when mic is active */}
        {micActive && (
          <View style={[styles.ring, { borderColor: ringColor }]} />
        )}
        <LottieView
          ref={lottieRef}
          source={require('../../assets/mic_state.json')}
          style={styles.lottie}
          loop={shouldLoop}
          autoPlay={false}
          speed={1}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 88,
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  ring: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
  },
  lottie: {
    width: 80,
    height: 80,
  },
});
