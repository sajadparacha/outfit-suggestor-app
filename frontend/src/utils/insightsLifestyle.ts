/**
 * Insights lifestyle preferences — defaults, chip rules, request builder.
 * Mapping matches backend/services/wardrobe_gap_context.py.
 */

import {
  INSIGHTS_CLIMATE_OPTIONS,
  INSIGHTS_DRESS_CODE_OPTIONS,
  INSIGHTS_LIFESTYLE_OPTIONS,
  INSIGHTS_STYLE_ACCENT_OPTIONS,
  INSIGHTS_STYLE_PRIMARY_OPTIONS,
} from './constants';

export const MAX_LIFESTYLE_MIX = 3;
export const INSIGHTS_LIFESTYLE_STORAGE_KEY = 'insights_lifestyle_preferences';

export type InsightsLifestyleValue = 'work' | 'everyday' | 'social' | 'formal' | 'sport';
export type InsightsDressCode = 'casual' | 'smart-casual' | 'business-professional' | 'formal';
export type InsightsClimate = 'hot' | 'temperate' | 'cold';
export type InsightsStylePrimary =
  | 'classic'
  | 'smart-casual'
  | 'preppy'
  | 'minimal'
  | 'elegant'
  | 'streetwear'
  | 'sporty';
export type InsightsStyleAccent = 'vintage' | 'edgy' | 'sporty' | 'preppy';

export interface InsightsLifestyleState {
  lifestyleMix: InsightsLifestyleValue[];
  primaryLifestyle: InsightsLifestyleValue;
  dressCodes: InsightsDressCode[];
  climates: InsightsClimate[];
  stylePrimaries: InsightsStylePrimary[];
  styleAccents: InsightsStyleAccent[];
  eventFocus: string | null;
}

/** Old localStorage shape used scalars for dress/climate/style. */
type InsightsLifestyleRaw = Partial<InsightsLifestyleState> & {
  dressCode?: unknown;
  climate?: unknown;
  stylePrimary?: unknown;
  styleAccent?: unknown;
};

const LIFESTYLE_VALUES = INSIGHTS_LIFESTYLE_OPTIONS.map((opt) => opt.value);
const DRESS_CODES = INSIGHTS_DRESS_CODE_OPTIONS.map((opt) => opt.value);
const CLIMATES = INSIGHTS_CLIMATE_OPTIONS.map((opt) => opt.value);
const STYLE_PRIMARIES = INSIGHTS_STYLE_PRIMARY_OPTIONS.map((opt) => opt.value);
const STYLE_ACCENTS = INSIGHTS_STYLE_ACCENT_OPTIONS.map((opt) => opt.value);

const LIFESTYLE_LABELS: Record<string, string> = Object.fromEntries(
  INSIGHTS_LIFESTYLE_OPTIONS.map((opt) => [opt.value, opt.label])
);
const CLIMATE_LABELS: Record<string, string> = Object.fromEntries(
  INSIGHTS_CLIMATE_OPTIONS.map((opt) => [opt.value, opt.label])
);
const STYLE_LABELS: Record<string, string> = {
  ...Object.fromEntries(INSIGHTS_STYLE_PRIMARY_OPTIONS.map((opt) => [opt.value, opt.label])),
  ...Object.fromEntries(INSIGHTS_STYLE_ACCENT_OPTIONS.map((opt) => [opt.value, opt.label])),
};

const OCCASION_FROM_LIFESTYLE: Record<InsightsLifestyleValue, string> = {
  work: 'work',
  everyday: 'everyday',
  social: 'dinner-night-out',
  formal: 'formal-event',
  sport: 'workout',
};

export const DEFAULT_INSIGHTS_LIFESTYLE: InsightsLifestyleState = {
  lifestyleMix: ['work', 'everyday'],
  primaryLifestyle: 'work',
  dressCodes: ['smart-casual'],
  climates: [],
  stylePrimaries: ['classic'],
  styleAccents: [],
  eventFocus: null,
};

function cloneDefaults(): InsightsLifestyleState {
  return {
    ...DEFAULT_INSIGHTS_LIFESTYLE,
    lifestyleMix: [...DEFAULT_INSIGHTS_LIFESTYLE.lifestyleMix],
    dressCodes: [...DEFAULT_INSIGHTS_LIFESTYLE.dressCodes],
    climates: [...DEFAULT_INSIGHTS_LIFESTYLE.climates],
    stylePrimaries: [...DEFAULT_INSIGHTS_LIFESTYLE.stylePrimaries],
    styleAccents: [...DEFAULT_INSIGHTS_LIFESTYLE.styleAccents],
  };
}

function clean(value: string | null | undefined): string | null {
  if (value == null) return null;
  const text = String(value).trim().toLowerCase();
  return text || null;
}

function isLifestyleValue(value: string): value is InsightsLifestyleValue {
  return (LIFESTYLE_VALUES as string[]).includes(value);
}

