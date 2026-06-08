import { Filters } from '../models/OutfitModels';

export const DEFAULT_FILTERS: Filters = {
  occasion: 'casual',
  season: 'all',
  style: 'modern',
};

const STORAGE_KEYS = {
  filters: 'outfit_filters',
  preferenceText: 'outfit_preference_text',
} as const;

export function resolveFilters(filters: Filters): Filters {
  return {
    occasion: filters.occasion || DEFAULT_FILTERS.occasion,
    season: filters.season || DEFAULT_FILTERS.season,
    style: filters.style || DEFAULT_FILTERS.style,
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
      occasion: typeof parsed.occasion === 'string' ? parsed.occasion : DEFAULT_FILTERS.occasion,
      season: typeof parsed.season === 'string' ? parsed.season : DEFAULT_FILTERS.season,
      style: typeof parsed.style === 'string' ? parsed.style : DEFAULT_FILTERS.style,
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
