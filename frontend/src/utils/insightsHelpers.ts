import type { ScoreLabel } from '../models/WardrobeInsightResult';

export const prettyLabel = (value: string): string =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const getColorSwatchValue = (colorName: string): string => {
  const normalized = colorName.trim().toLowerCase();
  const map: Record<string, string> = {
    black: '#111827',
    white: '#f8fafc',
    brown: '#8b5a2b',
    tan: '#d2b48c',
    beige: '#d6c6a8',
    blue: '#2563eb',
    navy: '#1e3a8a',
    gray: '#6b7280',
    grey: '#6b7280',
    green: '#15803d',
    olive: '#556b2f',
    burgundy: '#7f1d1d',
    red: '#b91c1c',
    purple: '#6d28d9',
    pink: '#db2777',
    yellow: '#ca8a04',
    mint: '#6ee7b7',
    pastel: '#fbcfe8',
  };
  return map[normalized] || '#334155';
};

export const categoryForSearch = (rawCategory: string): string => {
  const normalized = rawCategory.trim().toLowerCase();
  if (normalized === 'shirt' || normalized === 'shirts') return 'shirts';
  if (normalized === 'trouser' || normalized === 'trousers') return 'trousers';
  if (normalized === 'shoe' || normalized === 'shoes') return 'shoes';
  if (normalized === 'blazer' || normalized === 'blazers') return 'blazers';
  if (normalized === 'belt' || normalized === 'belts') return 'belts';
  return normalized;
};

const formatSearchList = (items: string[]): string => {
  const labels = items.map((item) => prettyLabel(item)).filter(Boolean);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

export const openShoppingSearch = (category: string, styles: string[], colors: string[]) => {
  const stylePhrase = formatSearchList(styles.length > 0 ? styles : ['classic']);
  const colorPhrase = formatSearchList(colors.length > 0 ? colors : ['neutral']);
  const query = `Show me men ${categoryForSearch(category)} in ${stylePhrase} style and ${colorPhrase} color`;
  const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const openColorShoppingSearch = (
  category: string,
  color: string,
  styles: string[],
  fallbackStyle?: string
) => {
  const effectiveStyles =
    styles.length > 0 ? styles : fallbackStyle ? [fallbackStyle] : ['classic'];
  openShoppingSearch(category, effectiveStyles, [color]);
};

export const SCORE_LABELS: readonly ScoreLabel[] = ['Weak', 'Fair', 'Good', 'Strong'];

export const scoreLabelFromValue = (value: number): ScoreLabel => {
  if (value <= 39) return 'Weak';
  if (value <= 59) return 'Fair';
  if (value <= 79) return 'Good';
  return 'Strong';
};

export const CATEGORY_ORDER = ['shirt', 'trouser', 'blazer', 'shoes', 'belt'] as const;

export const NEUTRAL_COLORS = new Set([
  'black',
  'white',
  'gray',
  'grey',
  'beige',
  'tan',
  'navy',
  'brown',
]);

export const FORMAL_OCCASIONS = new Set(['business', 'formal', 'office']);
export const CASUAL_STYLE_KEYWORDS = ['casual', 'sporty', 'relaxed', 'streetwear'];

/** Mirrors backend WardrobeService.STYLE_LIBRARY — category-scoped style allowlist. */
export const CATEGORY_STYLE_LIBRARY: Record<string, readonly string[]> = {
  shirt: ['oxford', 'linen', 'textured', 'smart casual', 'overshirt'],
  trouser: ['chino', 'slim-fit', 'relaxed-fit', 'tailored', 'straight-leg'],
  blazer: ['unstructured', 'lightweight', 'casual blazer', 'linen blazer', 'soft shoulder'],
  shoes: ['loafers', 'clean sneakers', 'derby shoes', 'driving shoes', 'minimal leather sneakers'],
  belt: ['leather', 'braided', 'reversible', 'formal leather', 'casual leather'],
};

export const filterStylesForCategory = (category: string, styles: string[]): string[] => {
  const allowed = new Set(
    (CATEGORY_STYLE_LIBRARY[category] ?? []).map((tag) => tag.trim().toLowerCase())
  );
  if (allowed.size === 0) return styles;

  const seen = new Set<string>();
  const filtered: string[] = [];
  for (const styleTag of styles) {
    const tag = styleTag.trim().toLowerCase();
    if (tag && allowed.has(tag) && !seen.has(tag)) {
      seen.add(tag);
      filtered.push(styleTag);
    }
  }
  return filtered;
};