function isDressCode(value: string): value is InsightsDressCode {
  return (DRESS_CODES as string[]).includes(value);
}

function isClimate(value: string): value is InsightsClimate {
  return (CLIMATES as string[]).includes(value);
}

function isStylePrimary(value: string): value is InsightsStylePrimary {
  return (STYLE_PRIMARIES as string[]).includes(value);
}

function isStyleAccent(value: string): value is InsightsStyleAccent {
  return (STYLE_ACCENTS as string[]).includes(value);
}

function listFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    const cleaned: string[] = [];
    for (const item of value) {
      const text = clean(item == null ? null : String(item));
      if (text && !cleaned.includes(text)) cleaned.push(text);
    }
    return cleaned;
  }
  const text = clean(value == null ? null : String(value));
  return text ? [text] : [];
}

function pickList(arrayField: unknown, scalarField: unknown): string[] {
  if (Array.isArray(arrayField)) return listFromUnknown(arrayField);
  if (arrayField != null && arrayField !== '') return listFromUnknown(arrayField);
  return listFromUnknown(scalarField);
}

export function lifestyleLabel(value: string): string {
  return LIFESTYLE_LABELS[value] || value;
}

export function dressCodeLabel(value: string): string {
  const match = INSIGHTS_DRESS_CODE_OPTIONS.find((opt) => opt.value === value);
  return match?.label || value;
}

export function normalizeLifestyleMix(
  mix: readonly string[] | null | undefined,
  primary?: string | null
): InsightsLifestyleValue[] {
  const cleaned: InsightsLifestyleValue[] = [];
  for (const item of mix || []) {
    const value = clean(item);
    if (value && isLifestyleValue(value) && !cleaned.includes(value)) {
      cleaned.push(value);
    }
    if (cleaned.length === MAX_LIFESTYLE_MIX) break;
  }

  const primaryValue = clean(primary);
  if (primaryValue && isLifestyleValue(primaryValue)) {
    if (cleaned.includes(primaryValue)) {
      return [primaryValue, ...cleaned.filter((item) => item !== primaryValue)];
    }
    if (cleaned.length < MAX_LIFESTYLE_MIX) {
      return [primaryValue, ...cleaned];
    }
    if (cleaned.length) {
      const next = [...cleaned];
      next[0] = primaryValue;
      return next;
    }
  }

  return cleaned;
}

/** Chip tap rules: max 3, at least 1, one primary. */
export function toggleLifestyleChip(
  mix: readonly InsightsLifestyleValue[],
  primary: InsightsLifestyleValue,
  tapped: InsightsLifestyleValue
): { mix: InsightsLifestyleValue[]; primary: InsightsLifestyleValue } {
  const selected = mix.includes(tapped);

  if (!selected) {
    if (mix.length >= MAX_LIFESTYLE_MIX) {
      return { mix: [...mix], primary };
    }
    return { mix: [...mix, tapped], primary };
  }

  if (tapped !== primary) {
    return { mix: [...mix], primary: tapped };
  }

  if (mix.length <= 1) {
    return { mix: [...mix], primary };
  }

  const nextMix = mix.filter((item) => item !== tapped);
  return { mix: nextMix, primary: nextMix[0] };
}

/** Multi-select; at least one. Tapping the last selected code is a no-op. */
export function toggleDressCodeChip(
  selected: readonly InsightsDressCode[],
  tapped: InsightsDressCode
): InsightsDressCode[] {
  if (!selected.includes(tapped)) {
    return [...selected, tapped];
  }
  if (selected.length <= 1) {
    return [...selected];
  }
  return selected.filter((item) => item !== tapped);
}

/** Climate chips only (Year-round is always on in the UI). Tap selected to deselect. */
export function toggleClimateChip(
  selected: readonly InsightsClimate[],
  tapped: InsightsClimate
): InsightsClimate[] {
  if (!selected.includes(tapped)) {
    return [...selected, tapped];
  }
  return selected.filter((item) => item !== tapped);
}

/**
 * Same tap rules as lifestyle mix, no max: add; tap non-primary to make primary ([0]);
 * tap primary deselects only if another remains.
 */
export function toggleStylePrimaryChip(
  selected: readonly InsightsStylePrimary[],
  tapped: InsightsStylePrimary
): InsightsStylePrimary[] {
  const isSelected = selected.includes(tapped);
  const primary = selected[0];

  if (!isSelected) {
    return [...selected, tapped];
  }

  if (tapped !== primary) {
    return [tapped, ...selected.filter((item) => item !== tapped)];
  }

  if (selected.length <= 1) {
    return [...selected];
  }

  return selected.filter((item) => item !== tapped);
}

/** Multi-select accents. Empty list is None. */
export function toggleStyleAccentChip(
  selected: readonly InsightsStyleAccent[],
  tapped: InsightsStyleAccent
): InsightsStyleAccent[] {
  if (!selected.includes(tapped)) {
    return [...selected, tapped];
  }
  return selected.filter((item) => item !== tapped);
}

