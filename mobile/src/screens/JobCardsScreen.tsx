import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useJobCards } from '../hooks/useJobCards';
import { JobCardsHeader } from '../components/jobcards/JobCardsHeader';
import { StatusFilterBar } from '../components/jobcards/StatusFilterBar';
import { JobCardPreview } from '../components/jobcards/JobCardPreview';
import { JobCardDetailModal } from '../components/jobcards/JobCardDetailModal';
import type { JobCardListItem, JobCardStatus } from '../types';
import { spacing } from '../constants/theme';

export function JobCardsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    jobCards,
    loading,
    selectedCard,
    setSelectedCard,
    isAdvisor,
    setIsAdvisor,
    refresh,
    loadDetail,
    advanceStatus,
  } = useJobCards();

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Auto-refresh on tab focus
  useFocusEffect(
    useCallback(() => {
      refresh(statusFilter ?? undefined);
    }, [refresh, statusFilter]),
  );

  const handleFilterChange = useCallback(
    (status: string | null) => {
      setStatusFilter(status);
      refresh(status ?? undefined);
    },
    [refresh],
  );

  const handleCardPress = useCallback(
    (card: JobCardListItem) => {
      loadDetail(card.id);
    },
    [loadDetail],
  );

  const handleAdvanceStatus = useCallback(
    async (id: number, status: JobCardStatus) => {
      await advanceStatus(id, status);
    },
    [advanceStatus],
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedCard(null);
    // Refresh list to reflect any status changes
    refresh(statusFilter ?? undefined);
  }, [setSelectedCard, refresh, statusFilter]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <JobCardsHeader
        isAdvisor={isAdvisor}
        onToggleRole={() => setIsAdvisor((prev) => !prev)}
      />

      <StatusFilterBar selected={statusFilter} onSelect={handleFilterChange} />

      <FlatList
        data={jobCards}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => refresh(statusFilter ?? undefined)}
        renderItem={({ item }) => (
          <JobCardPreview card={item} onPress={handleCardPress} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No job cards found
              </Text>
            </View>
          ) : null
        }
      />

      {selectedCard && (
        <JobCardDetailModal
          card={selectedCard}
          isAdvisor={isAdvisor}
          onAdvanceStatus={handleAdvanceStatus}
          onClose={handleCloseDetail}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
  },
});
