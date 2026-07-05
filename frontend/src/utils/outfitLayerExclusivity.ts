import type { OutfitSuggestion } from '../models/OutfitModels';
import { resolveUploadCategory, type OptionalOutfitCategoryKey } from './outfitItemThumbnail';

const BLAZER_PLACEHOLDER_PATTERNS = [
  'no structured blazer',
  'outfit built around your outerwear',
];

function isBlazerPlaceholder(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower || lower === 'null' || lower === 'n/a' || lower === 'none') return true;
  return BLAZER_PLACEHOLDER_PATTERNS.some((pattern) => lower.includes(pattern));
}

/** Text for the outerwear slot — synthesizes when upload anchors a jacket but API omitted outerwear. */
export function resolveOuterwearDisplayText(
  suggestion: OutfitSuggestion,
  sourceWardrobeCategory?: string | null
): string | null {
  const raw = suggestion.outerwear;
  if (raw != null && String(raw).trim() !== '') {
    const lower = String(raw).trim().toLowerCase();
    if (lower !== 'null' && lower !== 'none' && lower !== 'n/a') {
      return String(raw);
    }
  }
  if (
    suggestion.imageUrl &&
    resolveUploadCategory(suggestion, sourceWardrobeCategory) === 'outerwear'
  ) {
    return 'Your wardrobe jacket (uploaded item)';
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

/** Optional layers after upper-body exclusivity (no sweater/outerwear when blazer is anchor). */
export function optionalLayerCategories(
  suggestion: OutfitSuggestion,
  sourceWardrobeCategory?: string | null
): OptionalOutfitCategoryKey[] {
  const anchor = resolveUploadCategory(suggestion, sourceWardrobeCategory);
  const categories: OptionalOutfitCategoryKey[] = ['sweater', 'outerwear', 'tie'];
  if (anchor === 'blazer') {
    return categories.filter((c) => c === 'tie');
  }
  if (anchor === 'outerwear') {
    // Outerwear shown in core grid when it is the upload anchor.
    return categories.filter((c) => c !== 'sweater' && c !== 'outerwear');
  }
  return categories;
}

export function resolveOptionalLayerText(
  suggestion: OutfitSuggestion,
  key: OptionalOutfitCategoryKey,
  sourceWardrobeCategory?: string | null
): string | null {
  const raw = suggestion[key];
  if (raw != null && String(raw).trim() !== '') {
    const lower = String(raw).trim().toLowerCase();
    if (lower !== 'null' && lower !== 'none' && lower !== 'n/a') {
      return String(raw);
    }
  }
  if (key === 'outerwear') {
    return resolveOuterwearDisplayText(suggestion, sourceWardrobeCategory);
  }
  return null;
}

export function hasVisibleOptionalLayers(
  suggestion: OutfitSuggestion,
  sourceWardrobeCategory?: string | null
): boolean {
  return optionalLayerCategories(suggestion, sourceWardrobeCategory).some(
    (key) => resolveOptionalLayerText(suggestion, key, sourceWardrobeCategory) != null
  );
}
