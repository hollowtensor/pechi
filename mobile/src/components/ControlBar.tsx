import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LanguageToggle } from './LanguageToggle';
import { colors, borderRadius, spacing } from '../constants/theme';

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
  return (
    <View style={styles.container}>
      {!connected ? (
        <TouchableOpacity
          style={[styles.btn, styles.btnStart]}
          onPress={onStart}
          disabled={connecting}
          activeOpacity={0.7}
        >
          <Text style={styles.btnStartText}>
            {connecting ? 'Connecting...' : 'Start'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.btn, styles.btnStop]}
          onPress={onStop}
          activeOpacity={0.7}
        >
          <Text style={styles.btnStopText}>Stop</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.btn, styles.btnClear, messageCount === 0 && styles.btnDisabled]}
        onPress={onClear}
        disabled={messageCount === 0}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnClearText, messageCount === 0 && styles.btnTextDisabled]}>
          Clear
        </Text>
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
  btnStart: {
    backgroundColor: colors.accent,
  },
  btnStartText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  btnStop: {
    backgroundColor: 'rgba(240, 235, 227, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.1)',
  },
  btnStopText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  btnClear: {
    backgroundColor: 'rgba(240, 235, 227, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.06)',
  },
  btnClearText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnTextDisabled: {
    color: colors.textMuted,
  },
  spacer: {
    flex: 1,
  },
});
