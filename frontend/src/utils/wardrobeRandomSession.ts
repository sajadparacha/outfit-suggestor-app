/**
 * Session variety for Random from Wardrobe — keep in sync with WardrobeRandomSession.swift
 */

import { OutfitResponse, OutfitSuggestion } from '../models/OutfitModels';

export const RECENT_WARDROBE_RANDOM_COUNT = 5;
export const WARDROBE_RANDOM_MAX_RETRIES = 3;

const WARDROBE_ID_FIELDS = [
  'shirt_id',
  'trouser_id',
  'blazer_id',
  'shoes_id',
  'belt_id',
  'sweater_id',
  'outerwear_id',
  'tie_id',
] as const;

const MATCHING_CATEGORIES = [
  'shirt',
  'trouser',
  'blazer',
  'shoes',
  'belt',
  'sweater',
  'outerwear',
  'tie',
] as const;

function normalizeField(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function wardrobeIdsFromSuggestion(s: OutfitSuggestion | OutfitResponse): number[] {
  const ids: number[] = [];

  for (const field of WARDROBE_ID_FIELDS) {
    const id = s[field];
    if (id != null) {
      ids.push(id);
    }
  }

  const matching = s.matching_wardrobe_items;
  if (matching) {
    for (const category of MATCHING_CATEGORIES) {
      const items = matching[category];
      const firstId = items?.[0]?.id;
      if (firstId != null && !ids.includes(firstId)) {
        ids.push(firstId);
      }
    }
  }

  return ids;
}

/** Normalized fingerprint for dedupe: core text fields + optional layers + wardrobe IDs when set. */
export function suggestionFingerprint(s: OutfitSuggestion | OutfitResponse): string {
  const parts = [
    normalizeField(s.shirt),
    normalizeField(s.trouser),
    normalizeField(s.blazer),
    normalizeField(s.shoes),
    normalizeField(s.belt),
  ];

  if (s.sweater != null && s.sweater !== '') {
    parts.push(normalizeField(s.sweater));
  }
  if (s.outerwear != null && s.outerwear !== '') {
    parts.push(normalizeField(s.outerwear));
  }
  if (s.tie != null && s.tie !== '') {
    parts.push(normalizeField(s.tie));
  }

  for (const id of wardrobeIdsFromSuggestion(s)) {
    parts.push(String(id));
  }

  return parts.join('|');
}

export interface WardrobeVarietyContext {
  previousOutfitText?: string;
  avoidOutfitTexts?: string[];
}

export class WardrobeRandomSession {
  private recentFingerprints: string[] = [];
  private recentTexts: string[] = [];

  reset(): void {
    this.recentFingerprints = [];
    this.recentTexts = [];
  }

  recordFingerprint(fingerprint: string, formattedText: string): void {
    this.recentFingerprints = [
      fingerprint,
      ...this.recentFingerprints.filter((entry) => entry !== fingerprint),
    ].slice(0, RECENT_WARDROBE_RANDOM_COUNT);
    this.recentTexts = [
      formattedText,
      ...this.recentTexts.filter((entry) => entry !== formattedText),
    ].slice(0, RECENT_WARDROBE_RANDOM_COUNT);
  }

  recordSuggestion(s: OutfitSuggestion | OutfitResponse, formatFn: (s: OutfitSuggestion) => string): void {
    const asSuggestion = s as OutfitSuggestion;
    this.recordFingerprint(suggestionFingerprint(s), formatFn(asSuggestion));
  }

  isRecentDuplicate(fingerprint: string): boolean {
    return this.recentFingerprints.includes(fingerprint);
  }

  avoidTextsForPrompt(_formatFn: (s: OutfitSuggestion) => string): string[] {
    return [...this.recentTexts];
  }
}

/**
 * Build API variety fields for wardrobe-random requests.
 * @param retryAttempt 0 on first try; higher values add stronger avoid context on duplicate retries.
 */
export function buildVarietyContext(
  currentSuggestion: OutfitSuggestion | null,
  session: WardrobeRandomSession,
  formatFn: (s: OutfitSuggestion) => string,
  retryAttempt: number = 0,
  duplicateResponse?: OutfitResponse | null
): WardrobeVarietyContext {
  const context: WardrobeVarietyContext = {};
  const avoidTexts = session.avoidTextsForPrompt(formatFn);

  if (avoidTexts.length > 0) {
    context.avoidOutfitTexts = [...avoidTexts];
  }

  if (currentSuggestion) {
    context.previousOutfitText = formatFn(currentSuggestion);
  }

  if (retryAttempt > 0) {
    const strongerAvoid = [...(context.avoidOutfitTexts ?? [])];
    if (currentSuggestion) {
      const currentText = formatFn(currentSuggestion);
      if (!strongerAvoid.includes(currentText)) {
        strongerAvoid.push(currentText);
      }
    }
    if (duplicateResponse) {
      const dupText = formatFn(duplicateResponse as OutfitSuggestion);
      if (!strongerAvoid.includes(dupText)) {
        strongerAvoid.push(dupText);
      }
      context.previousOutfitText = dupText;
    }
    if (strongerAvoid.length > 0) {
      context.avoidOutfitTexts = strongerAvoid;
    }
  }

  return context;
}

export function shouldRetryWardrobeRandom(
  response: OutfitResponse,
  session: WardrobeRandomSession,
  attempt: number
): boolean {
  return attempt < WARDROBE_RANDOM_MAX_RETRIES && session.isRecentDuplicate(suggestionFingerprint(response));
}
