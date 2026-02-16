/**
 * History Controller Hook
 * Manages outfit history state and business logic
 */

import { useState, useEffect } from 'react';
import { OutfitHistoryEntry } from '../models/OutfitModels';
import apiService from '../services/ApiService';

interface UseHistoryControllerOptions {
  userId?: number | null; // User ID to track authentication changes
  isAuthenticated?: boolean; // Track authentication state
}

export const useHistoryController = (options?: UseHistoryControllerOptions) => {
  const [history, setHistory] = useState<OutfitHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullView, setIsFullView] = useState<boolean>(false);

  /**
   * Fetch outfit history from the API
   * @returns Fetched history entries
   */
  const fetchHistory = async (limit: number = 2): Promise<OutfitHistoryEntry[]> => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiService.getOutfitHistory(limit);
      setHistory(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history';
      setError(errorMessage);
      console.error('Error fetching history:', err);
      throw err;
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
   * @returns Fetched history entries
   */
  const refreshHistory = async (): Promise<OutfitHistoryEntry[]> => {
    const data = await fetchHistory(50); // Fetch more entries on refresh
    setIsFullView(true);
    return data;
  };

  /**
   * Ensure all history is loaded (for searching)
   * @returns Current history entries (fetched if not already in full view)
   */
  const ensureFullHistory = async (): Promise<OutfitHistoryEntry[]> => {
    if (!isFullView) {
      return await refreshHistory();
    }
    return history;
  };

  /**
   * Delete a history entry
   */
  const deleteHistoryEntry = async (entryId: number) => {
    setLoading(true);
    setError(null);

    try {
      await apiService.deleteOutfitHistory(entryId);
      // Remove deleted entry from local state
      setHistory(prevHistory => prevHistory.filter(entry => entry.id !== entryId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete history entry';
      setError(errorMessage);
      throw err; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear history when user logs out or changes
   */
  useEffect(() => {
    const isAuthenticated = options?.isAuthenticated ?? false;
    const currentUserId = options?.userId;
    
    if (!isAuthenticated || !currentUserId) {
      // User logged out or not authenticated - clear history
      setHistory([]);
      setIsFullView(false);
      setError(null);
      return;
    }
    
    // User logged in or changed - reload history for this user
    fetchRecentHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.userId, options?.isAuthenticated]);

  return {
    history,
    loading,
    error,
    isFullView,
    refreshHistory,
    fetchRecentHistory,
    fetchHistory,
    ensureFullHistory,
    deleteHistoryEntry,
  };
};

