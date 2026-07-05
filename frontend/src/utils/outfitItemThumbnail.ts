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
  const selectedId = suggestion[CATEGORY_IDS[category]] as number | null | undefined;
  if (selectedId === null) return undefined;

  if (category === 'outerwear' && selectedId != null) {
    const crossBucketMatch = findMatchingWardrobeItemById(suggestion, selectedId);
    if (crossBucketMatch) return crossBucketMatch;
  }

  const categoryMatches = suggestion.matching_wardrobe_items?.[category] || [];
  if (categoryMatches.length === 0) return undefined;

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

const CATEGORY_ALIASES: Record<string, OutfitCategoryKey> = {
  shirt: 'shirt',
  shirts: 'shirt',
  trouser: 'trouser',
  trousers: 'trouser',
  pant: 'trouser',
  pants: 'trouser',
  blazer: 'blazer',
  blazers: 'blazer',
  jacket: 'outerwear',
  jackets: 'outerwear',
  coat: 'outerwear',
  coats: 'outerwear',
  outerwear: 'outerwear',
  shoe: 'shoes',
  shoes: 'shoes',
  belt: 'belt',
  belts: 'belt',
};

const UPLOAD_TEXT_MARKERS = [
  'uploaded item',
  'from your upload',
  'your upload',
  'uploaded image',
];

const UPLOAD_CATEGORY_ORDER: OutfitCategoryKey[] = [
  'outerwear',
  'blazer',
  'shirt',
  'trouser',
  'shoes',
  'belt',
  'sweater',
  'tie',
];

export function normalizeOutfitCategoryAlias(
  raw: string | null | undefined
): OutfitCategoryKey | null {
  if (!raw) return null;
  return CATEGORY_ALIASES[raw.trim().toLowerCase()] ?? null;
}

const OUTERWEAR_CATEGORY_PATTERN =
  /\b(jacket|jackets|coat|coats|outerwear|parka|parkas|bomber|windbreaker|anorak|puffer|overcoat|trench|shacket|overshirt|corduroy|duffle|duffel|field jacket|harrington|denim jacket|leather jacket|quilted|padded|insulated|fleece)\b/;

export function textSuggestsOuterwear(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const stripped = text.trim();
  if (slotHasUploadMarker(stripped)) return true;
  if (!OUTERWEAR_CATEGORY_PATTERN.test(stripped.toLowerCase())) return false;
  if (/\b(dress shirt|oxford shirt|button[- ]down shirt|formal shirt)\b/i.test(stripped)) {
    return false;
  }
  return true;
}

function inferUploadCategoryFromMisSlottedText(
  suggestion: OutfitSuggestion
): OutfitCategoryKey | null {
  const slot =
    normalizeOutfitCategoryAlias(suggestion.upload_matched_category) ??
    normalizeOutfitCategoryAlias(suggestion.source_slot);
  if (slot === 'shirt' && textSuggestsOuterwear(suggestion.shirt)) return 'outerwear';
  if (slot === 'blazer' && textSuggestsOuterwear(suggestion.blazer)) return 'outerwear';
  return null;
}

/** Map wardrobe storage categories (including phrases like "bomber jacket") to outfit slots. */
export function inferOutfitSlotFromWardrobeCategory(
  raw: string | null | undefined
): OutfitCategoryKey | null {
  const direct = normalizeOutfitCategoryAlias(raw);
  if (direct) return direct;
  if (!raw?.trim()) return null;
  if (OUTERWEAR_CATEGORY_PATTERN.test(raw.trim().toLowerCase())) {
    return 'outerwear';
  }
  return null;
}

function slotHasUploadMarker(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.trim().toLowerCase();
  return UPLOAD_TEXT_MARKERS.some((marker) => lower.includes(marker));
}

