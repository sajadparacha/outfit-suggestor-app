import {
  cleanUploadMarkerText,
  describeUploadedOuterwear,
  hasVisibleOptionalLayers,
  optionalLayerCategories,
  resolveOuterwearDisplayText,
  shouldShowAnchoredOuterwearInCoreGrid,
  shouldShowBlazerCard,
  textHasUploadMarker,
} from './outfitLayerExclusivity';
import { resolveUploadCategory } from './outfitItemThumbnail';
import type { OutfitSuggestion } from '../models/OutfitModels';

describe('outfitLayerExclusivity', () => {
  const base: OutfitSuggestion = {
    id: '1',
    shirt: 'Shirt',
    trouser: 'Trousers',
    blazer: 'Navy blazer',
    shoes: 'Shoes',
    belt: 'Belt',
    reasoning: 'Test',
  };

  it('hides blazer card when upload anchors outerwear', () => {
    const suggestion: OutfitSuggestion = {
      ...base,
      blazer: 'Royal blue blazer',
      upload_matched_category: 'outerwear',
      outerwear: 'Tan corduroy jacket',
      imageUrl: 'blob:jacket-upload',
    };
    expect(shouldShowBlazerCard(suggestion)).toBe(false);
    expect(shouldShowAnchoredOuterwearInCoreGrid(suggestion)).toBe(true);
    expect(optionalLayerCategories(suggestion)).toEqual(['tie']);
    expect(hasVisibleOptionalLayers(suggestion)).toBe(false);
  });

  it('shows anchored outerwear in core grid with fallback text when API omits outerwear', () => {
    const suggestion: OutfitSuggestion = {
      ...base,
      upload_matched_category: 'outerwear',
      outerwear: null,
      imageUrl: 'blob:jacket-upload',
    };
    expect(shouldShowAnchoredOuterwearInCoreGrid(suggestion)).toBe(true);
    expect(resolveOuterwearDisplayText(suggestion)).toBe('The jacket in your photo');
    expect(resolveOuterwearDisplayText(suggestion)).not.toMatch(/uploaded item/);
  });

  it('uses "coat" in the fallback when the source wardrobe category is a coat', () => {
    const suggestion: OutfitSuggestion = {
      ...base,
      upload_matched_category: 'outerwear',
      outerwear: null,
      imageUrl: 'blob:coat-upload',
    };
    expect(resolveOuterwearDisplayText(suggestion, 'coat')).toBe('The coat in your photo');
    expect(resolveOuterwearDisplayText(suggestion, 'coats')).toBe('The coat in your photo');
  });

  it('prefers the uploaded wardrobe item description over the photo phrase', () => {
    const suggestion: OutfitSuggestion = {
      ...base,
      upload_matched_category: 'outerwear',
      outerwear: null,
      outerwear_id: 55,
      source_wardrobe_item_id: 55,
      imageUrl: 'blob:coat-upload',
      matching_wardrobe_items: {
        shirt: [],
        trouser: [],
        blazer: [],
        shoes: [],
        belt: [],
        outerwear: [
          {
            id: 55,
            category: 'coat',
            color: 'Navy',
            description: 'Navy wool overcoat',
            image_data: null,
          },
        ],
      },
    };
    const text = resolveOuterwearDisplayText(suggestion);
    expect(text).toBe('Navy wool overcoat');
    expect(text).not.toMatch(/uploaded (item|image)|your upload/i);
  });

  it('falls back to wardrobe colour when the uploaded item has no description', () => {
    const suggestion: OutfitSuggestion = {
      ...base,
      upload_matched_category: 'outerwear',
      outerwear: null,
      outerwear_id: 55,
      source_wardrobe_item_id: 55,
      imageUrl: 'blob:coat-upload',
      matching_wardrobe_items: {
        shirt: [],
        trouser: [],
        blazer: [],
        shoes: [],
        belt: [],
        outerwear: [
          { id: 55, category: 'coat', color: 'Navy', description: null, image_data: null },
        ],
      },
    };
    expect(resolveOuterwearDisplayText(suggestion)).toBe('Your wardrobe coat — Navy');
  });

  it('does not surface legacy "(uploaded item)" history text', () => {
    const suggestion: OutfitSuggestion = {
      ...base,
      upload_matched_category: 'outerwear',
      outerwear: 'Your wardrobe jacket (uploaded item)',
      imageUrl: 'blob:jacket-upload',
    };
    expect(resolveOuterwearDisplayText(suggestion)).toBe('The jacket in your photo');
    expect(shouldShowAnchoredOuterwearInCoreGrid(suggestion)).toBe(true);
  });

  it('keeps real description content when the text carries an upload marker', () => {
    const trimmed: OutfitSuggestion = {
      ...base,
      upload_matched_category: 'outerwear',
      outerwear: 'From your upload — navy bomber jacket',
      imageUrl: 'blob:jacket-upload',
    };
    expect(resolveOuterwearDisplayText(trimmed)).toBe('navy bomber jacket');

    const parenthetical: OutfitSuggestion = {
      ...trimmed,
      outerwear: 'Navy corduroy jacket (uploaded item)',
    };
    expect(resolveOuterwearDisplayText(parenthetical)).toBe('Navy corduroy jacket');

    const wardrobeColor: OutfitSuggestion = {
      ...trimmed,
      outerwear: 'Your wardrobe jacket — Navy (uploaded item)',
    };
    expect(resolveOuterwearDisplayText(wardrobeColor)).toBe('Your wardrobe jacket — Navy');
  });

  it('keeps cleaned marker text even when a real blazer is present but outerwear anchors the upload', () => {
    const suggestion: OutfitSuggestion = {
      ...base,
      blazer: 'Royal blue blazer',
      upload_matched_category: 'outerwear',
      outerwear: 'From your upload — navy bomber jacket',
      imageUrl: 'blob:jacket-upload',
    };
    expect(resolveOuterwearDisplayText(suggestion)).toBe('navy bomber jacket');
  });

  it('uses the wardrobe description for a bare placeholder and the photo phrase when nothing is known', () => {
    const withDescription: OutfitSuggestion = {
      ...base,
      upload_matched_category: 'outerwear',
      outerwear: 'Your wardrobe jacket (uploaded item)',
      outerwear_id: 55,
      source_wardrobe_item_id: 55,
      imageUrl: 'blob:jacket-upload',
      matching_wardrobe_items: {
        shirt: [],
        trouser: [],
        blazer: [],
        shoes: [],
        belt: [],
        outerwear: [
          {
            id: 55,
            category: 'jacket',
            color: 'Navy',
            description: 'Navy bomber jacket',
            image_data: null,
          },
        ],
      },
    };
    expect(resolveOuterwearDisplayText(withDescription)).toBe('Navy bomber jacket');

    const nothingKnown: OutfitSuggestion = {
      ...base,
      upload_matched_category: 'outerwear',
      outerwear: 'Your wardrobe jacket (uploaded item)',
      imageUrl: 'blob:jacket-upload',
    };
    expect(resolveOuterwearDisplayText(nothingKnown)).toBe('The jacket in your photo');
  });

  it('excludes sweater and outerwear optional layers when blazer is anchor', () => {
    const suggestion: OutfitSuggestion = {
      ...base,
      upload_matched_category: 'blazer',
      sweater: 'Merino crew',
      outerwear: 'Denim jacket',
      imageUrl: 'blob:blazer-upload',
    };
    expect(shouldShowBlazerCard(suggestion)).toBe(true);
    expect(optionalLayerCategories(suggestion)).toEqual(['tie']);
    expect(hasVisibleOptionalLayers(suggestion)).toBe(false);
  });

  it('does not synthesize upload copy for wardrobe multi-select without image', () => {
    const suggestion: OutfitSuggestion = {
      ...base,
      blazer: 'No structured blazer — outfit built around your outerwear',
      outerwear_id: 55,
      outerwear: 'Tan wool overcoat',
      source_wardrobe_item_id: 55,
    };
    expect(resolveUploadCategory(suggestion)).toBeNull();
    expect(shouldShowAnchoredOuterwearInCoreGrid(suggestion)).toBe(false);
    expect(resolveOuterwearDisplayText(suggestion)).toBe('Tan wool overcoat');
  });

  it('hides outerwear when classic blazer is also present', () => {
    const suggestion: OutfitSuggestion = {
      ...base,
      blazer: 'Slim fit blazer',
      outerwear: 'Brown jacket',
      outerwear_id: 9,
    };
    expect(
      resolveOuterwearDisplayText(suggestion, null, {
        season: 'summer',
        occasion: 'everyday',
        style: 'classic',
      })
    ).toBeNull();
    expect(
      optionalLayerCategories(suggestion, null, {
        season: 'summer',
        occasion: 'everyday',
        style: 'classic',
      })
    ).not.toContain('outerwear');
  });

  it('hides blazer card for empty or placeholder blazer text', () => {
    expect(shouldShowBlazerCard({ ...base, blazer: '' })).toBe(false);
    expect(
      shouldShowBlazerCard({
        ...base,
        blazer: 'No structured blazer — outfit built around your outerwear',
      })
    ).toBe(false);
  });
});

