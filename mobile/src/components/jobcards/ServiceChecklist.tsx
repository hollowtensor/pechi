import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { ChecklistItem } from '../../types';
import { spacing, borderRadius } from '../../constants/theme';

interface Props {
  checklist: ChecklistItem[];
  isAdvisor: boolean;
  onToggle: (key: string, checked: boolean) => void;
}

export function ServiceChecklist({ checklist, isAdvisor, onToggle }: Props) {
  const { colors } = useTheme();

  const serviceItems = useMemo(
    () => checklist.filter((i) => i.category === 'service'),
    [checklist],
  );
  const partItems = useMemo(
    () => checklist.filter((i) => i.category === 'part'),
    [checklist],
  );

  const checkedCount = checklist.filter((i) => i.checked).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? checkedCount / totalCount : 0;

  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Checklist</Text>
        <View style={[styles.badge, { backgroundColor: colors.accent + '18' }]}>
          <Text style={[styles.badgeText, { color: colors.accent }]}>
            {checkedCount}/{totalCount}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceBorder }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.accent, width: `${progress * 100}%` },
          ]}
        />
      </View>

      {/* Service tasks */}
      {serviceItems.length > 0 && (
        <>
          <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Service Tasks</Text>
          {serviceItems.map((item) => (
            <ChecklistRow
              key={item.key}
              item={item}
              isAdvisor={isAdvisor}
              onToggle={onToggle}
              colors={colors}
            />
          ))}
        </>
      )}

      {/* Parts */}
      {partItems.length > 0 && (
        <>
          <Text style={[styles.groupLabel, { color: colors.textMuted, marginTop: spacing.lg }]}>
            Parts Installation
          </Text>
          {partItems.map((item) => (
            <ChecklistRow
              key={item.key}
              item={item}
              isAdvisor={isAdvisor}
              onToggle={onToggle}
              colors={colors}
            />
          ))}
        </>
      )}
    </View>
  );
}

function ChecklistRow({
  item,
  isAdvisor,
  onToggle,
  colors,
}: {
  item: ChecklistItem;
  isAdvisor: boolean;
  onToggle: (key: string, checked: boolean) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const timeStr = item.checked_at
    ? new Date(item.checked_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const row = (
    <View style={styles.row}>
      {/* Checkbox circle */}
      <View
        style={[
          styles.checkbox,
          item.checked
            ? { backgroundColor: colors.accent }
            : { borderColor: colors.textMuted, borderWidth: 2 },
        ]}
      >
        {item.checked && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* Label + time */}
      <View style={styles.labelWrap}>
        <Text
          style={[
            styles.label,
            { color: item.checked ? colors.textMuted : colors.text },
            item.checked && styles.labelChecked,
          ]}
          numberOfLines={2}
        >
          {item.label}
        </Text>
        {timeStr && (
          <Text style={[styles.timeText, { color: colors.textMuted }]}>{timeStr}</Text>
        )}
      </View>
    </View>
  );

  if (isAdvisor) {
    return (
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => onToggle(item.key, !item.checked)}
      >
        {row}
      </TouchableOpacity>
    );
  }

  return row;
}

const styles = StyleSheet.create({
  section: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  labelChecked: {
    textDecorationLine: 'line-through',
  },
  timeText: {
    fontSize: 11,
    marginTop: 2,
  },
});
