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

  /**
   * Fetch outfit history from the API
   */
  const fetchHistory = async (limit: number = 20) => {
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
   * Refresh history data
   */
  const refreshHistory = () => {
    fetchHistory();
  };

  /**
   * Load history on component mount
   */
  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    history,
    loading,
    error,
    refreshHistory,
    fetchHistory,
  };
};

