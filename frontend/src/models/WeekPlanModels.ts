/**
 * Week Outfit Planner DTOs — match backend `/api/week-plan` schemas.
 */

import { MatchingWardrobeItems, OutfitCost } from './OutfitModels';

/** 0 = Monday … 6 = Sunday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEK_DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Monday',
  1: 'Tuesday',
  2: 'Wednesday',
  3: 'Thursday',
  4: 'Friday',
  5: 'Saturday',
  6: 'Sunday',
};

export const WEEK_DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  0: 'Mon',
  1: 'Tue',
  2: 'Wed',
  3: 'Thu',
  4: 'Fri',
  5: 'Sat',
  6: 'Sun',
};

/**
 * Client-side day status for week overview.
 * Exceptional statuses are shown on cards; `ready` is silent (no Ready spam).
 */
export type WeekDayStatus =
  | 'ready'
  | 'needs_outfit'
  | 'not_planned'
  | 'generating'
  | 'edited'
  | 'missing'
  | 'rest'
  | 'not_generated';

/** Display labels for exceptional day statuses (Ready is intentionally omitted). */
export const WEEK_DAY_EXCEPTIONAL_STATUS_LABELS: Partial<Record<WeekDayStatus, string>> = {
  needs_outfit: 'Needs outfit',
  not_planned: 'Not planned',
  generating: 'Generating',
  edited: 'Edited',
  missing: 'Needs outfit',
  rest: 'Not planned',
  not_generated: 'Needs outfit',
};

export function getExceptionalStatusLabel(
  status: WeekDayStatus
): string | null {
  if (status === 'ready') return null;
  return WEEK_DAY_EXCEPTIONAL_STATUS_LABELS[status] ?? null;
}

export const WEEK_PLAN_CORE_SLOTS = [
  { key: 'shirt', label: 'Shirt', field: 'shirt' as const },
  { key: 'trouser', label: 'Trousers', field: 'trouser' as const },
  { key: 'blazer', label: 'Blazer', field: 'blazer' as const },
  { key: 'shoes', label: 'Shoes', field: 'shoes' as const },
  { key: 'belt', label: 'Belt', field: 'belt' as const },
] as const;

/** Four aligned day-editor slots: top, bottom, shoes, accessory. */
export const WEEK_PLAN_EDITOR_SLOTS = [
  { key: 'shirt' as const, label: 'Top', field: 'shirt' as const },
  { key: 'trouser' as const, label: 'Bottom', field: 'trouser' as const },
  { key: 'shoes' as const, label: 'Shoes', field: 'shoes' as const },
  { key: 'belt' as const, label: 'Accessory', field: 'belt' as const },
] as const;

export type WeekPlanCoreSlotKey = (typeof WEEK_PLAN_CORE_SLOTS)[number]['key'];

/**
 * Slots that count as incomplete when empty.
 * Blazer and accessory (belt) are optional: empty means “none needed / add later”.
 */
export const WEEK_PLAN_REQUIRED_SLOTS = WEEK_PLAN_CORE_SLOTS.filter(
  (slot) => slot.key !== 'blazer' && slot.key !== 'belt'
);

export interface MissingOutfitSlot {
  key: WeekPlanCoreSlotKey;
  label: string;
}

/** Empty required outfit slot strings = missing (client-side; no backend invent). */
export function getMissingOutfitSlots(
  outfit: WeekPlanOutfit | null | undefined
): MissingOutfitSlot[] {
  if (!outfit) return [];
  return WEEK_PLAN_REQUIRED_SLOTS.filter(({ field }) => {
    const value = outfit[field];
    return typeof value !== 'string' || !value.trim();
  }).map(({ key, label }) => ({ key, label }));
}

/**
 * Day-card preview images from wardrobe matches.
 * Only include slots that are filled on the outfit — never show a match for an empty
 * optional blazer or a required Missing slot.
 */
export function getWeekDayPreviewThumbSources(day: WeekPlanDay): string[] {
  const outfit = day.outfit;
  const items = outfit?.matching_wardrobe_items;
  if (!outfit || !items) return [];
  const thumbs: string[] = [];
  for (const { key, field } of WEEK_PLAN_CORE_SLOTS) {
    const value = outfit[field];
    if (typeof value !== 'string' || !value.trim()) continue;
    const image = items[key]?.[0]?.image_data;
    if (image) thumbs.push(image);
  }
  return thumbs.slice(0, 3);
}

