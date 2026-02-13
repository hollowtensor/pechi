import { useState, useCallback } from 'react';
import type { JobCardListItem, JobCardStatus } from '../types';
import {
  fetchJobCards,
  fetchJobCardDetail,
  updateJobCardStatus,
  updateJobCardFields,
  toggleChecklistItem,
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

  const toggleChecklist = useCallback(
    async (id: number, key: string, checked: boolean) => {
      // Optimistic update
      setSelectedCard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          checklist: prev.checklist.map((item) =>
            item.key === key
              ? { ...item, checked, checked_at: checked ? new Date().toISOString() : null }
              : item,
          ),
        };
      });
      const res = await toggleChecklistItem(id, key, checked);
      if (res.success && res.checklist) {
        setSelectedCard((prev) => (prev ? { ...prev, checklist: res.checklist } : prev));
      }
    },
    [],
  );

  const saveRemarks = useCallback(
    async (id: number, remarks: string) => {
      const res = await updateJobCardFields(id, { advisor_remarks: remarks });
      if (res.success) {
        setSelectedCard((prev) => (prev ? { ...prev, advisor_remarks: remarks } : prev));
      }
      return res;
    },
    [],
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
    toggleChecklist,
    saveRemarks,
  };
}
