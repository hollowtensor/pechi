import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, borderRadius, spacing } from '../constants/theme';

interface Props {
  language: 'en' | 'hi';
  onSelect: (lang: 'en' | 'hi') => void;
  disabled: boolean;
}

export function LanguageToggle({ language, onSelect, disabled }: Props) {
  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <TouchableOpacity
        style={[styles.segment, language === 'en' && styles.segmentActive]}
        onPress={() => onSelect('en')}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.label, language === 'en' && styles.labelActive]}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.segment, language === 'hi' && styles.segmentActive]}
        onPress={() => onSelect('hi')}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.label, language === 'hi' && styles.labelActive]}>HI</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 235, 227, 0.04)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.08)',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.4,
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accentSurface,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  labelActive: {
    color: colors.accent,
  },
});
