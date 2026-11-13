import type { OutfitSuggestion } from '../models/OutfitModels';
import {
  resolveMatchingWardrobeItem,
  resolveUploadCategory,
  type OptionalOutfitCategoryKey,
} from './outfitItemThumbnail';

/** Legacy stored-history placeholders — used for detection only, never displayed. */
const UPLOAD_TEXT_MARKERS = ['uploaded item', 'from your upload', 'your upload', 'uploaded image'];

export function textHasUploadMarker(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.trim().toLowerCase();
  return UPLOAD_TEXT_MARKERS.some((marker) => lower.includes(marker));
}

const NULLISH_UPLOAD_TEXT = ['null', 'none', 'n/a', '-', ''];

/** Bare placeholders that carry no garment info — reject after marker stripping. */
const GENERIC_UPLOAD_TEXT = [
  'your wardrobe jacket',
  'your wardrobe coat',
  'your wardrobe item',
  'your jacket',
  'your coat',
  'wardrobe jacket',
  'wardrobe coat',
  'the jacket',
  'the coat',
  'jacket',
  'coat',
  'item',
];

const UPLOAD_MARKER_PATTERN =
  /[\(\[]?\s*(?:uploaded item|from your upload|your upload|uploaded image)\s*[\)\]]?/gi;

const EDGE_TRIM_PATTERN = /^[\s\-—–,;:.]+|[\s\-—–,;:.]+$/g;

/**
 * Strip legacy upload markers while keeping any real description around them.
 * Mirrors backend `clean_upload_marker_text` in utils/outfit_upload_category.py.
 *
 * Returns null when nothing usable is left (empty, null-ish, or a bare
 * "your wardrobe jacket (uploaded item)" placeholder) so callers can fall back
 * to a generated description. "From your upload — navy bomber jacket" keeps
 * "navy bomber jacket" instead of being thrown away.
 */
export function cleanUploadMarkerText(text?: string | null): string | null {
  if (text == null) return null;
  const stripped = String(text).trim();
  if (NULLISH_UPLOAD_TEXT.includes(stripped.toLowerCase())) return null;
  if (!textHasUploadMarker(stripped)) return stripped;

  let cleaned = stripped.replace(UPLOAD_MARKER_PATTERN, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').replace(EDGE_TRIM_PATTERN, '');
  cleaned = cleaned.replace(/^(?:from|the)\s+/i, '');
  cleaned = cleaned.replace(EDGE_TRIM_PATTERN, '');
  if (!cleaned || GENERIC_UPLOAD_TEXT.includes(cleaned.toLowerCase())) return null;
  return cleaned;
}

/** 'coat' when any known category is a coat, otherwise 'jacket'. */
function outerwearLabel(categories: (string | null | undefined)[]): 'coat' | 'jacket' {
  for (const raw of categories) {
    const normalized = (raw || '').trim().toLowerCase();
    if (!normalized) continue;
    if (normalized.includes('coat')) return 'coat';
    if (normalized.includes('jacket') || normalized.includes('outerwear')) return 'jacket';
  }
  return 'jacket';
}

/**
 * Best available copy for an uploaded jacket/coat.
 * Mirrors backend `_outerwear_upload_text` in outfit_controller.py.
 */
export function describeUploadedOuterwear(opts?: {
  category?: string | null;
  color?: string | null;
  description?: string | null;
}): string {
  const description = (opts?.description || '').trim();
  if (description) return description;
  const label = outerwearLabel([opts?.category]);
  const color = (opts?.color || '').trim();
  if (color) return `Your wardrobe ${label} — ${color}`;
  return `The ${label} in your photo`;
}

/** Wardrobe details for the uploaded piece — only when the match is the upload's source item. */
function uploadedOuterwearDetails(
  suggestion: OutfitSuggestion,
  sourceWardrobeCategory?: string | null
): { category?: string | null; color?: string | null; description?: string | null } {
  const sourceId = suggestion.source_wardrobe_item_id ?? null;
  const match = resolveMatchingWardrobeItem(suggestion, 'outerwear');
  const uploadMatch = match && sourceId != null && match.id === sourceId ? match : undefined;

  return {
    category:
      sourceWardrobeCategory ??
      uploadMatch?.category ??
      suggestion.upload_matched_category ??
      suggestion.source_slot,
    color: uploadMatch?.color ?? null,
    description: uploadMatch?.description ?? null,
  };
}

const BLAZER_PLACEHOLDER_PATTERNS = [
  'no structured blazer',
  'outfit built around your outerwear',
];

function isBlazerPlaceholder(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower || lower === 'null' || lower === 'n/a' || lower === 'none') return true;
  if (lower.startsWith('consider adding')) return true;
  return BLAZER_PLACEHOLDER_PATTERNS.some((pattern) => lower.includes(pattern));
}

function isWarmSeason(season?: string | null): boolean {
  const s = (season || '').trim().toLowerCase();
  return s === 'summer' || s === 'warm';
}

