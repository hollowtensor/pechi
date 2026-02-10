import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import type { AppState } from '../types';

interface Props {
  state: AppState;
}

interface Dot {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  size: number;
  color: string;
}

const DOT_COUNT = 18;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const STATE_OPACITY: Record<AppState, number> = {
  idle: 0.1,
  connected: 0.2,
  listening: 0.35,
  transcribing: 0.45,
  thinking: 0.25,
  result: 0.5,
};

const STATE_SCALE: Record<AppState, number> = {
  idle: 1,
  connected: 1,
  listening: 1.2,
  transcribing: 0.9,
  thinking: 0.85,
  result: 1.5,
};

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export const AnimatedBackground = React.memo(function AnimatedBackground({ state }: Props) {
  const dots = useMemo<Dot[]>(() => {
    return Array.from({ length: DOT_COUNT }, () => ({
      x: new Animated.Value(randomInRange(0, SCREEN_W)),
      y: new Animated.Value(randomInRange(0, SCREEN_H)),
      opacity: new Animated.Value(0.1),
      scale: new Animated.Value(1),
      size: randomInRange(3, 8),
      color: Math.random() < 0.7 ? '#c9463d' : '#f0ebe3',
    }));
  }, []);

  const driftAnimsRef = useRef<Animated.CompositeAnimation[]>([]);

  // Start drift loops on mount
  useEffect(() => {
    const anims = dots.map((dot) => {
      const makeDrift = (val: Animated.Value, max: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: randomInRange(0, max),
              duration: randomInRange(8000, 14000),
              useNativeDriver: true,
            }),
            Animated.timing(val, {
              toValue: randomInRange(0, max),
              duration: randomInRange(8000, 14000),
              useNativeDriver: true,
            }),
          ]),
        );

      const driftX = makeDrift(dot.x, SCREEN_W);
      const driftY = makeDrift(dot.y, SCREEN_H);
      driftX.start();
      driftY.start();
      return Animated.parallel([driftX, driftY]);
    });
    driftAnimsRef.current = anims;

    return () => {
      anims.forEach((a) => a.stop());
    };
  }, [dots]);

  // React to state changes
  useEffect(() => {
    const targetOpacity = STATE_OPACITY[state];
    const targetScale = STATE_SCALE[state];

    Animated.parallel(
      dots.flatMap((dot) => [
        Animated.timing(dot.opacity, {
          toValue: targetOpacity + randomInRange(-0.05, 0.05),
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(dot.scale, {
          toValue: targetScale,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [state, dots]);

  return (
    <View style={styles.container} pointerEvents="none">
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
              backgroundColor: dot.color,
              opacity: dot.opacity,
              transform: [
                { translateX: dot.x },
                { translateY: dot.y },
                { scale: dot.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
  },
});
