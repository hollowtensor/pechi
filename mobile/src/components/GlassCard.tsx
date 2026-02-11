import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassCard({ children, style }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});
