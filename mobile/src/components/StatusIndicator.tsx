import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';

interface Props {
  connected: boolean;
  status: string;
}

export function StatusIndicator({ connected, status }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (connected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.6,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [connected, pulseAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.dotWrap}>
        {connected && (
          <Animated.View
            style={[
              styles.dotGlow,
              { transform: [{ scale: pulseAnim }], opacity: 0.3 },
            ]}
          />
        )}
        <View style={[styles.dot, connected && styles.dotActive]} />
      </View>
      <Text style={styles.text} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  dotWrap: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(240, 235, 227, 0.2)',
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  dotGlow: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  text: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
