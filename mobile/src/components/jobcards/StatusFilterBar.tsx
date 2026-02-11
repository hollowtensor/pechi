import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { JOB_CARD_STATUS_LABELS, JOB_CARD_STATUS_ORDER } from '../../types';
import { spacing } from '../../constants/theme';

interface Props {
  selected: string | null;
  onSelect: (status: string | null) => void;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#6366f1',
  received: '#8b5cf6',
  diagnosis: '#f59e0b',
  in_progress: '#3b82f6',
  quality_check: '#06b6d4',
  ready_for_delivery: '#22c55e',
  completed: '#10b981',
};

const FILTERS: { key: string | null; label: string; color?: string }[] = [
  { key: null, label: 'All' },
  ...JOB_CARD_STATUS_ORDER.map((s) => ({
    key: s,
    label: JOB_CARD_STATUS_LABELS[s],
    color: STATUS_COLORS[s],
  })),
];

export function StatusFilterBar({ selected, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
    >
      {FILTERS.map((item) => {
        const active = item.key === selected;
        const dotColor = item.color || colors.accent;

        return (
          <TouchableOpacity
            key={item.key ?? 'all'}
            style={[
              styles.chip,
              active
                ? { backgroundColor: colors.text }
                : { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 },
            ]}
            onPress={() => onSelect(item.key)}
            activeOpacity={0.7}
          >
            {item.color && (
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
            )}
            <Text
              style={[
                styles.chipText,
                { color: active ? colors.background : colors.text },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md + 2,
    height: 34,
    borderRadius: 10,
    gap: spacing.sm - 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    includeFontPadding: false,
  },
});
