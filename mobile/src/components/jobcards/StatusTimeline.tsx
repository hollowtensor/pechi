import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { JOB_CARD_STATUS_LABELS } from '../../types';
import type { StatusHistoryEntry } from '../../types';
import { spacing, borderRadius } from '../../constants/theme';

interface Props {
  history: StatusHistoryEntry[];
}

export function StatusTimeline({ history }: Props) {
  const { colors } = useTheme();

  if (!history || history.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: colors.text }]}>Timeline</Text>
      {history.map((entry, i) => {
        const isLast = i === history.length - 1;
        const label = JOB_CARD_STATUS_LABELS[entry.status] || entry.status;
        const date = new Date(entry.timestamp);
        const timeStr = date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <View key={`${entry.status}-${i}`} style={styles.entry}>
            <View style={styles.indicator}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isLast ? colors.accent : colors.textMuted,
                  },
                ]}
              />
              {i < history.length - 1 && (
                <View style={[styles.line, { backgroundColor: colors.surfaceBorder }]} />
              )}
            </View>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isLast ? colors.accentSurface : colors.surface,
                  borderColor: isLast ? colors.accentBorder : colors.surfaceBorder,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.statusLabel, { color: isLast ? colors.accent : colors.text }]}>
                  {label}
                </Text>
                <Text style={[styles.time, { color: colors.textMuted }]}>{timeStr}</Text>
              </View>
              {entry.notes ? (
                <Text style={[styles.notes, { color: colors.textSecondary }]}>{entry.notes}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  entry: {
    flexDirection: 'row',
    minHeight: 64,
  },
  indicator: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: spacing.sm,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: spacing.xs,
  },
  card: {
    flex: 1,
    marginLeft: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  time: {
    fontSize: 11,
  },
  notes: {
    fontSize: 12,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
