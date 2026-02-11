import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius } from '../constants/theme';

interface Props {
  onClear: () => void;
  disabled: boolean;
}

export function ClearButton({ onClear, disabled }: Props) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onClear}
      disabled={disabled}
      style={[
        styles.btn,
        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        disabled && styles.disabled,
      ]}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: colors.textMuted }]}>Clear</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
