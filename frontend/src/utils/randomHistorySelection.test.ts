import { OutfitHistoryEntry } from '../models/OutfitModels';
import {
  RECENT_RANDOM_HISTORY_COUNT,
  RandomHistorySession,
  dedupeHistoryByFingerprint,
  outfitFingerprint,
  pickRandomHistoryEntry,
} from './randomHistorySelection';

function makeEntry(overrides: Partial<OutfitHistoryEntry> & { id: number }): OutfitHistoryEntry {
  return {
    created_at: '2024-01-01T00:00:00Z',
    text_input: '',
    image_data: null,
    model_image: null,
    shirt: 'White shirt',
    trouser: 'Blue jeans',
    blazer: 'No blazer',
    shoes: 'Sneakers',
    belt: 'Brown belt',
    reasoning: 'Test look',
    ...overrides,
  };
}

describe('outfitFingerprint', () => {
  it('normalizes core text fields to lowercase trimmed fingerprint', () => {
    const entry = makeEntry({
      id: 1,
      shirt: '  White Shirt ',
      trouser: 'Blue Jeans',
    });
    expect(outfitFingerprint(entry)).toBe(
      'white shirt|blue jeans|no blazer|sneakers|brown belt'
    );
  });

  it('includes optional layer fields and wardrobe ids when set', () => {
    const entry = makeEntry({
      id: 2,
      sweater: 'Navy sweater',
      outerwear: 'Wool coat',
      tie: 'Silk tie',
      shirt_id: 10,
      shoes_id: 20,
    });
    expect(outfitFingerprint(entry)).toContain('navy sweater');
    expect(outfitFingerprint(entry)).toContain('wool coat');
    expect(outfitFingerprint(entry)).toContain('silk tie');
    expect(outfitFingerprint(entry)).toContain('10');
    expect(outfitFingerprint(entry)).toContain('20');
  });
});

describe('dedupeHistoryByFingerprint', () => {
  it('keeps the most recent entry per fingerprint', () => {
    const older = makeEntry({
      id: 1,
      created_at: '2024-01-01T00:00:00Z',
      shirt: 'Same shirt',
    });
    const newer = makeEntry({
      id: 2,
      created_at: '2024-06-01T00:00:00Z',
      shirt: 'Same shirt',
      reasoning: 'Newer duplicate',
    });
    const different = makeEntry({
      id: 3,
      shirt: 'Different shirt',
    });

    const deduped = dedupeHistoryByFingerprint([older, newer, different]);
    expect(deduped).toHaveLength(2);
    expect(deduped.find((e) => e.shirt === 'Same shirt')?.id).toBe(2);
    expect(deduped.find((e) => e.shirt === 'Different shirt')?.id).toBe(3);
  });

  it('tie-breaks equal created_at by highest id', () => {
    const lowId = makeEntry({
      id: 5,
      created_at: '2024-06-01T00:00:00Z',
      shirt: 'Duplicate',
    });
    const highId = makeEntry({
      id: 9,
      created_at: '2024-06-01T00:00:00Z',
      shirt: 'Duplicate',
      reasoning: 'Higher id wins',
    });

    const deduped = dedupeHistoryByFingerprint([lowId, highId]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.id).toBe(9);
  });
});

