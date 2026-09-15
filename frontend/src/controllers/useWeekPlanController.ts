/**
 * Week Outfit Planner controller — load, edit, save, generate, today, history.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../services/ApiService';
import { MatchingWardrobeItems } from '../models/OutfitModels';
import { WardrobeItem } from '../models/WardrobeModels';
import {
  WeekPlan,
  WeekPlanDay,
  WeekPlanHistoryItem,
  WeekPlanOutfit,
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
import { wardrobeItemMatchesOutfitSlot } from '../utils/wardrobeCategory';

const SLOT_TEXT_FIELDS = {
  shirt: 'shirt',
  trouser: 'trouser',
  blazer: 'blazer',
  shoes: 'shoes',
  belt: 'belt',
  sweater: 'sweater',
  outerwear: 'outerwear',
  tie: 'tie',
} as const;

const SLOT_ID_FIELDS = {
  shirt: 'shirt_id',
  trouser: 'trouser_id',
  blazer: 'blazer_id',
  shoes: 'shoes_id',
  belt: 'belt_id',
  sweater: 'sweater_id',
  outerwear: 'outerwear_id',
  tie: 'tie_id',
} as const;

type SlotKey = keyof typeof SLOT_TEXT_FIELDS;

function emptyOutfitShell(): WeekPlanOutfit {
  return {
    summary: '',
    shirt: '',
    trouser: '',
    blazer: '',
    shoes: '',
    belt: '',
    reasoning: '',
  };
}

function emptyMatching(): MatchingWardrobeItems {
  return {
    shirt: [],
    trouser: [],
    blazer: [],
    shoes: [],
    belt: [],
  };
}

function wardrobeItemSlotText(item: WardrobeItem): string {
  const color = item.color?.trim();
  const detail = (item.description || item.name || '').trim();
  if (color && detail) return `${color} ${detail}`;
  if (detail) return detail;
  if (color) return color;
  return item.category;
}

/** Fill one day slot from a wardrobe item (same shape as interactive pin). */
function fillPinnedSlotOnOutfit(
  outfit: WeekPlanOutfit,
  slotKey: SlotKey,
  item: WardrobeItem
): WeekPlanOutfit {
  const textField = SLOT_TEXT_FIELDS[slotKey];
  const idField = SLOT_ID_FIELDS[slotKey];
  const matching: MatchingWardrobeItems = {
    ...emptyMatching(),
    ...(outfit.matching_wardrobe_items ?? {}),
  };
  matching[slotKey] = [
    {
      id: item.id,
      category: item.category,
      color: item.color,
      description: item.description,
      image_data: item.image_data,
    },
  ];
  let wardrobe_item_ids = [...(outfit.wardrobe_item_ids ?? [])];
  if (!wardrobe_item_ids.includes(item.id)) {
    wardrobe_item_ids.push(item.id);
  }
  return {
    ...outfit,
    [textField]: wardrobeItemSlotText(item),
    [idField]: item.id,
    matching_wardrobe_items: matching,
    wardrobe_item_ids,
  };
}

/**
 * After Load template: resolve pinned wardrobe IDs into slot text/id/thumbnail.
 * Missing IDs are dropped quietly from pinned_items.
 */
function hydratePinnedSlotsOnDay(
  day: WeekPlanDay,
  itemsById: Map<number, WardrobeItem>
): WeekPlanDay {
  const pinned = day.pinned_items;
  if (!pinned || Object.keys(pinned).length === 0) {
    return day;
  }

  const nextPinned: Record<string, number> = {};
  let outfit: WeekPlanOutfit | null = day.outfit ? { ...day.outfit } : null;
  let hydratedAny = false;

  for (const [slotKey, itemId] of Object.entries(pinned)) {
    const key = slotKey as SlotKey;
    if (!SLOT_TEXT_FIELDS[key] || !SLOT_ID_FIELDS[key]) continue;

    const item = itemsById.get(itemId);
    if (!item) continue;

    nextPinned[key] = itemId;
    const base = outfit ?? emptyOutfitShell();
    outfit = fillPinnedSlotOnOutfit(base, key, item);
    hydratedAny = true;
  }

  const pinned_items =
    Object.keys(nextPinned).length > 0 ? nextPinned : undefined;

  if (!hydratedAny) {
    return { ...day, pinned_items, outfit: day.outfit ?? null };
  }

  return { ...day, pinned_items, outfit };
}

