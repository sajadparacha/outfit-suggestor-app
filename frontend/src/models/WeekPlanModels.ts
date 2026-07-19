/**
 * Week Outfit Planner DTOs — match backend `/api/week-plan` schemas.
 */

import { MatchingWardrobeItems } from './OutfitModels';

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

export const DEFAULT_REMINDER_TIME = '07:30';
export const DEFAULT_SHARED_STYLE = 'classic'; // legacy plan field; prefer per-day style
export const DEFAULT_DAY_STYLE = 'classic';
export const DEFAULT_SHARED_SEASON = 'all-season';
export const DEFAULT_OCCASION = 'everyday';

export interface WeekPlanOutfit {
  summary: string;
  generated_at?: string | null;
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
