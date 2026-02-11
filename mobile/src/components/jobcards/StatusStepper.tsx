import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { JOB_CARD_STATUS_ORDER, JOB_CARD_STATUS_LABELS } from '../../types';
import type { JobCardStatus } from '../../types';
import { spacing } from '../../constants/theme';

interface Props {
  currentStatus: JobCardStatus;
}

export function StatusStepper({ currentStatus }: Props) {
  const { colors } = useTheme();
  const currentIdx = JOB_CARD_STATUS_ORDER.indexOf(currentStatus);

  return (
    <View style={styles.container}>
      {JOB_CARD_STATUS_ORDER.map((status, i) => {
        const done = i <= currentIdx;
        const isActive = i === currentIdx;
        return (
          <View key={status} style={styles.step}>
            <View style={styles.dotRow}>
              {i > 0 && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: i <= currentIdx ? colors.accent : colors.surfaceBorder },
                  ]}
                />
              )}
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done ? colors.accent : 'transparent',
                    borderColor: done ? colors.accent : colors.surfaceBorder,
                  },
                  isActive && styles.activeDot,
                ]}
              >
                {done && <Text style={styles.check}>✓</Text>}
              </View>
              {i < JOB_CARD_STATUS_ORDER.length - 1 && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: i < currentIdx ? colors.accent : colors.surfaceBorder },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? colors.accent : done ? colors.textSecondary : colors.textMuted,
                  fontWeight: isActive ? '700' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {JOB_CARD_STATUS_LABELS[status]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  step: {
    flex: 1,
    alignItems: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  check: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  line: {
    flex: 1,
    height: 2,
  },
  label: {
    fontSize: 10,
    marginTop: spacing.xs + 2,
    textAlign: 'center',
    paddingHorizontal: 1,
  },
});