export function canonicalOccasion(primary: string, dressCodes: readonly string[]): string {
  const hasBusinessCode = dressCodes.some(
    (code) => code === 'business-professional' || code === 'formal'
  );
  if (primary === 'work' && hasBusinessCode) {
    return 'business';
  }
  return OCCASION_FROM_LIFESTYLE[primary as InsightsLifestyleValue] || 'work';
}

export function canonicalSeason(climates: readonly string[]): string {
  if (climates.length === 1 && climates[0] === 'hot') return 'summer';
  if (climates.length === 1 && climates[0] === 'cold') return 'winter';
  return 'all-season';
}

export function canonicalStyle(stylePrimaries: readonly string[]): string {
  return stylePrimaries[0] || 'classic';
}

export function displayOccasion(mix: readonly string[]): string {
  const labels = mix.map((item) => LIFESTYLE_LABELS[item] || item);
  return labels.length ? labels.join(' + ') : 'Everyday';
}

export function displaySeason(climates: readonly string[]): string {
  const labels = climates.map((item) => CLIMATE_LABELS[item] || item).filter(Boolean);
  if (labels.length) {
    return `Year-round / ${labels.join(' + ')}`;
  }
  return 'Year-round';
}

export function displayStyle(
  stylePrimaries: readonly string[],
  styleAccents: readonly string[] = []
): string {
  const primaryLabels = stylePrimaries.map((item) => STYLE_LABELS[item] || item);
  const primaryText = primaryLabels.length ? primaryLabels.join(' + ') : 'Classic';
  const accentLabels = styleAccents
    .filter((item) => STYLE_ACCENTS.includes(item as InsightsStyleAccent))
    .map((item) => STYLE_LABELS[item] || item);
  if (accentLabels.length) {
    return `${primaryText} with ${accentLabels.join(' + ')} accent`;
  }
  return primaryText;
}

export function sanitizeInsightsLifestyle(
  raw: InsightsLifestyleRaw | null | undefined
): InsightsLifestyleState {
  const mix = normalizeLifestyleMix(raw?.lifestyleMix, raw?.primaryLifestyle);
  const resolvedMix = mix.length ? mix : [...DEFAULT_INSIGHTS_LIFESTYLE.lifestyleMix];

  const dressResolved = pickList(raw?.dressCodes, raw?.dressCode).filter(isDressCode);
  const dressCodes = dressResolved.length
    ? dressResolved
    : [...DEFAULT_INSIGHTS_LIFESTYLE.dressCodes];

  const climates = pickList(raw?.climates, raw?.climate).filter(isClimate);

  const styleResolved = pickList(raw?.stylePrimaries, raw?.stylePrimary).filter(isStylePrimary);
  const stylePrimaries = styleResolved.length
    ? styleResolved
    : [...DEFAULT_INSIGHTS_LIFESTYLE.stylePrimaries];

  const styleAccents = pickList(raw?.styleAccents, raw?.styleAccent).filter(isStyleAccent);
  const event = clean(raw?.eventFocus ?? null);

  return {
    lifestyleMix: resolvedMix,
    primaryLifestyle: resolvedMix[0],
    dressCodes,
    climates,
    stylePrimaries,
    styleAccents,
    eventFocus: event,
  };
}

export function loadInsightsLifestyle(): InsightsLifestyleState {
  try {
    const stored = localStorage.getItem(INSIGHTS_LIFESTYLE_STORAGE_KEY);
    if (!stored) return cloneDefaults();
    return sanitizeInsightsLifestyle(JSON.parse(stored) as InsightsLifestyleRaw);
  } catch {
    return cloneDefaults();
  }
}

export function saveInsightsLifestyle(state: InsightsLifestyleState): void {
  const sanitized = sanitizeInsightsLifestyle(state);
  localStorage.setItem(INSIGHTS_LIFESTYLE_STORAGE_KEY, JSON.stringify(sanitized));
}

export function resetInsightsLifestyle(): InsightsLifestyleState {
  const defaults = cloneDefaults();
  saveInsightsLifestyle(defaults);
  return defaults;
}

export function buildInsightsAnalyzePayload(
  state: InsightsLifestyleState,
  textInput: string
) {
  const sanitized = sanitizeInsightsLifestyle(state);
  const mix = sanitized.lifestyleMix;
  const primary = sanitized.primaryLifestyle;
  const occasion = canonicalOccasion(primary, sanitized.dressCodes);
  const season = canonicalSeason(sanitized.climates);
  const style = canonicalStyle(sanitized.stylePrimaries);

  return {
    occasion,
    season,
    style,
    text_input: textInput,
    lifestyle_mix: mix,
    primary_lifestyle: primary,
    dress_code: sanitized.dressCodes,
    climate: sanitized.climates,
    style_primary: sanitized.stylePrimaries,
    style_accent: sanitized.styleAccents,
    event_focus: sanitized.eventFocus,
  };
}
