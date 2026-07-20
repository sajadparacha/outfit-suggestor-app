/**
 * Week Outfit Planner controller — load, edit, save, generate, today, history.
 */

import { useCallback, useEffect, useState } from 'react';
import apiService from '../services/ApiService';
import {
  WeekPlan,
  WeekPlanDay,
  WeekPlanHistoryItem,
  WeekPlanToday,
  createEmptyWeekPlan,
  getDeviceTimezone,
  normalizeWeekPlanDays,
  toUpsertPayload,
} from '../models/WeekPlanModels';

interface UseWeekPlanControllerOptions {
  isAuthenticated?: boolean;
  userId?: number | null;
}

export const useWeekPlanController = (options?: UseWeekPlanControllerOptions) => {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [today, setToday] = useState<WeekPlanToday | null>(null);
  const [history, setHistory] = useState<WeekPlanHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const applyPlan = useCallback((next: WeekPlan) => {
    const normalized = normalizeWeekPlanDays(next);
    setPlan(normalized);
    if (normalized.message) {
      setMessage(normalized.message);
    }
    if (normalized.wardrobe_empty) {
      setMessage(normalized.message || 'Add items to your wardrobe to generate outfits.');
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiService.getWeekPlanHistory();
      setHistory(data.items ?? []);
    } catch {
      // Soft-fail: keep existing history list
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planData, todayData] = await Promise.all([
        apiService.getWeekPlan(),
        apiService.getWeekPlanToday(),
      ]);
      applyPlan(planData);
      setToday(todayData);
      if (todayData.message) {
        setMessage(todayData.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load week plan';
      setError(errorMessage);
      setPlan(createEmptyWeekPlan(getDeviceTimezone()));
      setToday(null);
    } finally {
      setLoading(false);
    }
    await loadHistory();
  }, [applyPlan, loadHistory]);

  const refreshToday = useCallback(async () => {
    try {
      const todayData = await apiService.getWeekPlanToday();
      setToday(todayData);
    } catch {
      // Keep existing today state on soft refresh failure
    }
  }, []);

  /** Patch a day locally (enabled, occasion, use_wardrobe_only, …). */
  const updateDay = useCallback((dayOfWeek: number, patch: Partial<WeekPlanDay>) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.day_of_week === dayOfWeek ? { ...d, ...patch } : d
        ),
      };
    });
  }, []);

  const setReminderTime = useCallback((reminder_time: string) => {
    setPlan((prev) => (prev ? { ...prev, reminder_time } : prev));
  }, []);

  const setSharedStyle = useCallback((shared_style: string) => {
    setPlan((prev) => (prev ? { ...prev, shared_style } : prev));
  }, []);

  const setSharedSeason = useCallback((shared_season: string) => {
    setPlan((prev) => (prev ? { ...prev, shared_season } : prev));
  }, []);

  const savePlan = useCallback(async () => {
    if (!plan) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const timezone = getDeviceTimezone();
      const payload = toUpsertPayload({ ...plan, timezone });
      const saved = await apiService.putWeekPlan(payload);
      applyPlan(saved);
      await refreshToday();
      await loadHistory();
      setMessage('Plan saved to your account.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save week plan';
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [plan, applyPlan, refreshToday, loadHistory]);

  const generateWeek = useCallback(async () => {
    if (!plan) return;
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      // Persist edits first so generate uses current occasions/style/reminder
      const timezone = getDeviceTimezone();
      await apiService.putWeekPlan(toUpsertPayload({ ...plan, timezone }));
      const result = await apiService.generateWeekPlan();
      applyPlan(result);
      await refreshToday();
      await loadHistory();
      if (result.wardrobe_empty) {
        setMessage(result.message || 'Add items to your wardrobe to generate outfits.');
      } else if (result.message) {
        setMessage(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate outfits';
      setError(errorMessage);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [plan, applyPlan, refreshToday, loadHistory]);

  const regenerateDay = useCallback(
    async (dayOfWeek: number) => {
      if (!plan) return;
      setGenerating(true);
      setError(null);
      setMessage(null);
      try {
        const timezone = getDeviceTimezone();
        await apiService.putWeekPlan(toUpsertPayload({ ...plan, timezone }));
        const result = await apiService.generateWeekPlan({ day_of_week: dayOfWeek });
        applyPlan(result);
        await refreshToday();
        if (result.wardrobe_empty) {
          setMessage(result.message || 'Add items to your wardrobe to generate outfits.');
        } else if (result.message) {
          setMessage(result.message);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate day';
        setError(errorMessage);
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [plan, applyPlan, refreshToday]
  );

  const clearPlan = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await apiService.deleteWeekPlan();
      setPlan(createEmptyWeekPlan(getDeviceTimezone()));
      setToday(null);
      setMessage('Plan cleared.');
      await loadHistory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear week plan';
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [loadHistory]);

  const restoreHistory = useCallback(
    async (historyId: number) => {
      setRestoring(true);
      setError(null);
      setMessage(null);
      try {
        const restored = await apiService.restoreWeekPlanHistory(historyId);
        applyPlan(restored);
        await refreshToday();
        await loadHistory();
        setMessage('Previous plan loaded.');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to restore week plan';
        setError(errorMessage);
        throw err;
      } finally {
        setRestoring(false);
      }
    },
    [applyPlan, refreshToday, loadHistory]
  );

  useEffect(() => {
    const isAuthenticated = options?.isAuthenticated ?? false;
    const currentUserId = options?.userId;

    if (!isAuthenticated || !currentUserId) {
      setPlan(null);
      setToday(null);
      setHistory([]);
      setError(null);
      setMessage(null);
      return;
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.userId, options?.isAuthenticated]);

  const enabledDayCount = plan?.days.filter((d) => d.enabled).length ?? 0;

  return {
    plan,
    today,
    history,
    loading,
    generating,
    saving,
    restoring,
    error,
    message,
    enabledDayCount,
    load,
    loadHistory,
    updateDay,
    setReminderTime,
    setSharedStyle,
    setSharedSeason,
    savePlan,
    generateWeek,
    regenerateDay,
    clearPlan,
    restoreHistory,
    clearError: () => setError(null),
    clearMessage: () => setMessage(null),
  };
};
