/**
 * History Controller Hook
 * Manages outfit history state and business logic
 */

import { useState, useEffect } from 'react';
import { OutfitHistoryEntry } from '../models/OutfitModels';
import apiService from '../services/ApiService';

export const useHistoryController = () => {
  const [history, setHistory] = useState<OutfitHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullView, setIsFullView] = useState<boolean>(false);

  /**
   * Fetch outfit history from the API
   */
  const fetchHistory = async (limit: number = 2) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiService.getOutfitHistory(limit);
      setHistory(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history';
      setError(errorMessage);
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch recent history (last 2 entries) - used after new suggestion
   */
  const fetchRecentHistory = async () => {
    await fetchHistory(2);
    setIsFullView(false);
  };

  /**
   * Refresh and load all history data
   */
  const refreshHistory = async () => {
    await fetchHistory(50); // Fetch more entries on refresh
    setIsFullView(true);
  };

  /**
   * Load initial history (last 2) on component mount
   */
  useEffect(() => {
    fetchRecentHistory();
  }, []);

  return {
    history,
    loading,
    error,
    isFullView,
    refreshHistory,
    fetchRecentHistory,
    fetchHistory,
  };
};

