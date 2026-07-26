/**
 * Week Outfit Planner controller — load, edit, save, generate, today, history.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../services/ApiService';
import {
  WeekPlan,
  WeekPlanDay,
  WeekPlanHistoryItem,
  WeekPlanPresetItem,
  WeekPlanToday,
  createEmptyWeekPlan,
  getDeviceTimezone,
  normalizeWeekPlanDays,
  planHasGeneratedOutfits,
  planToPresetConfig,
  toUpsertPayload,
  WEEK_PLAN_PRESET_NAME_MAX,
} from '../models/WeekPlanModels';

interface UseWeekPlanControllerOptions {
  isAuthenticated?: boolean;
  userId?: number | null;
}

/** Fingerprint of editable plan state for dirty detection (config + outfits). */
function planFingerprint(plan: WeekPlan): string {
  return JSON.stringify({
    ...toUpsertPayload(plan),
    outfits: plan.days.map((d) => ({
      day: d.day_of_week,
      summary: d.outfit?.summary ?? null,
      shirt: d.outfit?.shirt ?? null,
      trouser: d.outfit?.trouser ?? null,
      shoes: d.outfit?.shoes ?? null,
      belt: d.outfit?.belt ?? null,
    })),
  });
}

export const useWeekPlanController = (options?: UseWeekPlanControllerOptions) => {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  /** Always-current plan for save/generate (avoids stale closure after updateDay). */
  const planRef = useRef<WeekPlan | null>(null);
  const baselineRef = useRef<string | null>(null);
  const [today, setToday] = useState<WeekPlanToday | null>(null);
  const [history, setHistory] = useState<WeekPlanHistoryItem[]>([]);
  const [presets, setPresets] = useState<WeekPlanPresetItem[]>([]);
  const [presetCount, setPresetCount] = useState(0);
  const [presetLimit, setPresetLimit] = useState(0);
  const [presetBusy, setPresetBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const markClean = useCallback((next: WeekPlan, opts?: { saved?: boolean }) => {
    baselineRef.current = planFingerprint(next);
    setIsDirty(false);
    if (opts?.saved) {
      setLastSavedAt(new Date());
    }
  }, []);

  const markDirtyFromPlan = useCallback((next: WeekPlan) => {
    const baseline = baselineRef.current;
    if (baseline == null) {
      setIsDirty(false);
      return;
    }
    setIsDirty(planFingerprint(next) !== baseline);
  }, []);

  const replacePlan = useCallback((next: WeekPlan | null) => {
    planRef.current = next;
    setPlan(next);
  }, []);

  const applyPlan = useCallback((next: WeekPlan, opts?: { saved?: boolean }) => {
    const normalized = normalizeWeekPlanDays(next);
    replacePlan(normalized);
    markClean(normalized, opts);
    if (normalized.message) {
      setMessage(normalized.message);
    }
    if (normalized.wardrobe_empty) {
      setMessage(normalized.message || 'Add items to your wardrobe to generate outfits.');
    }
  }, [markClean, replacePlan]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiService.getWeekPlanHistory();
      setHistory(data.items ?? []);
    } catch {
      // Soft-fail: keep existing history list
    }
  }, []);

  const loadPresets = useCallback(async (options?: { soft?: boolean }) => {
    const soft = options?.soft ?? true;
    try {
      const data = await apiService.getWeekPlanPresets();
      setPresets(data.items ?? []);
      setPresetCount(data.count);
      setPresetLimit(data.limit);
    } catch (err) {
      if (soft) {
        // Keep existing list on background refresh; only clear if never loaded.
        return;
      }
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load planning templates';
      setError(errorMessage);
      throw err;
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
      const empty = createEmptyWeekPlan(getDeviceTimezone());
      replacePlan(empty);
      markClean(empty);
      setToday(null);
    } finally {
      setLoading(false);
    }
    await loadHistory();
    await loadPresets();
  }, [applyPlan, loadHistory, loadPresets, markClean, replacePlan]);

  const refreshToday = useCallback(async () => {
    try {
      const todayData = await apiService.getWeekPlanToday();
      setToday(todayData);
    } catch {
      // Keep existing today state on soft refresh failure
    }
  }, []);

  /** Patch a day locally (enabled, occasion, style, use_wardrobe_only, …). */
  const updateDay = useCallback(
    (dayOfWeek: number, patch: Partial<WeekPlanDay>) => {
      setPlan((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          days: prev.days.map((d) =>
            d.day_of_week === dayOfWeek ? { ...d, ...patch } : d
          ),
        };
        planRef.current = next;
        markDirtyFromPlan(next);
        return next;
      });
    },
    [markDirtyFromPlan]
  );

  const setReminderTime = useCallback(
    (reminder_time: string) => {
      setPlan((prev) => {
        if (!prev) return prev;
        const next = { ...prev, reminder_time };
        planRef.current = next;
        markDirtyFromPlan(next);
        return next;
      });
    },
    [markDirtyFromPlan]
  );

  const setSharedStyle = useCallback(
    (shared_style: string) => {
      setPlan((prev) => {
        if (!prev) return prev;
        const next = { ...prev, shared_style };
        planRef.current = next;
        markDirtyFromPlan(next);
        return next;
      });
    },
    [markDirtyFromPlan]
  );

  const setSharedSeason = useCallback(
    (shared_season: string) => {
      setPlan((prev) => {
        if (!prev) return prev;
        const next = { ...prev, shared_season };
        planRef.current = next;
        markDirtyFromPlan(next);
        return next;
      });
    },
    [markDirtyFromPlan]
  );

  const savePlan = useCallback(async () => {
    const current = planRef.current;
    if (!current) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const timezone = getDeviceTimezone();
      const payload = toUpsertPayload({ ...current, timezone });
      const saved = await apiService.putWeekPlan(payload);
      applyPlan(saved, { saved: true });
      await refreshToday();
      await loadHistory();
      setMessage('Plan saved.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save week plan';
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [applyPlan, refreshToday, loadHistory]);

  const generateWeek = useCallback(async () => {
    const current = planRef.current;
    if (!current) return;
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      // Persist edits first so generate uses current occasions/style/reminder
      const timezone = getDeviceTimezone();
      await apiService.putWeekPlan(toUpsertPayload({ ...current, timezone }));
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
  }, [applyPlan, refreshToday, loadHistory]);

  const regenerateDay = useCallback(
    async (dayOfWeek: number) => {
      const current = planRef.current;
      if (!current) return;
      setGenerating(true);
      setError(null);
      setMessage(null);
      try {
        const timezone = getDeviceTimezone();
        await apiService.putWeekPlan(toUpsertPayload({ ...current, timezone }));
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
    [applyPlan, refreshToday]
  );

  const clearPlan = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await apiService.deleteWeekPlan();
      const empty = createEmptyWeekPlan(getDeviceTimezone());
      replacePlan(empty);
      markClean(empty, { saved: true });
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
  }, [loadHistory, markClean, replacePlan]);

  const restoreHistory = useCallback(
    async (historyId: number) => {
      setRestoring(true);
      setError(null);
      setMessage(null);
      try {
        const restored = await apiService.restoreWeekPlanHistory(historyId);
        applyPlan(restored, { saved: true });
        await refreshToday();
        await loadHistory();
        setMessage('Plan loaded.');
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

  const normalizePresetName = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Name must not be empty');
    }
    if (trimmed.length > WEEK_PLAN_PRESET_NAME_MAX) {
      throw new Error(`Name must be at most ${WEEK_PLAN_PRESET_NAME_MAX} characters`);
    }
    return trimmed;
  };

  const savePresetAs = useCallback(
    async (name: string) => {
      const current = planRef.current;
      if (!current) return;
      setPresetBusy(true);
      setError(null);
      setMessage(null);
      try {
        const normalizedName = normalizePresetName(name);
        await apiService.createWeekPlanPreset({
          name: normalizedName,
          config: planToPresetConfig(current),
        });
        await loadPresets({ soft: false });
        setMessage(`Template “${normalizedName}” saved.`);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to save planning template';
        setError(errorMessage);
        throw err;
      } finally {
        setPresetBusy(false);
      }
    },
    [loadPresets]
  );

  const updatePreset = useCallback(
    async (presetId: number) => {
      const current = planRef.current;
      if (!current) return;
      setPresetBusy(true);
      setError(null);
      setMessage(null);
      try {
        await apiService.updateWeekPlanPreset(presetId, {
          config: planToPresetConfig(current),
        });
        await loadPresets({ soft: false });
        setMessage('Planning template updated.');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update planning template';
        setError(errorMessage);
        throw err;
      } finally {
        setPresetBusy(false);
      }
    },
    [loadPresets]
  );

  const renamePreset = useCallback(
    async (presetId: number, name: string) => {
      setPresetBusy(true);
      setError(null);
      setMessage(null);
      try {
        const normalizedName = normalizePresetName(name);
        await apiService.updateWeekPlanPreset(presetId, { name: normalizedName });
        await loadPresets({ soft: false });
        setMessage('Planning template renamed.');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to rename planning template';
        setError(errorMessage);
        throw err;
      } finally {
        setPresetBusy(false);
      }
    },
    [loadPresets]
  );

  const deletePreset = useCallback(
    async (presetId: number) => {
      setPresetBusy(true);
      setError(null);
      setMessage(null);
      try {
        await apiService.deleteWeekPlanPreset(presetId);
        await loadPresets({ soft: false });
        setMessage('Planning template deleted.');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete planning template';
        setError(errorMessage);
        throw err;
      } finally {
        setPresetBusy(false);
      }
    },
    [loadPresets]
  );

  const applyPreset = useCallback(
    async (presetId: number) => {
      setPresetBusy(true);
      setError(null);
      setMessage(null);
      try {
        const applied = await apiService.applyWeekPlanPreset(presetId);
        applyPlan(applied);
        await refreshToday();
        setMessage('Planning template loaded. Generate outfits when ready.');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load planning template';
        setError(errorMessage);
        throw err;
      } finally {
        setPresetBusy(false);
      }
    },
    [applyPlan, refreshToday]
  );

  useEffect(() => {
    const isAuthenticated = options?.isAuthenticated ?? false;
    const currentUserId = options?.userId;

    if (!isAuthenticated || !currentUserId) {
      replacePlan(null);
      baselineRef.current = null;
      setToday(null);
      setHistory([]);
      setPresets([]);
      setPresetCount(0);
      setPresetLimit(0);
      setError(null);
      setMessage(null);
      setIsDirty(false);
      setLastSavedAt(null);
      return;
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.userId, options?.isAuthenticated]);

  const enabledDayCount = plan?.days.filter((d) => d.enabled).length ?? 0;
  const presetAtLimit = presetLimit > 0 && presetCount >= presetLimit;
  const hasGeneratedOutfits = plan ? planHasGeneratedOutfits(plan) : false;

  return {
    plan,
    today,
    history,
    presets,
    presetCount,
    presetLimit,
    presetAtLimit,
    presetBusy,
    loading,
    generating,
    saving,
    restoring,
    error,
    message,
    isDirty,
    lastSavedAt,
    hasGeneratedOutfits,
    enabledDayCount,
    load,
    loadHistory,
    loadPresets,
    updateDay,
    setReminderTime,
    setSharedStyle,
    setSharedSeason,
    savePlan,
    generateWeek,
    regenerateDay,
    clearPlan,
    restoreHistory,
    savePresetAs,
    updatePreset,
    renamePreset,
    deletePreset,
    applyPreset,
    clearError: () => setError(null),
    clearMessage: () => setMessage(null),
  };
};
