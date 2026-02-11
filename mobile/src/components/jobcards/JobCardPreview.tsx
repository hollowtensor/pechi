import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { JOB_CARD_STATUS_LABELS } from '../../types';
import type { JobCardListItem } from '../../types';
import { spacing, borderRadius } from '../../constants/theme';

interface Props {
  card: JobCardListItem;
  onPress: (card: JobCardListItem) => void;
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

export function JobCardPreview({ card, onPress }: Props) {
  const { colors } = useTheme();
  const statusColor = STATUS_COLORS[card.status] || colors.textMuted;
  const dateStr = card.preferred_date
    ? new Date(card.preferred_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
      onPress={() => onPress(card)}
      activeOpacity={0.7}
    >
      {/* Accent strip */}
      <View style={[styles.accent, { backgroundColor: statusColor }]} />

      <View style={styles.body}>
        {/* Row 1: Status badge + Job ID */}
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
            <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {JOB_CARD_STATUS_LABELS[card.status]}
            </Text>
          </View>
          <Text style={[styles.jobId, { color: colors.textMuted }]}>#{card.id}</Text>
        </View>

        {/* Row 2: Vehicle name */}
        <Text style={[styles.vehicleName, { color: colors.text }]} numberOfLines={1}>
          {card.vehicle_model} {card.vehicle_variant}
        </Text>

        {/* Row 3: Reg + Customer */}
        <View style={styles.metaRow}>
          <Text style={[styles.regText, { color: colors.text }]}>
            {card.registration_no}
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
            {card.customer_name}
          </Text>
        </View>

        {/* Row 4: Divider */}
        <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

        {/* Row 5: Estimate + Date + Technician */}
        <View style={styles.bottomRow}>
          <Text style={[styles.estimate, { color: colors.text }]}>
            ₹{(card.total_estimate || 0).toLocaleString('en-IN')}
          </Text>
          <View style={styles.bottomRight}>
            {card.assigned_technician ? (
              <Text style={[styles.secondaryText, { color: colors.textMuted }]} numberOfLines={1}>
                {card.assigned_technician}
              </Text>
            ) : null}
            {dateStr ? (
              <Text style={[styles.secondaryText, { color: colors.textMuted }]}>{dateStr}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: spacing.xl,
    paddingLeft: spacing.xl - 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
    gap: spacing.sm - 2,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobId: {
    fontSize: 12,
    fontWeight: '500',
  },
  vehicleName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  regText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaText: {
    fontSize: 13,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  divider: {
    height: 1,
    marginBottom: spacing.lg,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimate: {
    fontSize: 18,
    fontWeight: '700',
  },
  bottomRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  secondaryText: {
    fontSize: 12,
  },
});
