import {
  resolveMatchingWardrobeItem,
  resolveOutfitItemThumbnail,
  firstWardrobePreviewUrl,
} from './outfitItemThumbnail';
import type { MatchingWardrobeItems, OutfitSuggestion } from '../models/OutfitModels';

const baseMatchingItems: MatchingWardrobeItems = {
  shirt: [{ id: 10, category: 'shirt', color: 'blue', description: 'Shirt', image_data: 'abc123' }],
  trouser: [{ id: 11, category: 'trouser', color: 'beige', description: 'Chinos', image_data: 'def456' }],
  blazer: [],
  shoes: [],
  belt: [],
};

const baseSuggestion: OutfitSuggestion = {
  id: '1',
  shirt: 'Blue shirt',
  trouser: 'Chinos',
  blazer: 'Blazer',
  shoes: 'Loafers',
  belt: 'Belt',
  reasoning: 'Test',
  matching_wardrobe_items: baseMatchingItems,
};

describe('outfitItemThumbnail', () => {
  it('falls back to first matching wardrobe item when category id is missing', () => {
    const match = resolveMatchingWardrobeItem(baseSuggestion, 'shirt');
    expect(match?.id).toBe(10);
    expect(match?.image_data).toBe('abc123');
  });

  it('prefers selected id when present', () => {
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      shirt_id: 99,
      matching_wardrobe_items: {
        ...baseMatchingItems,
        shirt: [
          { id: 10, category: 'shirt', color: null, description: null, image_data: 'a' },
          { id: 99, category: 'shirt', color: null, description: null, image_data: 'b' },
        ],
      },
    };
    expect(resolveMatchingWardrobeItem(suggestion, 'shirt')?.image_data).toBe('b');
  });

  it('returns undefined when category id is explicitly null', () => {
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      shirt_id: null,
      matching_wardrobe_items: baseMatchingItems,
    };
    expect(resolveMatchingWardrobeItem(suggestion, 'shirt')).toBeUndefined();
  });

  it('returns wardrobe thumbnail for random-outfit style payloads', () => {
    const resolved = resolveOutfitItemThumbnail(baseSuggestion, 'trouser');
    expect(resolved.tag).toBe('wardrobe');
    expect(resolved.imageSrc).toContain('def456');
  });

  it('firstWardrobePreviewUrl returns first category with image data', () => {
    expect(firstWardrobePreviewUrl(baseSuggestion)).toContain('abc123');
  });
});