export function getWeekDayStatus(
  day: WeekPlanDay,
  options?: { generating?: boolean; edited?: boolean }
): WeekDayStatus {
  if (options?.generating && day.enabled) return 'generating';
  if (!day.enabled) return 'not_planned';
  if (!day.outfit) return 'needs_outfit';
  if (getMissingOutfitSlots(day.outfit).length > 0) return 'needs_outfit';
  if (options?.edited) return 'edited';
  return 'ready';
}

export function formatOccasionLabel(occasion: string | null | undefined): string {
  if (!occasion) return '';
  return occasion.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatStyleLabel(style: string | null | undefined): string {
  const raw = style?.trim() || DEFAULT_DAY_STYLE;
  return formatOccasionLabel(raw);
}

/** Secondary line for week overview day cards when the day is planned. */
export function formatDayOccasionStyleLine(
  occasion: string | null | undefined,
  style: string | null | undefined
): string {
  const occasionLabel = formatOccasionLabel(occasion) || 'Everyday';
  return `${occasionLabel} · ${formatStyleLabel(style)}`;
}

/** Monday–Sunday date range label for the current week in a timezone. */
export function formatWeekDateRange(
  referenceDate: Date = new Date(),
  timeZone?: string
): string {
  const tz = timeZone || getDeviceTimezone();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(referenceDate);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const weekdayIndex: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const dow = weekdayIndex[weekday] ?? 0;
  // Build local calendar date at noon to avoid DST edge cases
  const localNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const monday = new Date(localNoon);
  monday.setUTCDate(localNoon.getUTCDate() - dow);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${fmt.format(monday)} – ${fmt.format(sunday)}`;
}

/** Human-readable localized datetime, e.g. "25 Jul 2026, 4:49 PM". */
export function formatLocalizedDateTime(
  iso: string | null | undefined,
  timeZone?: string
): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/** Short time for document state, e.g. "4:49 PM". */
export function formatLocalizedTime(
  date: Date | null | undefined,
  timeZone?: string
): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

export const DEFAULT_REMINDER_TIME = '07:30';
export const DEFAULT_SHARED_STYLE = 'classic'; // legacy plan field; prefer per-day style
export const DEFAULT_DAY_STYLE = 'classic';
export const DEFAULT_SHARED_SEASON = 'all-season';
export const DEFAULT_OCCASION = 'everyday';

export interface WeekPlanOutfit {
  summary: string;
  generated_at?: string | null;
  ai_prompt?: string | null;
  ai_raw_response?: string | null;
  cost?: OutfitCost | null;
  shirt: string;
  trouser: string;
  blazer: string;
  shoes: string;
  belt: string;
  reasoning: string;
  sweater?: string | null;
  outerwear?: string | null;
  tie?: string | null;
  shirt_id?: number | null;
  trouser_id?: number | null;
  blazer_id?: number | null;
  shoes_id?: number | null;
  belt_id?: number | null;
  sweater_id?: number | null;
  outerwear_id?: number | null;
  tie_id?: number | null;
  matching_wardrobe_items?: MatchingWardrobeItems | null;
  model_image?: string | null;
  wardrobe_item_ids?: number[];
}

export interface WeekPlanDay {
  day_of_week: number;
  enabled: boolean;
  occasion: string;
  /** Per-day style (season stays shared on the plan). */
  style: string;
  /** When true (default), generate uses wardrobe only for this day. */
  use_wardrobe_only: boolean;
  outfit?: WeekPlanOutfit | null;
}

export interface WeekPlan {
  reminder_time: string;
  timezone: string;
  /** Legacy; UI uses per-day style. Kept for API compatibility. */
  shared_style: string;
  shared_season: string;
  days: WeekPlanDay[];
  wardrobe_empty?: boolean;
  message?: string | null;
}

export interface WeekPlanUpsertRequest {
  reminder_time: string;
  timezone: string;
  shared_style: string;
  shared_season: string;
  days: Array<{
    day_of_week: number;
    enabled: boolean;
    occasion: string;
    style: string;
    use_wardrobe_only: boolean;
  }>;
}

export interface WeekPlanGenerateRequest {
  day_of_week?: number;
}

export interface WeekPlanToday {
  day_of_week: number;
  enabled: boolean;
  occasion?: string | null;
  style?: string | null;
  use_wardrobe_only?: boolean;
  outfit?: WeekPlanOutfit | null;
  reminder_time: string;
  timezone: string;
  has_plan: boolean;
  message?: string | null;
}

/** Snapshot summary from GET /api/week-plan/history */
export interface WeekPlanHistoryItem {
  id: number;
  label: string;
  created_at: string;
  enabled_day_count: number;
}

export interface WeekPlanHistoryListResponse {
  items: WeekPlanHistoryItem[];
}

/** Config-only snapshot for named week configurations (presets). */
export interface WeekPlanPresetConfigDay {
  day_of_week: number;
  enabled: boolean;
  occasion: string;
  style: string;
  use_wardrobe_only: boolean;
}

export interface WeekPlanPresetConfig {
  reminder_time: string;
  shared_season: string;
  days: WeekPlanPresetConfigDay[];
}

export interface WeekPlanPresetItem {
  id: number;
  name: string;
  config: WeekPlanPresetConfig;
  created_at: string;
  updated_at: string;
}

export type WeekPlanPresetLimitSource = 'override' | 'tier' | 'default';

export interface WeekPlanPresetListResponse {
  items: WeekPlanPresetItem[];
  count: number;
  limit: number;
  limit_source?: WeekPlanPresetLimitSource;
}

export interface WeekPlanPresetCreateRequest {
  name: string;
  config: WeekPlanPresetConfig;
}

export interface WeekPlanPresetUpdateRequest {
  name?: string;
  config?: WeekPlanPresetConfig;
}

export interface WeekPlanPresetLimitPatchRequest {
  limit: number | null;
}

export interface WeekPlanPresetLimitPatchResponse {
  user_id: number;
  week_plan_preset_limit_override: number | null;
  effective_limit: number;
  limit_source: string;
}

export const WEEK_PLAN_PRESET_NAME_MAX = 40;

/** Extract config-only payload from the current editable plan. */
export function planToPresetConfig(plan: WeekPlan): WeekPlanPresetConfig {
  return {
    reminder_time: plan.reminder_time,
    shared_season: plan.shared_season,
    days: plan.days.map(
      ({ day_of_week, enabled, occasion, style, use_wardrobe_only }) => ({
        day_of_week,
        enabled,
        occasion,
        style: style || DEFAULT_DAY_STYLE,
        use_wardrobe_only: use_wardrobe_only ?? true,
      })
    ),
  };
}

export function countEnabledDaysInPresetConfig(config: WeekPlanPresetConfig): number {
  return config.days.filter((d) => d.enabled).length;
}

export function planHasGeneratedOutfits(plan: WeekPlan): boolean {
  return plan.days.some((d) => d.outfit != null);
}

/** Build a blank Mon–Sun plan for local editing before the first save. */
export function createEmptyWeekPlan(timezone?: string): WeekPlan {
  return {
    reminder_time: DEFAULT_REMINDER_TIME,
    timezone: timezone || 'UTC',
    shared_style: DEFAULT_SHARED_STYLE,
    shared_season: DEFAULT_SHARED_SEASON,
    days: Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      enabled: false,
      occasion: DEFAULT_OCCASION,
      style: DEFAULT_DAY_STYLE,
      use_wardrobe_only: true,
      outfit: null,
    })),
    wardrobe_empty: false,
    message: null,
  };
}

/** Ensure all seven days exist (API may omit disabled days). */
export function normalizeWeekPlanDays(plan: WeekPlan): WeekPlan {
  const byDay = new Map(plan.days.map((d) => [d.day_of_week, d]));
  const days: WeekPlanDay[] = Array.from({ length: 7 }, (_, i) => {
    const existing = byDay.get(i);
    if (existing) {
      return {
        ...existing,
        style: existing.style || DEFAULT_DAY_STYLE,
        use_wardrobe_only: existing.use_wardrobe_only ?? true,
      };
    }
    return {
      day_of_week: i,
      enabled: false,
      occasion: DEFAULT_OCCASION,
      style: DEFAULT_DAY_STYLE,
      use_wardrobe_only: true,
      outfit: null,
    };
  });
  return { ...plan, days };
}

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function toUpsertPayload(plan: WeekPlan): WeekPlanUpsertRequest {
  return {
    reminder_time: plan.reminder_time,
    timezone: plan.timezone,
    shared_style: plan.shared_style,
    shared_season: plan.shared_season,
    days: plan.days.map(
      ({ day_of_week, enabled, occasion, style, use_wardrobe_only }) => ({
        day_of_week,
        enabled,
        occasion,
        style: style || DEFAULT_DAY_STYLE,
        use_wardrobe_only: use_wardrobe_only ?? true,
      })
    ),
  };
}
