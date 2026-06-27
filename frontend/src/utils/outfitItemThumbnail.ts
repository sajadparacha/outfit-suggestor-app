import type { MatchingWardrobeItem, OutfitSuggestion } from '../models/OutfitModels';

export type CoreOutfitCategoryKey = 'shirt' | 'trouser' | 'blazer' | 'shoes' | 'belt';
export type OptionalOutfitCategoryKey = 'sweater' | 'outerwear' | 'tie';
export type OutfitCategoryKey = CoreOutfitCategoryKey | OptionalOutfitCategoryKey;

const CATEGORY_IDS: Record<OutfitCategoryKey, keyof OutfitSuggestion> = {
  shirt: 'shirt_id',
  trouser: 'trouser_id',
  blazer: 'blazer_id',
  shoes: 'shoes_id',
  belt: 'belt_id',
  sweater: 'sweater_id',
  outerwear: 'outerwear_id',
  tie: 'tie_id',
};

/**
 * Resolve wardrobe match for a category — prefers AI-selected id, falls back to first match.
 * Random-from-wardrobe responses often omit *_id fields but include matching_wardrobe_items.
 */
export function resolveMatchingWardrobeItem(
  suggestion: OutfitSuggestion,
  category: OutfitCategoryKey
): MatchingWardrobeItem | undefined {
  const categoryMatches = suggestion.matching_wardrobe_items?.[category] || [];
  if (categoryMatches.length === 0) return undefined;

  const selectedId = suggestion[CATEGORY_IDS[category]] as number | null | undefined;
  if (selectedId === null) return undefined;

  if (selectedId != null) {
    const byId = categoryMatches.find((item) => item.id === selectedId);
    if (byId) return byId;
  }

  return categoryMatches[0];
}

export function wardrobeItemThumbnailSrc(item: MatchingWardrobeItem | undefined): string | null {
  if (!item?.image_data) return null;
  return `data:image/jpeg;base64,${item.image_data}`;
}

export function resolveUploadCategory(suggestion: OutfitSuggestion): OutfitCategoryKey | null {
  const raw = suggestion.upload_matched_category?.toLowerCase();
  if (!raw) return null;
  const aliases: Record<string, OutfitCategoryKey> = {
    shirt: 'shirt',
    shirts: 'shirt',
    trouser: 'trouser',
    trousers: 'trouser',
    pant: 'trouser',
    pants: 'trouser',
    blazer: 'blazer',
    blazers: 'blazer',
    jacket: 'blazer',
    jackets: 'blazer',
    shoe: 'shoes',
    shoes: 'shoes',
    belt: 'belt',
    belts: 'belt',
  };
  return aliases[raw] ?? null;
}

export interface ResolvedItemThumbnail {
  imageSrc: string | null;
  tag: 'upload' | 'wardrobe' | 'ai';
}

export function resolveOutfitItemThumbnail(
  suggestion: OutfitSuggestion,
  category: OutfitCategoryKey,
  uploadImageUrl?: string | null
): ResolvedItemThumbnail {
  const uploadCategory = resolveUploadCategory(suggestion);
  const useUpload = !!uploadImageUrl && category === uploadCategory;

  if (useUpload) {
    return { imageSrc: uploadImageUrl!, tag: 'upload' };
  }

  const match = resolveMatchingWardrobeItem(suggestion, category);
  const wardrobeSrc = wardrobeItemThumbnailSrc(match);
  if (wardrobeSrc) {
    return { imageSrc: wardrobeSrc, tag: 'wardrobe' };
  }

  return { imageSrc: null, tag: 'ai' };
}

const PREVIEW_CATEGORY_ORDER: CoreOutfitCategoryKey[] = ['shirt', 'trouser', 'blazer', 'shoes', 'belt'];

/** First available wardrobe thumbnail — used for random-from-wardrobe sidebar preview. */
export function firstWardrobePreviewUrl(suggestion: OutfitSuggestion): string | null {
  for (const category of PREVIEW_CATEGORY_ORDER) {
    const src = wardrobeItemThumbnailSrc(resolveMatchingWardrobeItem(suggestion, category));
    if (src) return src;
  }
  return null;
}
