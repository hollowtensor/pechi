import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ServiceHistoryData } from '../types';
import { colors, spacing, borderRadius } from '../constants/theme';

interface Props {
  data: ServiceHistoryData;
}

const STATUS_COLORS: Record<string, string> = {
  completed: colors.statusGreen,
  scheduled: colors.statusYellow,
  in_progress: colors.accentLight,
};

export function ServiceHistoryCard({ data }: Props) {
  return (
    <View>
      {data.vehicleLabel ? (
        <Text style={styles.subtitle}>{data.vehicleLabel}</Text>
      ) : null}

      {data.records.map((r, i) => (
        <View key={i} style={styles.record}>
          <View style={styles.recordHeader}>
            <Text style={styles.date}>{r.date}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: (STATUS_COLORS[r.status] || colors.textMuted) + '22' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: STATUS_COLORS[r.status] || colors.textMuted },
                ]}
              >
                {r.status}
              </Text>
            </View>
          </View>

          <Text style={styles.type}>{r.type}</Text>
          {r.description ? <Text style={styles.desc}>{r.description}</Text> : null}

          <View style={styles.footer}>
            <Text style={[styles.cost, r.cost === 0 && styles.costFree]}>
              {r.cost === 0 ? 'Free' : `\u20B9${r.cost.toLocaleString()}`}
            </Text>
            {r.partsReplaced.length > 0 && (
              <View style={styles.tags}>
                {r.partsReplaced.map((p, j) => (
                  <View key={j} style={styles.tag}>
                    <Text style={styles.tagText}>{p}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {r.nextServiceDate ? (
            <Text style={styles.next}>Next service: {r.nextServiceDate}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  record: {
    backgroundColor: 'rgba(240, 235, 227, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.05)',
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
    color: colors.textSecondary,
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
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  desc: {
    color: colors.textSecondary,
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
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  costFree: {
    color: colors.statusGreen,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    backgroundColor: 'rgba(240, 235, 227, 0.06)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  next: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
