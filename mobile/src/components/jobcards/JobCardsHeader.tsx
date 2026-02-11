import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';

interface Props {
  isAdvisor: boolean;
  onToggleRole: () => void;
}

export function JobCardsHeader({ isAdvisor, onToggleRole }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Job Cards</Text>
      <TouchableOpacity
        style={[
          styles.toggle,
          {
            backgroundColor: isAdvisor ? colors.accentSurface : colors.surface,
            borderColor: isAdvisor ? colors.accentBorder : colors.surfaceBorder,
          },
        ]}
        onPress={onToggleRole}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.toggleText,
            { color: isAdvisor ? colors.accent : colors.textSecondary },
          ]}
        >
          {isAdvisor ? 'Advisor' : 'Customer'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  toggle: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