describe('cleanUploadMarkerText', () => {
  it('strips upload markers while keeping the real description', () => {
    expect(cleanUploadMarkerText('From your upload — navy bomber jacket')).toBe(
      'navy bomber jacket'
    );
    expect(cleanUploadMarkerText('Navy corduroy jacket (uploaded item)')).toBe(
      'Navy corduroy jacket'
    );
    expect(cleanUploadMarkerText('Your wardrobe jacket — Navy (uploaded item)')).toBe(
      'Your wardrobe jacket — Navy'
    );
  });

  it('rejects null-ish and bare placeholder text', () => {
    expect(cleanUploadMarkerText('Your wardrobe jacket (uploaded item)')).toBeNull();
    expect(cleanUploadMarkerText('Jacket (uploaded item)')).toBeNull();
    expect(cleanUploadMarkerText('  null  ')).toBeNull();
    expect(cleanUploadMarkerText('')).toBeNull();
    expect(cleanUploadMarkerText(null)).toBeNull();
    expect(cleanUploadMarkerText(undefined)).toBeNull();
  });

  it('returns real text untouched when no marker is present', () => {
    expect(cleanUploadMarkerText('Tan wool overcoat')).toBe('Tan wool overcoat');
    expect(cleanUploadMarkerText('Denim jacket')).toBe('Denim jacket');
  });

  it('stays consistent with textHasUploadMarker for detection only', () => {
    expect(textHasUploadMarker('Navy corduroy jacket (uploaded item)')).toBe(true);
    expect(textHasUploadMarker('Tan wool overcoat')).toBe(false);
  });

  it('mirrors describeUploadedOuterwear priority: description, then colour, then photo phrase', () => {
    expect(
      describeUploadedOuterwear({ category: 'jacket', color: 'Tan', description: 'Tan suede jacket' })
    ).toBe('Tan suede jacket');
    expect(describeUploadedOuterwear({ category: 'jacket', color: 'Tan' })).toBe(
      'Your wardrobe jacket — Tan'
    );
    expect(describeUploadedOuterwear({ category: 'coat' })).toBe('The coat in your photo');
  });
});
