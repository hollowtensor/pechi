import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing } from '../constants/theme';

interface Props {
  language: 'en' | 'hi';
  onSelect: (lang: 'en' | 'hi') => void;
  disabled: boolean;
}

export function LanguageToggle({ language, onSelect, disabled }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
        },
        disabled && styles.disabled,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.segment,
          language === 'en' && { backgroundColor: colors.accentSurface },
        ]}
        onPress={() => onSelect('en')}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.label,
            { color: language === 'en' ? colors.accent : colors.textMuted },
          ]}
        >
          EN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.segment,
          language === 'hi' && { backgroundColor: colors.accentSurface },
        ]}
        onPress={() => onSelect('hi')}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.label,
            { color: language === 'hi' ? colors.accent : colors.textMuted },
          ]}
        >
          HI
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
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
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
