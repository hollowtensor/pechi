import { useState, useCallback } from 'react';
import type { JobCardListItem, JobCardStatus } from '../types';
import {
  fetchJobCards,
  fetchJobCardDetail,
  updateJobCardStatus,
} from '../services/api';

export function useJobCards() {
  const [jobCards, setJobCards] = useState<JobCardListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<JobCardListItem | null>(null);
  const [isAdvisor, setIsAdvisor] = useState(false);

  const refresh = useCallback(async (statusFilter?: string) => {
    setLoading(true);
    try {
      const res = await fetchJobCards(statusFilter);
      if (res.success) setJobCards(res.jobCards);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    const res = await fetchJobCardDetail(id);
    if (res.success) setSelectedCard(res.jobCard);
  }, []);

  const advanceStatus = useCallback(
    async (id: number, status: JobCardStatus, notes?: string) => {
      const res = await updateJobCardStatus(id, status, notes);
      if (res.success) {
        // Refresh the detail and list
        await loadDetail(id);
        await refresh();
      }
      return res;
    },
    [loadDetail, refresh],
  );

  return {
    jobCards,
    loading,
    selectedCard,
    setSelectedCard,
    isAdvisor,
    setIsAdvisor,
    refresh,
    loadDetail,
    advanceStatus,
  };
}
