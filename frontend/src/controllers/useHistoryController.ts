/**
 * History Controller Hook
 * Manages outfit history state and business logic
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { OutfitHistoryEntry } from '../models/OutfitModels';
import apiService, { OUTFIT_HISTORY_MAX_LIMIT, OUTFIT_HISTORY_PAGE_SIZE } from '../services/ApiService';
import { clearFullImageCache, invalidateHistoryEntry } from '../utils/fullImageCache';

/** Recent looks on Suggest renders at most 4 cards. */
export const RECENT_HISTORY_LIMIT = 4;
/** Random-pick pool: text-only, single request at the backend cap. */
export const RANDOM_PICK_POOL_LIMIT = OUTFIT_HISTORY_MAX_LIMIT;
/** Page size used while a history search drains remaining pages. */
export const HISTORY_SEARCH_PAGE_SIZE = OUTFIT_HISTORY_MAX_LIMIT;

interface UseHistoryControllerOptions {
  userId?: number | null; // User ID to track authentication changes
  isAuthenticated?: boolean; // Track authentication state
  /** True while the History screen is shown — loads the first page (20) instead of recent (4). */
  autoLoadFullHistory?: boolean;
}

function mergeById(existing: OutfitHistoryEntry[], page: OutfitHistoryEntry[]): OutfitHistoryEntry[] {
  const seen = new Set(existing.map((entry) => entry.id));
  return [...existing, ...page.filter((entry) => !seen.has(entry.id))];
}

