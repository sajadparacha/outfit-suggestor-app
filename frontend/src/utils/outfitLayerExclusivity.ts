import type { OutfitSuggestion } from '../models/OutfitModels';
import { resolveUploadCategory, type OptionalOutfitCategoryKey } from './outfitItemThumbnail';

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
  if (raw != null && String(raw).trim() !== '') {
    const lower = String(raw).trim().toLowerCase();
    if (lower !== 'null' && lower !== 'none' && lower !== 'n/a') {
      if (hasMeaningfulLayer(suggestion.blazer) && anchor !== 'outerwear') {
        return null;
      }
      if (
        hasMeaningfulLayer(suggestion.blazer) &&
        prefersBlazerOverJacket({ occasion: opts?.occasion, style: opts?.style })
      ) {
        return null;
      }
      return String(raw);
    }
  }
  if (suggestion.imageUrl && anchor === 'outerwear') {
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
