import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';

export function ThemeToggle() {
  const { mode, colors, toggleTheme } = useTheme();
  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{mode === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
  },
});
