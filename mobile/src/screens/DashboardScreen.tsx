import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { fetchJobCards } from '../services/api';
import { JOB_CARD_STATUS_LABELS } from '../types';
import type { JobCardListItem } from '../types';
import { spacing, borderRadius } from '../constants/theme';

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#6366f1',
  received: '#8b5cf6',
  diagnosis: '#f59e0b',
  in_progress: '#3b82f6',
  quality_check: '#06b6d4',
  ready_for_delivery: '#22c55e',
  completed: '#10b981',
};

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [recentCards, setRecentCards] = useState<JobCardListItem[]>([]);

  useEffect(() => {
    fetchJobCards().then((res) => {
      if (res.success) setRecentCards(res.jobCards.slice(0, 3));
    }).catch(() => {});
  }, []);

  const goAssistant = useCallback(() => {
    navigation.navigate('Assistant');
  }, [navigation]);

  const goJobCards = useCallback((openCardId?: number) => {
    navigation.navigate('Job Cards', openCardId ? { openCardId } : undefined);
  }, [navigation]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }} />
          <ThemeToggle />
        </View>

        {/* Logo & Greeting */}
        <View style={styles.greeting}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={[styles.appName, { color: colors.text }]}>Pechi</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Maruti Suzuki Service Assistant
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.accentSurface, borderColor: colors.accentBorder }]}
            onPress={goAssistant}
            activeOpacity={0.7}
          >
            <Ionicons name="mic" size={28} color={colors.accent} style={styles.actionIcon} />
            <Text style={[styles.actionTitle, { color: colors.accent }]}>Talk to Pechi</Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              Book a service, ask questions, or get help with your vehicle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            onPress={() => goJobCards()}
            activeOpacity={0.7}
          >
            <Ionicons name="clipboard-outline" size={28} color={colors.text} style={styles.actionIcon} />
            <Text style={[styles.actionTitle, { color: colors.text }]}>Job Cards</Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              Track service progress and manage job cards
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Job Cards */}
        {recentCards.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Job Cards</Text>
              <TouchableOpacity onPress={() => goJobCards()}>
                <Text style={[styles.seeAll, { color: colors.accent }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {recentCards.map((card) => {
              const statusColor = STATUS_COLORS[card.status] || colors.textMuted;
              const dateStr = card.preferred_date
                ? new Date(card.preferred_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })
                : '';
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.recentCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                  onPress={() => goJobCards(card.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.recentAccent, { backgroundColor: statusColor }]} />
                  <View style={styles.recentBody}>
                    <View style={styles.recentTopRow}>
                      <View style={[styles.statusDotBadge, { backgroundColor: statusColor + '18' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {JOB_CARD_STATUS_LABELS[card.status]}
                        </Text>
                      </View>
                      <Text style={[styles.recentEstimate, { color: colors.text }]}>
                        ₹{(card.total_estimate || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <Text style={[styles.recentReg, { color: colors.text }]}>
                      {card.registration_no}
                    </Text>
                    <View style={styles.recentBottomRow}>
                      <Text style={[styles.recentMeta, { color: colors.textMuted }]} numberOfLines={1}>
                        {card.vehicle_model} {card.vehicle_variant}
                      </Text>
                      {dateStr ? (
                        <Text style={[styles.recentMeta, { color: colors.textMuted }]}>{dateStr}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.recentChevron} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: spacing.sm,
  },
  greeting: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  actionCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  actionIcon: {
    marginBottom: spacing.sm,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  actionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  recentSection: {
    marginBottom: spacing.lg,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  recentAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  recentBody: {
    flex: 1,
    padding: spacing.lg,
  },
  recentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusDotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recentReg: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  recentEstimate: {
    fontSize: 14,
    fontWeight: '700',
  },
  recentBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentMeta: {
    fontSize: 12,
  },
  recentChevron: {
    marginRight: spacing.md,
  },
});
