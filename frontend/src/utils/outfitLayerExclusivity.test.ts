import {
  hasVisibleOptionalLayers,
  optionalLayerCategories,
  resolveOuterwearDisplayText,
  shouldShowAnchoredOuterwearInCoreGrid,
  shouldShowBlazerCard,
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
    expect(resolveOuterwearDisplayText(suggestion)).toBe('Your wardrobe jacket (uploaded item)');
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
      outerwear_id: 55,
      outerwear: 'Tan wool overcoat',
      source_wardrobe_item_id: 55,
    };
    expect(resolveUploadCategory(suggestion)).toBeNull();
    expect(shouldShowAnchoredOuterwearInCoreGrid(suggestion)).toBe(false);
    expect(resolveOuterwearDisplayText(suggestion)).toBe('Tan wool overcoat');
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