function hasMeaningfulLayer(text?: string | null): boolean {
  if (text == null) return false;
  return !isBlazerPlaceholder(String(text));
}

/** Prefer blazer over jacket for work/classic/everyday looks. */
export function prefersBlazerOverJacket(opts?: {
  occasion?: string | null;
  style?: string | null;
}): boolean {
  const occ = (opts?.occasion || '').trim().toLowerCase().replace(/_/g, '-');
  const sty = (opts?.style || '').trim().toLowerCase();
  if (
    [
      'work',
      'business',
      'formal',
      'office',
      'interview',
      'wedding',
      'wedding-guest',
      'date-night',
      'everyday',
    ].includes(occ)
  ) {
    return true;
  }
  if (['classic', 'elegant', 'formal', 'business'].includes(sty)) return true;
  return false;
}

export type LayerDisplayOpts = {
  season?: string | null;
  occasion?: string | null;
  style?: string | null;
};

/** Text for the outerwear slot — never alongside a real blazer; null in summer. */
export function resolveOuterwearDisplayText(
  suggestion: OutfitSuggestion,
  sourceWardrobeCategory?: string | null,
  opts?: LayerDisplayOpts
): string | null {
  const anchor = resolveUploadCategory(suggestion, sourceWardrobeCategory);
  if (isWarmSeason(opts?.season) && anchor !== 'outerwear') {
    return null;
  }

  const raw = suggestion.outerwear;
  const cleanedOuterwear = cleanUploadMarkerText(raw);
  if (cleanedOuterwear != null) {
    if (hasMeaningfulLayer(suggestion.blazer) && anchor !== 'outerwear') {
      return null;
    }
    if (
      hasMeaningfulLayer(suggestion.blazer) &&
      prefersBlazerOverJacket({ occasion: opts?.occasion, style: opts?.style })
    ) {
      return null;
    }
    return cleanedOuterwear;
  }
  if (suggestion.imageUrl && anchor === 'outerwear') {
    return describeUploadedOuterwear(uploadedOuterwearDetails(suggestion, sourceWardrobeCategory));
  }
  return null;
}

/** Jacket/coat upload replaces blazer in the main result grid. */
export function shouldShowAnchoredOuterwearInCoreGrid(
  suggestion: OutfitSuggestion,
  sourceWardrobeCategory?: string | null
): boolean {
  return (
    resolveUploadCategory(suggestion, sourceWardrobeCategory) === 'outerwear' &&
    resolveOuterwearDisplayText(suggestion, sourceWardrobeCategory) != null
  );
}

/** Upload anchors a casual jacket/coat — hide the structured blazer card. */
export function shouldShowBlazerCard(
  suggestion: OutfitSuggestion,
  sourceWardrobeCategory?: string | null
): boolean {
  if (shouldShowAnchoredOuterwearInCoreGrid(suggestion, sourceWardrobeCategory)) return false;
  if (resolveUploadCategory(suggestion, sourceWardrobeCategory) === 'outerwear') return false;
  return !isBlazerPlaceholder(suggestion.blazer ?? '');
}

/** Optional layers after upper-body exclusivity. */
export function optionalLayerCategories(
  suggestion: OutfitSuggestion,
  sourceWardrobeCategory?: string | null,
  opts?: LayerDisplayOpts
): OptionalOutfitCategoryKey[] {
  const anchor = resolveUploadCategory(suggestion, sourceWardrobeCategory);
  const categories: OptionalOutfitCategoryKey[] = ['sweater', 'outerwear', 'tie'];
  if (anchor === 'blazer') {
    return categories.filter((c) => c === 'tie');
  }
  if (anchor === 'outerwear') {
    return categories.filter((c) => c !== 'sweater' && c !== 'outerwear');
  }
  if (isWarmSeason(opts?.season) || shouldShowBlazerCard(suggestion, sourceWardrobeCategory)) {
    return categories.filter((c) => c !== 'outerwear');
  }
  return categories;
}

export function resolveOptionalLayerText(
  suggestion: OutfitSuggestion,
  key: OptionalOutfitCategoryKey,
  sourceWardrobeCategory?: string | null,
  opts?: LayerDisplayOpts
): string | null {
  if (key === 'outerwear') {
    return resolveOuterwearDisplayText(suggestion, sourceWardrobeCategory, opts);
  }
  const raw = suggestion[key];
  if (raw != null && String(raw).trim() !== '') {
    const lower = String(raw).trim().toLowerCase();
    if (lower !== 'null' && lower !== 'none' && lower !== 'n/a') {
      return String(raw);
    }
  }
  return null;
}

export function hasVisibleOptionalLayers(
  suggestion: OutfitSuggestion,
  sourceWardrobeCategory?: string | null,
  opts?: LayerDisplayOpts
): boolean {
  return optionalLayerCategories(suggestion, sourceWardrobeCategory, opts).some(
    (key) => resolveOptionalLayerText(suggestion, key, sourceWardrobeCategory, opts) != null
  );
}
