import {
  inferOutfitSlotFromWardrobeCategory,
  resolveMatchingWardrobeItem,
  resolveOutfitItemThumbnail,
  resolveUploadCategory,
  firstWardrobePreviewUrl,
  previewUrlForSelectedWardrobeItems,
  textSuggestsOuterwear,
} from './outfitItemThumbnail';
import { optionalLayerCategories, shouldShowBlazerCard } from './outfitLayerExclusivity';
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

  it('previewUrlForSelectedWardrobeItems prefers user selection over AI-filled shirt', () => {
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      outerwear_id: 55,
      shoes_id: 66,
      matching_wardrobe_items: {
        ...baseMatchingItems,
        outerwear: [
          {
            id: 55,
            category: 'jacket',
            color: 'Tan',
            description: 'Tan wool overcoat',
            image_data: 'coat_img',
          },
        ],
        shoes: [
          {
            id: 66,
            category: 'shoes',
            color: 'Brown',
            description: 'Brown monk strap shoes',
            image_data: 'shoe_img',
          },
        ],
      },
    };

    expect(firstWardrobePreviewUrl(suggestion)).toContain('abc123');
    expect(previewUrlForSelectedWardrobeItems(suggestion, [55, 66])).toContain('coat_img');
    expect(previewUrlForSelectedWardrobeItems(suggestion, [66, 55])).toContain('shoe_img');
  });

  it('resolves optional sweater category by id', () => {
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      sweater_id: 30,
      matching_wardrobe_items: {
        ...baseMatchingItems,
        sweater: [
          { id: 30, category: 'sweater', color: 'navy', description: 'Merino', image_data: 'sweater_img' },
        ],
      },
    };
    expect(resolveMatchingWardrobeItem(suggestion, 'sweater')?.image_data).toBe('sweater_img');
    const resolved = resolveOutfitItemThumbnail(suggestion, 'outerwear');
    expect(resolved.tag).toBe('ai');
    expect(resolved.imageSrc).toBeNull();
  });

  it('finds outerwear by id across buckets when outerwear bucket is empty', () => {
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      outerwear_id: 55,
      matching_wardrobe_items: {
        ...baseMatchingItems,
        outerwear: [],
        blazer: [
          {
            id: 55,
            category: 'jacket',
            color: 'navy',
            description: 'Wool blazer jacket',
            image_data: 'blazer_jacket_img',
          },
        ],
      },
    };

    expect(resolveMatchingWardrobeItem(suggestion, 'outerwear')?.image_data).toBe('blazer_jacket_img');
    const resolved = resolveOutfitItemThumbnail(suggestion, 'outerwear');
    expect(resolved.tag).toBe('wardrobe');
    expect(resolved.imageSrc).toContain('blazer_jacket_img');
  });

  it('resolves optional outerwear and tie wardrobe thumbnails', () => {
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      outerwear_id: 40,
      tie_id: 50,
      matching_wardrobe_items: {
        ...baseMatchingItems,
        outerwear: [
          { id: 40, category: 'jacket', color: 'charcoal', description: 'Overcoat', image_data: 'coat_img' },
        ],
        tie: [{ id: 50, category: 'tie', color: 'burgundy', description: 'Silk tie', image_data: 'tie_img' }],
      },
    };
    expect(resolveOutfitItemThumbnail(suggestion, 'outerwear').imageSrc).toContain('coat_img');
    expect(resolveOutfitItemThumbnail(suggestion, 'tie').tag).toBe('wardrobe');
  });

  it('shows upload tag on outerwear, not blazer, when jacket is upload category', () => {
    const uploadUrl = 'blob:jacket-upload';
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      upload_matched_category: 'outerwear',
      imageUrl: uploadUrl,
    };

    expect(resolveUploadCategory(suggestion)).toBe('outerwear');
    expect(resolveOutfitItemThumbnail(suggestion, 'outerwear', uploadUrl)).toEqual({
      imageSrc: uploadUrl,
      tag: 'upload',
    });
    expect(resolveOutfitItemThumbnail(suggestion, 'blazer', uploadUrl)).toEqual({
      imageSrc: null,
      tag: 'ai',
    });
  });

  it('prefers outerwear upload anchor text over shirt metadata mismatch', () => {
    const uploadUrl = 'blob:jacket-upload';
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      upload_matched_category: 'shirt',
      shirt: 'Slim fit dress shirt with a subtle textured pattern',
      outerwear: 'Your wardrobe jacket (uploaded item)',
      imageUrl: uploadUrl,
      matching_wardrobe_items: {
        ...baseMatchingItems,
        shirt: [],
      },
    };

    expect(resolveUploadCategory(suggestion)).toBe('outerwear');
    expect(resolveOutfitItemThumbnail(suggestion, 'shirt', uploadUrl).tag).toBe('ai');
    expect(resolveOutfitItemThumbnail(suggestion, 'outerwear', uploadUrl)).toEqual({
      imageSrc: uploadUrl,
      tag: 'upload',
    });
  });

  it('prefers live source wardrobe category over stale shirt metadata', () => {
    const uploadUrl = 'blob:jacket-upload';
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      upload_matched_category: 'shirt',
      shirt_id: 42,
      source_wardrobe_item_id: 42,
      shirt: 'Black shirt with white and red horizontal stripes',
      imageUrl: uploadUrl,
      matching_wardrobe_items: {
        shirt: [],
        trouser: baseMatchingItems.trouser,
        blazer: [],
        shoes: [],
        belt: [],
      },
    };

    expect(resolveUploadCategory(suggestion, 'jacket')).toBe('outerwear');
    expect(resolveOutfitItemThumbnail(suggestion, 'shirt', uploadUrl, 'jacket').tag).toBe('ai');
    expect(resolveOutfitItemThumbnail(suggestion, 'outerwear', uploadUrl, 'jacket').tag).toBe('upload');
  });

  it('infers outerwear from descriptive wardrobe categories', () => {
    expect(inferOutfitSlotFromWardrobeCategory('bomber jacket')).toBe('outerwear');
    expect(inferOutfitSlotFromWardrobeCategory('wool overcoat')).toBe('outerwear');
  });

  it('infers outerwear from mis-slotted shirt text with jacket keywords', () => {
    const uploadUrl = 'blob:jacket-upload';
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      upload_matched_category: 'shirt',
      source_slot: 'shirt',
      shirt: 'Tan corduroy jacket with ribbed texture',
      blazer: 'Royal blue slim fit blazer',
      outerwear: 'Classic fit jacket from wardrobe',
      outerwear_id: 7,
      imageUrl: uploadUrl,
    };

    expect(resolveUploadCategory(suggestion)).toBe('outerwear');
    expect(shouldShowBlazerCard(suggestion)).toBe(false);
    expect(optionalLayerCategories(suggestion)).toEqual(['tie']);
    expect(resolveOutfitItemThumbnail(suggestion, 'outerwear', uploadUrl).tag).toBe('upload');
  });

  it('textSuggestsOuterwear ignores dress-shirt-only copy', () => {
    expect(textSuggestsOuterwear('Slim fit dress shirt with a subtle textured pattern')).toBe(false);
    expect(textSuggestsOuterwear('Tan corduroy jacket')).toBe(true);
  });

  it('uses source wardrobe item category when metadata pins the wrong slot', () => {
    const uploadUrl = 'blob:jacket-upload';
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      upload_matched_category: 'shirt',
      shirt_id: 42,
      source_wardrobe_item_id: 42,
      shirt: 'Slim fit dress shirt with a subtle textured pattern',
      outerwear: 'Tan corduroy jacket',
      matching_wardrobe_items: {
        shirt: [],
        trouser: baseMatchingItems.trouser,
        blazer: [],
        shoes: [],
        belt: [],
        outerwear: [
          {
            id: 42,
            category: 'jacket',
            color: 'tan',
            description: 'Tan corduroy jacket',
            image_data: 'jacket_img',
          },
        ],
      },
      imageUrl: uploadUrl,
    };

    expect(resolveUploadCategory(suggestion)).toBe('outerwear');
    expect(resolveOutfitItemThumbnail(suggestion, 'outerwear', uploadUrl).tag).toBe('upload');
    expect(resolveOutfitItemThumbnail(suggestion, 'shirt', uploadUrl).tag).toBe('ai');
  });

  it('treats wardrobe multi-select outerwear as wardrobe, not upload', () => {
    const suggestion: OutfitSuggestion = {
      ...baseSuggestion,
      outerwear_id: 55,
      outerwear: 'Tan wool overcoat',
      source_wardrobe_item_id: 55,
      shoes_id: 66,
      matching_wardrobe_items: {
        ...baseMatchingItems,
        outerwear: [
          {
            id: 55,
            category: 'jacket',
            color: 'Tan',
            description: 'Tan wool overcoat',
            image_data: 'coat_img',
          },
        ],
        shoes: [
          {
            id: 66,
            category: 'shoes',
            color: 'Brown',
            description: 'Brown monk strap shoes',
            image_data: 'shoe_img',
          },
        ],
      },
    };

    expect(resolveUploadCategory(suggestion)).toBeNull();
    const resolved = resolveOutfitItemThumbnail(suggestion, 'outerwear');
    expect(resolved.tag).toBe('wardrobe');
    expect(resolved.imageSrc).toContain('coat_img');
  });
});