/** iOS parity: find which slot text marks the user's upload. */
function findUploadAnchoredCategory(suggestion: OutfitSuggestion): OutfitCategoryKey | null {
  for (const category of UPLOAD_CATEGORY_ORDER) {
    const text = suggestion[category];
    if (typeof text === 'string' && slotHasUploadMarker(text)) {
      return category;
    }
  }
  return null;
}

function findMatchingWardrobeItemById(
  suggestion: OutfitSuggestion,
  itemId: number
): MatchingWardrobeItem | undefined {
  const groups = suggestion.matching_wardrobe_items;
  if (!groups) return undefined;
  for (const items of Object.values(groups)) {
    const match = items?.find((item: MatchingWardrobeItem) => item.id === itemId);
    if (match) return match;
  }
  return undefined;
}

/** Prefer wardrobe item category for source_wardrobe_item_id over slot id mismatches. */
function resolveSourceWardrobeUploadCategory(
  suggestion: OutfitSuggestion
): OutfitCategoryKey | null {
  const itemId = suggestion.source_wardrobe_item_id;
  if (itemId == null) return null;

  const wardrobeItem = findMatchingWardrobeItemById(suggestion, itemId);
  const fromWardrobeCategory = inferOutfitSlotFromWardrobeCategory(wardrobeItem?.category);
  if (fromWardrobeCategory) return fromWardrobeCategory;

  for (const category of UPLOAD_CATEGORY_ORDER) {
    const slotId = suggestion[CATEGORY_IDS[category]] as number | null | undefined;
    if (slotId === itemId) {
      if (wardrobeItem?.category) {
        const inferred = inferOutfitSlotFromWardrobeCategory(wardrobeItem.category);
        if (inferred && inferred !== category) return inferred;
      }
      return category;
    }
  }

  return null;
}

function suggestionHasUploadImage(suggestion: OutfitSuggestion): boolean {
  return !!suggestion.imageUrl?.trim();
}

export function resolveUploadCategory(
  suggestion: OutfitSuggestion,
  sourceWardrobeCategory?: string | null
): OutfitCategoryKey | null {
  const fromLiveSource = inferOutfitSlotFromWardrobeCategory(sourceWardrobeCategory);
  if (fromLiveSource) return fromLiveSource;

  const hasUploadImage = suggestionHasUploadImage(suggestion);

  const fromText = findUploadAnchoredCategory(suggestion);
  if (fromText && hasUploadImage) return fromText;

  if (hasUploadImage) {
    const fromSourceItem = resolveSourceWardrobeUploadCategory(suggestion);
    if (fromSourceItem) return fromSourceItem;

    const fromMisSlottedText = inferUploadCategoryFromMisSlottedText(suggestion);
    if (fromMisSlottedText) return fromMisSlottedText;

    const fromMetadata = normalizeOutfitCategoryAlias(suggestion.upload_matched_category);
    if (fromMetadata) return fromMetadata;

    return normalizeOutfitCategoryAlias(suggestion.source_slot);
  }

  return null;
}

export interface ResolvedItemThumbnail {
  imageSrc: string | null;
  tag: 'upload' | 'wardrobe' | 'ai';
}

export function resolveOutfitItemThumbnail(
  suggestion: OutfitSuggestion,
  category: OutfitCategoryKey,
  uploadImageUrl?: string | null,
  sourceWardrobeCategory?: string | null
): ResolvedItemThumbnail {
  const uploadCategory = resolveUploadCategory(suggestion, sourceWardrobeCategory);
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

/** Sidebar preview for wardrobe multi-select — prefer user-picked items, not AI-filled slots. */
export function previewUrlForSelectedWardrobeItems(
  suggestion: OutfitSuggestion,
  selectedWardrobeItemIds: number[]
): string | null {
  for (const itemId of selectedWardrobeItemIds) {
    const match = findMatchingWardrobeItemById(suggestion, itemId);
    const src = wardrobeItemThumbnailSrc(match);
    if (src) return src;
  }
  return firstWardrobePreviewUrl(suggestion);
}
