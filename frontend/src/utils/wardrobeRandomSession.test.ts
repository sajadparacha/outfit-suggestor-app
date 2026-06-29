import { formatPreviousOutfitForPrompt } from './outfitPromptUtils';
import type { OutfitResponse, OutfitSuggestion } from '../models/OutfitModels';
import {
  RECENT_WARDROBE_RANDOM_COUNT,
  WARDROBE_RANDOM_MAX_RETRIES,
  WardrobeRandomSession,
  buildVarietyContext,
  shouldRetryWardrobeRandom,
  suggestionFingerprint,
} from './wardrobeRandomSession';

const baseOutfit: OutfitSuggestion = {
  id: '1',
  shirt: 'White Oxford',
  trouser: 'Navy chinos',
  blazer: 'No blazer',
  shoes: 'Brown loafers',
  belt: 'Brown belt',
  reasoning: 'Smart casual.',
  shirt_id: 10,
  trouser_id: 20,
};

const variantOutfit: OutfitResponse = {
  shirt: 'Blue linen shirt',
  trouser: 'Khaki shorts',
  blazer: 'No blazer',
  shoes: 'Sandals',
  belt: 'Woven belt',
  reasoning: 'Summer casual.',
  matching_wardrobe_items: {
    shirt: [{ id: 11, category: 'shirt', color: 'blue', description: null, image_data: null }],
    trouser: [],
    blazer: [],
    shoes: [],
    belt: [],
  },
};

describe('suggestionFingerprint', () => {
  it('normalizes text fields and includes wardrobe ids', () => {
    const fp1 = suggestionFingerprint(baseOutfit);
    const fp2 = suggestionFingerprint({
      ...baseOutfit,
      shirt: '  white oxford ',
      trouser: 'NAVY CHINOS',
    });
    expect(fp1).toBe(fp2);
    expect(fp1).toContain('10');
    expect(fp1).toContain('20');
  });

  it('uses matching_wardrobe_items ids when id fields are absent', () => {
    const fp = suggestionFingerprint(variantOutfit);
    expect(fp).toContain('11');
  });

  it('differs when outfit pieces change', () => {
    expect(suggestionFingerprint(baseOutfit)).not.toBe(suggestionFingerprint(variantOutfit));
  });
});

describe('WardrobeRandomSession', () => {
  it('tracks recent fingerprints up to RECENT_WARDROBE_RANDOM_COUNT', () => {
    const session = new WardrobeRandomSession();
    for (let i = 0; i < RECENT_WARDROBE_RANDOM_COUNT + 2; i++) {
      const outfit = { ...baseOutfit, shirt: `Shirt ${i}` };
      session.recordSuggestion(outfit, formatPreviousOutfitForPrompt);
    }

    expect(session.isRecentDuplicate(suggestionFingerprint({ ...baseOutfit, shirt: 'Shirt 6' }))).toBe(true);
    expect(session.isRecentDuplicate(suggestionFingerprint({ ...baseOutfit, shirt: 'Shirt 0' }))).toBe(false);
  });

  it('avoidTextsForPrompt returns formatted recent outfits', () => {
    const session = new WardrobeRandomSession();
    session.recordSuggestion(baseOutfit, formatPreviousOutfitForPrompt);

    const texts = session.avoidTextsForPrompt(formatPreviousOutfitForPrompt);
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain('White Oxford');
  });

  it('reset clears session state', () => {
    const session = new WardrobeRandomSession();
    session.recordSuggestion(baseOutfit, formatPreviousOutfitForPrompt);
    session.reset();
    expect(session.isRecentDuplicate(suggestionFingerprint(baseOutfit))).toBe(false);
    expect(session.avoidTextsForPrompt(formatPreviousOutfitForPrompt)).toEqual([]);
  });
});

describe('buildVarietyContext', () => {
  it('includes previous outfit when current suggestion is set', () => {
    const session = new WardrobeRandomSession();
    const ctx = buildVarietyContext(baseOutfit, session, formatPreviousOutfitForPrompt);
    expect(ctx.previousOutfitText).toContain('White Oxford');
  });

  it('includes avoid texts from session on subsequent requests', () => {
    const session = new WardrobeRandomSession();
    session.recordSuggestion(baseOutfit, formatPreviousOutfitForPrompt);

    const ctx = buildVarietyContext(null, session, formatPreviousOutfitForPrompt);
    expect(ctx.avoidOutfitTexts).toHaveLength(1);
    expect(ctx.avoidOutfitTexts?.[0]).toContain('White Oxford');
  });

  it('strengthens avoid list on retry attempts', () => {
    const session = new WardrobeRandomSession();
    session.recordSuggestion(baseOutfit, formatPreviousOutfitForPrompt);

    const ctx = buildVarietyContext(
      baseOutfit,
      session,
      formatPreviousOutfitForPrompt,
      1,
      variantOutfit
    );

    expect(ctx.previousOutfitText).toContain('Blue linen shirt');
    expect(ctx.avoidOutfitTexts?.length).toBeGreaterThanOrEqual(2);
    expect(ctx.avoidOutfitTexts?.some((t) => t.includes('Blue linen shirt'))).toBe(true);
  });
});

describe('shouldRetryWardrobeRandom', () => {
  it('retries when fingerprint matches recent session entries', () => {
    const session = new WardrobeRandomSession();
    session.recordSuggestion(baseOutfit, formatPreviousOutfitForPrompt);

    expect(shouldRetryWardrobeRandom(baseOutfit, session, 0)).toBe(true);
    expect(shouldRetryWardrobeRandom(variantOutfit, session, 0)).toBe(false);
  });

  it('stops after WARDROBE_RANDOM_MAX_RETRIES', () => {
    const session = new WardrobeRandomSession();
    session.recordSuggestion(baseOutfit, formatPreviousOutfitForPrompt);

    expect(shouldRetryWardrobeRandom(baseOutfit, session, WARDROBE_RANDOM_MAX_RETRIES)).toBe(false);
  });
});
