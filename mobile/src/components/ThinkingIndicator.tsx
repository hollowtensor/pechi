import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius } from '../constants/theme';

export function ThinkingIndicator() {
  const { colors } = useTheme();
  const dots = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay((2 - index) * 160),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.agentBubble,
            borderColor: colors.agentBubbleBorder,
          },
        ]}
      >
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: colors.textSecondary,
                opacity: dot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
                transform: [
                  {
                    translateY: dot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -6],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  bubble: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
