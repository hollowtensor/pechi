import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LanguageToggle } from './LanguageToggle';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing } from '../constants/theme';

interface Props {
  connected: boolean;
  connecting: boolean;
  messageCount: number;
  language: 'en' | 'hi';
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  onLanguageChange: (lang: 'en' | 'hi') => void;
}

export function ControlBar({
  connected,
  connecting,
  messageCount,
  language,
  onStart,
  onStop,
  onClear,
  onLanguageChange,
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {!connected ? (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.accent }]}
          onPress={onStart}
          disabled={connecting}
          activeOpacity={0.7}
        >
          <Text style={[styles.btnText, { color: colors.text }]}>
            {connecting ? 'Connecting...' : 'Start'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }]}
          onPress={onStop}
          activeOpacity={0.7}
        >
          <Text style={[styles.btnText, { color: colors.textSecondary }]}>Stop</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.btn,
          { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder },
          messageCount === 0 && styles.btnDisabled,
        ]}
        onPress={onClear}
        disabled={messageCount === 0}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnText, { color: colors.textMuted }]}>Clear</Text>
      </TouchableOpacity>

      <View style={styles.spacer} />

      <LanguageToggle
        language={language}
        onSelect={onLanguageChange}
        disabled={connected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  btn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  spacer: {
    flex: 1,
  },
});
