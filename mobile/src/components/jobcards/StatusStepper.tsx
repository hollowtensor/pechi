import React, { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { JOB_CARD_STATUS_ORDER, JOB_CARD_STATUS_LABELS } from '../../types';
import type { JobCardStatus } from '../../types';
import { spacing } from '../../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CURRENT_SIZE = 30;
const NEXT_SIZE = 20;
const COLLAPSED_SIZE = 8;
const EXPANDED_SIZE = 16;

interface Props {
  currentStatus: JobCardStatus;
}

export function StatusStepper({ currentStatus }: Props) {
  const { colors } = useTheme();
  const currentIdx = JOB_CARD_STATUS_ORDER.indexOf(currentStatus);
  const nextIdx = currentIdx + 1;

  const [expandedPast, setExpandedPast] = useState(false);
  const [expandedFuture, setExpandedFuture] = useState(false);

  const toggle = (side: 'past' | 'future') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (side === 'past') setExpandedPast((p) => !p);
    else setExpandedFuture((p) => !p);
  };

  const pastSteps = JOB_CARD_STATUS_ORDER.slice(0, currentIdx);
  const currentStep = JOB_CARD_STATUS_ORDER[currentIdx];
  const nextStep = nextIdx < JOB_CARD_STATUS_ORDER.length ? JOB_CARD_STATUS_ORDER[nextIdx] : null;
  const futureSteps = JOB_CARD_STATUS_ORDER.slice(nextIdx + 1);

  return (
    <View style={styles.outer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
      >

        {/* ── Past completed ── */}
        {pastSteps.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.tapZone}
              onPress={() => toggle('past')}
              activeOpacity={0.7}
            >
              {expandedPast
                ? pastSteps.map((status, i) => (
                    <React.Fragment key={status}>
                      {i > 0 && <View style={[styles.miniLine, { backgroundColor: colors.accent }]} />}
                      <View style={styles.expandedItemRight}>
                        <View style={[styles.expandedDot, { backgroundColor: colors.accent }]}>
                          <Text style={styles.miniCheck}>✓</Text>
                        </View>
                        <Text style={[styles.expandedLabel, { color: colors.accent }]} numberOfLines={1}>
                          {JOB_CARD_STATUS_LABELS[status]}
                        </Text>
                      </View>
                    </React.Fragment>
                  ))
                : pastSteps.map((status, i) => (
                    <React.Fragment key={status}>
                      {i > 0 && <View style={[styles.collapsedLine, { backgroundColor: colors.accent }]} />}
                      <View style={[styles.collapsedDot, { backgroundColor: colors.accent }]} />
                    </React.Fragment>
                  ))}
            </TouchableOpacity>
            <View style={[styles.connector, { backgroundColor: colors.accent }]} />
          </>
        )}

        {/* ── Current (always visible) ── */}
        <View style={styles.pinnedColumn}>
          <View style={[styles.currentDot, { backgroundColor: colors.accent }]}>
            <Text style={styles.currentCheck}>✓</Text>
          </View>
          <Text style={[styles.pinnedLabel, { color: colors.accent }]} numberOfLines={1}>
            {JOB_CARD_STATUS_LABELS[currentStep]}
          </Text>
        </View>

        {/* ── Next (always visible) ── */}
        {nextStep && (
          <>
            <View style={[styles.connector, { backgroundColor: colors.surfaceBorder }]} />
            <View style={styles.pinnedColumn}>
              <View style={[styles.nextDot, { borderColor: colors.textMuted }]} />
              <Text style={[styles.pinnedLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {JOB_CARD_STATUS_LABELS[nextStep]}
              </Text>
            </View>
          </>
        )}

        {/* ── Future ── */}
        {futureSteps.length > 0 && (
          <>
            <View style={[styles.connector, { backgroundColor: colors.surfaceBorder }]} />
            <TouchableOpacity
              style={styles.tapZone}
              onPress={() => toggle('future')}
              activeOpacity={0.7}
            >
              {expandedFuture
                ? futureSteps.map((status, i) => (
                    <React.Fragment key={status}>
                      {i > 0 && <View style={[styles.miniLine, { backgroundColor: colors.surfaceBorder }]} />}
                      <View style={styles.expandedItemLeft}>
                        <Text style={[styles.expandedLabel, { color: colors.textMuted }]} numberOfLines={1}>
                          {JOB_CARD_STATUS_LABELS[status]}
                        </Text>
                        <View style={[styles.expandedDotEmpty, { borderColor: colors.surfaceBorder }]} />
                      </View>
                    </React.Fragment>
                  ))
                : futureSteps.map((status, i) => (
                    <React.Fragment key={status}>
                      {i > 0 && <View style={[styles.collapsedLine, { backgroundColor: colors.surfaceBorder }]} />}
                      <View style={[styles.collapsedDotEmpty, { borderColor: colors.surfaceBorder }]} />
                    </React.Fragment>
                  ))}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingVertical: spacing.lg,
    marginBottom: spacing.xs,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Connector between groups
  connector: {
    width: 16,
    height: 2,
  },

  // Tap zone for collapsed/expanded groups
  tapZone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  // Collapsed small dots
  collapsedDot: {
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
    borderRadius: COLLAPSED_SIZE / 2,
  },
  collapsedDotEmpty: {
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
    borderRadius: COLLAPSED_SIZE / 2,
    borderWidth: 1.5,
  },
  collapsedLine: {
    width: 10,
    height: 2,
  },

  // Expanded — past: dot then label (expands right)
  expandedItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  // Expanded — future: label then dot (expands left)
  expandedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  expandedDot: {
    width: EXPANDED_SIZE,
    height: EXPANDED_SIZE,
    borderRadius: EXPANDED_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedDotEmpty: {
    width: EXPANDED_SIZE - 2,
    height: EXPANDED_SIZE - 2,
    borderRadius: (EXPANDED_SIZE - 2) / 2,
    borderWidth: 1.5,
  },
  expandedLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  miniCheck: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  miniLine: {
    width: 8,
    height: 2,
    marginHorizontal: 2,
  },

  // Pinned (current + next) — dot above, label below
  pinnedColumn: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  currentDot: {
    width: CURRENT_SIZE,
    height: CURRENT_SIZE,
    borderRadius: CURRENT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  nextDot: {
    width: NEXT_SIZE,
    height: NEXT_SIZE,
    borderRadius: NEXT_SIZE / 2,
    borderWidth: 2,
  },
  pinnedLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.xs + 1,
    textAlign: 'center',
  },
});
