/**
 * Diverse random-from-history selection — keep in sync with RandomHistorySelection.swift
 */

import { OutfitHistoryEntry } from '../models/OutfitModels';

export const RECENT_RANDOM_HISTORY_COUNT = 5;

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

function normalizeField(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/** Normalized fingerprint for dedupe: core text fields + optional layers + wardrobe IDs when set. */
export function outfitFingerprint(entry: OutfitHistoryEntry): string {
  const parts = [
    normalizeField(entry.shirt),
    normalizeField(entry.trouser),
    normalizeField(entry.blazer),
    normalizeField(entry.shoes),
    normalizeField(entry.belt),
  ];

  if (entry.sweater != null && entry.sweater !== '') {
    parts.push(normalizeField(entry.sweater));
  }
  if (entry.outerwear != null && entry.outerwear !== '') {
    parts.push(normalizeField(entry.outerwear));
  }
  if (entry.tie != null && entry.tie !== '') {
    parts.push(normalizeField(entry.tie));
  }

  for (const field of WARDROBE_ID_FIELDS) {
    const id = entry[field];
    if (id != null) {
      parts.push(String(id));
    }
  }

  return parts.join('|');
}

/** Keep one entry per fingerprint — most recent created_at, tie-break highest id. */
export function dedupeHistoryByFingerprint(entries: OutfitHistoryEntry[]): OutfitHistoryEntry[] {
  const byFingerprint = new Map<string, OutfitHistoryEntry>();

  for (const entry of entries) {
    const fingerprint = outfitFingerprint(entry);
    const existing = byFingerprint.get(fingerprint);
    if (!existing) {
      byFingerprint.set(fingerprint, entry);
      continue;
    }

    const existingTime = new Date(existing.created_at).getTime();
    const entryTime = new Date(entry.created_at).getTime();
    if (
      entryTime > existingTime ||
      (entryTime === existingTime && entry.id > existing.id)
    ) {
      byFingerprint.set(fingerprint, entry);
    }
  }

  return Array.from(byFingerprint.values());
}

export function shuffleIds(ids: number[], rng: () => number = Math.random): number[] {
  const deck = [...ids];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export class RandomHistorySession {
  deck: number[] = [];
  recentPicks: number[] = [];
  hasShownSingleLookToast = false;

  reset(): void {
    this.deck = [];
    this.recentPicks = [];
    this.hasShownSingleLookToast = false;
  }

  recordPick(id: number): void {
    this.recentPicks = [id, ...this.recentPicks.filter((pick) => pick !== id)].slice(
      0,
      RECENT_RANDOM_HISTORY_COUNT
    );
  }
}

export interface PickRandomHistoryOptions {
  currentHistoryId?: number | null;
  session: RandomHistorySession;
  rng?: () => number;
}

export interface PickRandomHistoryResult {
  entry: OutfitHistoryEntry | null;
  showSingleLookToast: boolean;
}

function filterCandidateIds(
  deduped: OutfitHistoryEntry[],
  currentHistoryId: number | null | undefined,
  recentPicks: number[],
  excludeCurrent: boolean,
  excludeRecent: boolean
): number[] {
  return deduped
    .map((entry) => entry.id)
    .filter((id) => {
      if (excludeCurrent && currentHistoryId != null && id === currentHistoryId) {
        return false;
      }
      if (excludeRecent && recentPicks.includes(id)) {
        return false;
      }
      return true;
    });
}

export function pickRandomHistoryEntry(
  entries: OutfitHistoryEntry[],
  options: PickRandomHistoryOptions
): PickRandomHistoryResult {
  const { currentHistoryId, session } = options;
  const rng = options.rng ?? Math.random;

  if (entries.length === 0) {
    return { entry: null, showSingleLookToast: false };
  }

  const deduped = dedupeHistoryByFingerprint(entries);
  const dedupedById = new Map(deduped.map((entry) => [entry.id, entry]));

  const showSingleLookToast = deduped.length === 1 && !session.hasShownSingleLookToast;
  if (showSingleLookToast) {
    session.hasShownSingleLookToast = true;
  }

  let candidateIds = filterCandidateIds(deduped, currentHistoryId, session.recentPicks, true, true);
  if (candidateIds.length === 0) {
    candidateIds = filterCandidateIds(deduped, currentHistoryId, session.recentPicks, true, false);
  }
  if (candidateIds.length === 0) {
    candidateIds = filterCandidateIds(deduped, currentHistoryId, session.recentPicks, false, false);
  }

  const candidateSet = new Set(candidateIds);
  session.deck = session.deck.filter((id) => candidateSet.has(id));

  if (session.deck.length === 0 && candidateIds.length > 0) {
    session.deck = shuffleIds(candidateIds, rng);
  }

  let pickedId: number | null = null;
  if (session.deck.length > 0) {
    pickedId = session.deck.pop() ?? null;
  } else if (candidateIds.length > 0) {
    pickedId = candidateIds[Math.floor(rng() * candidateIds.length)] ?? null;
  } else if (deduped.length > 0) {
    pickedId = deduped[0]?.id ?? null;
  }

  if (pickedId == null) {
    return { entry: null, showSingleLookToast };
  }

  session.recordPick(pickedId);
  const entry = dedupedById.get(pickedId) ?? entries.find((item) => item.id === pickedId) ?? null;
  return { entry, showSingleLookToast };
}