export const useHistoryController = (options?: UseHistoryControllerOptions) => {
  const [history, setHistory] = useState<OutfitHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullView, setIsFullView] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const historyRef = useRef<OutfitHistoryEntry[]>([]);
  const hasMoreRef = useRef(false);
  const isFullViewRef = useRef(false);
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const ensureInFlightRef = useRef<Promise<OutfitHistoryEntry[]> | null>(null);

  const applyHistory = useCallback((next: OutfitHistoryEntry[]) => {
    historyRef.current = next;
    setHistory(next);
  }, []);

  const applyHasMore = useCallback((value: boolean) => {
    hasMoreRef.current = value;
    setHasMore(value);
  }, []);

  const applyFullView = useCallback((value: boolean) => {
    isFullViewRef.current = value;
    setIsFullView(value);
  }, []);

  /**
   * Replace history with the first `limit` entries. Stale responses (superseded by a newer
   * replace request) are ignored.
   */
  const fetchHistory = useCallback(
    async (limit: number = RECENT_HISTORY_LIMIT, fullView: boolean = false): Promise<OutfitHistoryEntry[]> => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const data = await apiService.getOutfitHistory({ limit, offset: 0 });
        if (requestId === requestIdRef.current) {
          applyHistory(data);
          applyHasMore(data.length >= limit);
          applyFullView(fullView);
        }
        return data;
      } catch (err) {
        if (requestId === requestIdRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load history';
          setError(errorMessage);
        }
        console.error('Error fetching history:', err);
        throw err;
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [applyFullView, applyHasMore, applyHistory]
  );

  /**
   * Fetch recent history (Recent looks) — used after a new suggestion
   */
  const fetchRecentHistory = useCallback(async () => {
    await fetchHistory(RECENT_HISTORY_LIMIT, false);
  }, [fetchHistory]);

  /**
   * History screen: reload the first page (20); further pages load on scroll.
   */
  const refreshHistory = useCallback(async (): Promise<OutfitHistoryEntry[]> => {
    return fetchHistory(OUTFIT_HISTORY_PAGE_SIZE, true);
  }, [fetchHistory]);

  /**
   * Append the next page. Errors keep loaded entries and resolve to false (retry on next scroll).
   */
  const loadMoreHistory = useCallback(
    async (pageSize: number = OUTFIT_HISTORY_PAGE_SIZE): Promise<boolean> => {
      if (loadingMoreRef.current || !hasMoreRef.current) return true;
      const requestId = requestIdRef.current;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      try {
        const page = await apiService.getOutfitHistory({
          limit: pageSize,
          offset: historyRef.current.length,
        });
        if (requestId !== requestIdRef.current) return true;
        applyHistory(mergeById(historyRef.current, page));
        applyHasMore(page.length >= pageSize);
        applyFullView(true);
        return true;
      } catch (err) {
        console.error('Error loading more history:', err);
        return false;
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    [applyFullView, applyHasMore, applyHistory]
  );

  /**
   * Random from History pool — text-only (include_images=false), always hits the API.
   * Callers fetch the picked entry's detail before showing it.
   */
  const fetchHistoryForRandomPick = useCallback(async (): Promise<OutfitHistoryEntry[]> => {
    try {
      return await apiService.getOutfitHistory({
        limit: RANDOM_PICK_POOL_LIMIT,
        offset: 0,
        includeImages: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history';
      setError(errorMessage);
      console.error('Error fetching history for random pick:', err);
      throw err;
    }
  }, []);

  const drainRemainingHistory = useCallback(async (): Promise<OutfitHistoryEntry[]> => {
    const requestId = requestIdRef.current;
    if (!isFullViewRef.current) {
      applyHasMore(true);
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      let all = historyRef.current;
      let more = true;
      while (more) {
        const page = await apiService.getOutfitHistory({
          limit: HISTORY_SEARCH_PAGE_SIZE,
          offset: all.length,
        });
        if (requestId !== requestIdRef.current) return historyRef.current;
        all = mergeById(all, page);
        more = page.length >= HISTORY_SEARCH_PAGE_SIZE;
        applyHistory(all);
      }
      applyHasMore(false);
      applyFullView(true);
      return all;
    } catch (err) {
      console.error('Error loading full history for search:', err);
      return historyRef.current;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [applyFullView, applyHasMore, applyHistory]);

  /**
   * Search and oldest-first sort need every entry: drain remaining pages (100 per request).
   * Concurrent callers share one in-flight drain.
   * @returns All loaded entries
   */
  const ensureFullHistory = useCallback((): Promise<OutfitHistoryEntry[]> => {
    if (isFullViewRef.current && !hasMoreRef.current) {
      return Promise.resolve(historyRef.current);
    }
    if (!ensureInFlightRef.current) {
      ensureInFlightRef.current = drainRemainingHistory().finally(() => {
        ensureInFlightRef.current = null;
      });
    }
    return ensureInFlightRef.current;
  }, [drainRemainingHistory]);

  /**
   * Delete a history entry
   */
  const deleteHistoryEntry = async (entryId: number) => {
    setLoading(true);
    setError(null);

    try {
      await apiService.deleteOutfitHistory(entryId);
      invalidateHistoryEntry(entryId);
      // Remove deleted entry from local state (no refetch of loaded pages)
      applyHistory(historyRef.current.filter((entry) => entry.id !== entryId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete history entry';
      setError(errorMessage);
      throw err; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  };

  const autoLoadFullHistory = options?.autoLoadFullHistory ?? false;
  const autoLoadFullHistoryRef = useRef(autoLoadFullHistory);
  autoLoadFullHistoryRef.current = autoLoadFullHistory;

  /**
   * Clear history when user logs out or changes
   */
  useEffect(() => {
    const isAuthenticated = options?.isAuthenticated ?? false;
    const currentUserId = options?.userId;

    if (!isAuthenticated || !currentUserId) {
      // User logged out or not authenticated - clear history
      requestIdRef.current += 1;
      applyHistory([]);
      applyHasMore(false);
      applyFullView(false);
      setError(null);
      clearFullImageCache();
      return;
    }

    // User logged in or changed - reload history for this user
    const load = autoLoadFullHistoryRef.current ? refreshHistory() : fetchRecentHistory();
    load.catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.userId, options?.isAuthenticated]);

  /**
   * Entering the History screen with only recent entries loaded → load the first page.
   */
  useEffect(() => {
    if (!autoLoadFullHistory) return;
    if (!(options?.isAuthenticated ?? false) || !options?.userId) return;
    if (isFullViewRef.current) return;
    refreshHistory().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadFullHistory]);

  return {
    history,
    loading,
    error,
    isFullView,
    hasMore,
    loadingMore,
    refreshHistory,
    fetchRecentHistory,
    fetchHistory,
    loadMoreHistory,
    ensureFullHistory,
    fetchHistoryForRandomPick,
    deleteHistoryEntry,
  };
};
