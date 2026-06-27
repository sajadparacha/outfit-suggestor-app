import { Filters } from '../models/OutfitModels';
import { FILTER_OPTIONS } from './constants';

export const DEFAULT_FILTERS: Filters = {
  occasion: 'everyday',
  season: 'all-season',
  style: 'classic',
};

const STORAGE_KEYS = {
  filters: 'outfit_filters',
  preferenceText: 'outfit_preference_text',
} as const;

const validFilterValues = {
  occasion: new Set(FILTER_OPTIONS.occasions.map((option) => option.value)),
  season: new Set(FILTER_OPTIONS.seasons.map((option) => option.value)),
  style: new Set(FILTER_OPTIONS.styles.map((option) => option.value)),
};

function resolveFilterValue(key: keyof Filters, value: unknown): string {
  if (typeof value === 'string' && validFilterValues[key].has(value)) {
    return value;
  }
  return DEFAULT_FILTERS[key];
}

export function resolveFilters(filters: Filters): Filters {
  return {
    occasion: resolveFilterValue('occasion', filters.occasion),
    season: resolveFilterValue('season', filters.season),
    style: resolveFilterValue('style', filters.style),
  };
}

export function buildSuggestionPrompt(filters: Filters, preferenceText: string): string {
  const resolved = resolveFilters(filters);
  const trimmed = preferenceText.trim();
  if (trimmed.length > 0) {
    return `User preferences (free-text): ${trimmed}`;
  }
  return `Occasion: ${resolved.occasion}, Season: ${resolved.season}, Style: ${resolved.style}`;
}

export function loadStoredFilters(): Filters {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.filters);
    if (!raw) return { ...DEFAULT_FILTERS };
    const parsed = JSON.parse(raw) as Partial<Filters>;
    return {
      occasion: resolveFilterValue('occasion', parsed.occasion),
      season: resolveFilterValue('season', parsed.season),
      style: resolveFilterValue('style', parsed.style),
    };
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

export function loadStoredPreferenceText(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.preferenceText) || '';
  } catch {
    return '';
  }
}

export function persistOutfitPreferences(filters: Filters, preferenceText: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(filters));
    localStorage.setItem(STORAGE_KEYS.preferenceText, preferenceText);
  } catch {
    // Ignore quota / private browsing errors
  }
}