describe('pickRandomHistoryEntry', () => {
  it('returns null for empty history', () => {
    const session = new RandomHistorySession();
    const result = pickRandomHistoryEntry([], { session });
    expect(result.entry).toBeNull();
    expect(result.showSingleLookToast).toBe(false);
  });

  it('excludes current history id from candidates when possible', () => {
    const session = new RandomHistorySession();
    const entries = [
      makeEntry({ id: 1, shirt: 'Look A' }),
      makeEntry({ id: 2, shirt: 'Look B' }),
    ];
    const rng = () => 0;

    const result = pickRandomHistoryEntry(entries, {
      session,
      currentHistoryId: 1,
      rng,
    });

    expect(result.entry?.id).toBe(2);
  });

  it('excludes recent session picks when alternatives exist', () => {
    const session = new RandomHistorySession();
    session.recentPicks = [1];
    const entries = [
      makeEntry({ id: 1, shirt: 'Look A' }),
      makeEntry({ id: 2, shirt: 'Look B' }),
      makeEntry({ id: 3, shirt: 'Look C' }),
    ];

    const result = pickRandomHistoryEntry(entries, {
      session,
      rng: () => 0,
    });

    expect(result.entry?.id).not.toBe(1);
  });

  it('pops deck without immediate repeat when multiple unique looks exist', () => {
    const session = new RandomHistorySession();
    const entries = [
      makeEntry({ id: 1, shirt: 'Look A' }),
      makeEntry({ id: 2, shirt: 'Look B' }),
      makeEntry({ id: 3, shirt: 'Look C' }),
    ];
    const rng = () => 0;

    const first = pickRandomHistoryEntry(entries, { session, rng });
    const second = pickRandomHistoryEntry(entries, { session, rng });

    expect(first.entry).not.toBeNull();
    expect(second.entry).not.toBeNull();
    expect(first.entry?.id).not.toBe(second.entry?.id);
  });

  it('reshuffles deck when exhausted and still avoids recent picks when possible', () => {
    const session = new RandomHistorySession();
    const entries = [
      makeEntry({ id: 1, shirt: 'Look A' }),
      makeEntry({ id: 2, shirt: 'Look B' }),
    ];
    const rng = () => 0;

    const picks: number[] = [];
    for (let i = 0; i < 4; i++) {
      const { entry } = pickRandomHistoryEntry(entries, { session, rng });
      if (entry) picks.push(entry.id);
    }

    expect(new Set(picks).size).toBe(2);
    expect(picks[0]).not.toBe(picks[1]);
    expect(picks[2]).not.toBe(picks[3]);
  });

  it('relaxes recent-pick exclusion when pool is too small', () => {
    const session = new RandomHistorySession();
    const entries = [
      makeEntry({ id: 1, shirt: 'Only look' }),
      makeEntry({ id: 2, shirt: 'Only look', created_at: '2024-02-01T00:00:00Z' }),
    ];
    session.recentPicks = [1];

    const result = pickRandomHistoryEntry(entries, { session, rng: () => 0 });
    expect(result.entry?.id).toBe(2);
  });

  it('relaxes current-id exclusion as last resort', () => {
    const session = new RandomHistorySession();
    const entries = [makeEntry({ id: 42, shirt: 'Solo look' })];

    const result = pickRandomHistoryEntry(entries, {
      session,
      currentHistoryId: 42,
      rng: () => 0,
    });

    expect(result.entry?.id).toBe(42);
  });

  it('signals single-look toast once per session', () => {
    const session = new RandomHistorySession();
    const entries = [
      makeEntry({ id: 1, shirt: 'Only unique' }),
      makeEntry({ id: 2, shirt: 'Only unique', created_at: '2024-02-01T00:00:00Z' }),
    ];

    const first = pickRandomHistoryEntry(entries, { session, rng: () => 0 });
    const second = pickRandomHistoryEntry(entries, { session, rng: () => 0 });

    expect(first.showSingleLookToast).toBe(true);
    expect(second.showSingleLookToast).toBe(false);
  });

  it('dedupes duplicate fingerprints before picking', () => {
    const session = new RandomHistorySession();
    const entries = [
      makeEntry({ id: 1, shirt: 'Shared', created_at: '2024-01-01T00:00:00Z' }),
      makeEntry({ id: 2, shirt: 'Shared', created_at: '2024-06-01T00:00:00Z' }),
      makeEntry({ id: 3, shirt: 'Other' }),
    ];

    const result = pickRandomHistoryEntry(entries, { session, rng: () => 0 });
    expect(result.entry?.id).not.toBe(1);
    expect([2, 3]).toContain(result.entry?.id);
  });

  it('tracks at most RECENT_RANDOM_HISTORY_COUNT recent picks', () => {
    const session = new RandomHistorySession();
    const entries = Array.from({ length: 8 }, (_, index) =>
      makeEntry({ id: index + 1, shirt: `Look ${index + 1}` })
    );

    for (let i = 0; i < 8; i++) {
      pickRandomHistoryEntry(entries, { session, rng: () => 0 });
    }

    expect(session.recentPicks.length).toBeLessThanOrEqual(RECENT_RANDOM_HISTORY_COUNT);
  });
});

describe('RandomHistorySession', () => {
  it('reset clears deck, recent picks, and toast flag', () => {
    const session = new RandomHistorySession();
    session.deck = [1, 2];
    session.recentPicks = [3, 4];
    session.hasShownSingleLookToast = true;

    session.reset();

    expect(session.deck).toEqual([]);
    expect(session.recentPicks).toEqual([]);
    expect(session.hasShownSingleLookToast).toBe(false);
  });
});
