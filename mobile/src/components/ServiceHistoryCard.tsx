import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { ServiceHistoryData } from '../types';
import { spacing, borderRadius } from '../constants/theme';

interface Props {
  data: ServiceHistoryData;
}

export function ServiceHistoryCard({ data }: Props) {
  const { colors } = useTheme();

  const statusColors: Record<string, string> = {
    completed: colors.statusGreen,
    scheduled: colors.statusYellow,
    in_progress: colors.accentLight,
  };

  return (
    <View>
      {data.vehicleLabel ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {data.vehicleLabel}
        </Text>
      ) : null}

      {data.records.map((r, i) => (
        <View
          key={i}
          style={[styles.record, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <View style={styles.recordHeader}>
            <Text style={[styles.date, { color: colors.textSecondary }]}>{r.date}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: (statusColors[r.status] || colors.textMuted) + '22' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: statusColors[r.status] || colors.textMuted },
                ]}
              >
                {r.status}
              </Text>
            </View>
          </View>

          <Text style={[styles.type, { color: colors.text }]}>{r.type}</Text>
          {r.description ? (
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              {r.description}
            </Text>
          ) : null}

          <View style={styles.footer}>
            <Text
              style={[
                styles.cost,
                { color: r.cost === 0 ? colors.statusGreen : colors.accent },
              ]}
            >
              {r.cost === 0 ? 'Free' : `\u20B9${r.cost.toLocaleString()}`}
            </Text>
            {r.partsReplaced.length > 0 && (
              <View style={styles.tags}>
                {r.partsReplaced.map((p, j) => (
                  <View
                    key={j}
                    style={[styles.tag, { backgroundColor: colors.surface }]}
                  >
                    <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                      {p}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {r.nextServiceDate ? (
            <Text style={[styles.next, { color: colors.textMuted }]}>
              Next service: {r.nextServiceDate}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 12,
    marginBottom: spacing.md,
  },
  record: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  type: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cost: {
    fontSize: 13,
    fontWeight: '600',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: 10,
  },
  next: {
    fontSize: 11,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