/** Collect pinned IDs, fetch wardrobe, hydrate all days. No-op if no pins. */
async function hydratePinnedSlotsFromWardrobe(plan: WeekPlan): Promise<WeekPlan> {
  const ids = new Set<number>();
  for (const day of plan.days) {
    if (!day.pinned_items) continue;
    for (const id of Object.values(day.pinned_items)) {
      if (typeof id === 'number') ids.add(id);
    }
  }
  if (ids.size === 0) return plan;

  const itemsById = new Map<number, WardrobeItem>();
  try {
    const { items } = await apiService.getWardrobe(undefined, undefined, 500, 0);
    for (const item of items) {
      if (ids.has(item.id)) itemsById.set(item.id, item);
    }
  } catch {
    // Fall through to per-item fetch for unresolved IDs
  }

  const missing = [...ids].filter((id) => !itemsById.has(id));
  await Promise.all(
    missing.map(async (id) => {
      try {
        const item = await apiService.getWardrobeItem(id);
        itemsById.set(id, item);
      } catch {
        // Soft-drop: pin removed in hydratePinnedSlotsOnDay
      }
    })
  );

  return {
    ...plan,
    days: plan.days.map((d) => hydratePinnedSlotsOnDay(d, itemsById)),
  };
}

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
      pinned_items: d.pinned_items ?? null,
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
  /** Last loaded or newly saved planning template (client-side selection). */
  const [loadedPresetId, setLoadedPresetId] = useState<number | null>(null);
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

  /** Apply a wardrobe item into a day's outfit slot (local dirty edit; no new API). */
  const applyWardrobeItemToDaySlot = useCallback(
    (dayOfWeek: number, slotKey: string, item: WardrobeItem) => {
      const key = slotKey as SlotKey;
      const idField = SLOT_ID_FIELDS[key];
      if (!SLOT_TEXT_FIELDS[key] || !idField) return;
      if (!wardrobeItemMatchesOutfitSlot(item.category, slotKey)) return;

      setPlan((prev) => {
        if (!prev) return prev;
        const next: WeekPlan = {
          ...prev,
          days: prev.days.map((d) => {
            if (d.day_of_week !== dayOfWeek) return d;
            const base = d.outfit ? { ...d.outfit } : emptyOutfitShell();
            const prevId = base[idField] as number | null | undefined;
            let filled = fillPinnedSlotOnOutfit(base, key, item);
            if (prevId != null && prevId !== item.id) {
              filled = {
                ...filled,
                wardrobe_item_ids: (filled.wardrobe_item_ids ?? []).filter(
                  (id) => id !== prevId
                ),
              };
            }
            return {
              ...d,
              pinned_items: { ...(d.pinned_items ?? {}), [key]: item.id },
              outfit: filled,
            };
          }),
        };
        planRef.current = next;
        markDirtyFromPlan(next);
        return next;
      });
    },
    [markDirtyFromPlan]
  );

  /** Remove a pin and clear that slot in the local outfit if it matches the pin. */
  const unpinDaySlot = useCallback(
    (dayOfWeek: number, slotKey: string) => {
      const key = slotKey as SlotKey;
      const textField = SLOT_TEXT_FIELDS[key];
      const idField = SLOT_ID_FIELDS[key];
      if (!textField || !idField) return;

      setPlan((prev) => {
        if (!prev) return prev;
        const next: WeekPlan = {
          ...prev,
          days: prev.days.map((d) => {
            if (d.day_of_week !== dayOfWeek) return d;
            const pinned = { ...(d.pinned_items ?? {}) };
            const prevPinId = pinned[key];
            delete pinned[key];
            const pinned_items =
              Object.keys(pinned).length > 0 ? pinned : undefined;

            if (!d.outfit || prevPinId == null) {
              return { ...d, pinned_items };
            }

            const base = { ...d.outfit };
            const slotId = base[idField] as number | null | undefined;
            if (slotId !== prevPinId) {
              return { ...d, pinned_items };
            }

            const matching: MatchingWardrobeItems = {
              ...emptyMatching(),
              ...(base.matching_wardrobe_items ?? {}),
            };
            matching[key] = [];

            let wardrobe_item_ids = [...(base.wardrobe_item_ids ?? [])];
            wardrobe_item_ids = wardrobe_item_ids.filter((id) => id !== prevPinId);

            return {
              ...d,
              pinned_items,
              outfit: {
                ...base,
                [textField]: '',
                [idField]: null,
                matching_wardrobe_items: matching,
                wardrobe_item_ids,
              },
            };
          }),
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
      // Clear before follow-up loads so day cards don't stay on "Generating"
      // after outfits are already applied.
      setGenerating(false);
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
        setGenerating(false);
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
      setLoadedPresetId(null);
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
        setLoadedPresetId(null);
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
        const created = await apiService.createWeekPlanPreset({
          name: normalizedName,
          config: planToPresetConfig(current),
        });
        setLoadedPresetId(created.id);
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
        setLoadedPresetId(presetId);
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
        setLoadedPresetId((prev) => (prev === presetId ? null : prev));
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
        const hydrated = await hydratePinnedSlotsFromWardrobe(applied);
        applyPlan(hydrated);
        setLoadedPresetId(presetId);
        await refreshToday();
        const name =
          presets.find((p) => p.id === presetId)?.name?.trim() ||
          `Template #${presetId}`;
        setMessage(`“${name}” loaded. Generate outfits when ready.`);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load planning template';
        setError(errorMessage);
        throw err;
      } finally {
        setPresetBusy(false);
      }
    },
    [applyPlan, refreshToday, presets]
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
      setLoadedPresetId(null);
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
  const loadedPresetName =
    loadedPresetId == null
      ? null
      : presets.find((p) => p.id === loadedPresetId)?.name?.trim() || null;

  return {
    plan,
    today,
    history,
    presets,
    presetCount,
    presetLimit,
    presetAtLimit,
    presetBusy,
    loadedPresetId,
    loadedPresetName,
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
    applyWardrobeItemToDaySlot,
    unpinDaySlot,
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
