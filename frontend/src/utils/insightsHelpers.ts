import type {
  ItemPriority,
  ScoreLabel,
  WardrobeInsightContext,
  WardrobeMissingItem,
} from '../models/WardrobeInsightResult';

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

/** Hardcoded this iteration; future: REACT_APP_SHOPPING_GENDER */
export const SHOPPING_GENDER_PREFIX = "men's";

export const categoryForSearch = (rawCategory: string): string => {
  const normalized = rawCategory.trim().toLowerCase();
  if (normalized === 'shirt' || normalized === 'shirts') return 'shirts';
  if (normalized === 'trouser' || normalized === 'trousers') return 'trousers';
  if (normalized === 'shoe' || normalized === 'shoes') return 'shoes';
  if (normalized === 'blazer' || normalized === 'blazers') return 'blazers';
  if (normalized === 'belt' || normalized === 'belts') return 'belts';
  if (normalized === 'sweater' || normalized === 'sweaters') return 'sweater';
  if (normalized === 'jacket' || normalized === 'jackets') return 'jacket';
  if (normalized === 'tie' || normalized === 'ties') return 'tie';
  return normalized;
};

const formatSearchList = (items: string[]): string => {
  const labels = items.map((item) => prettyLabel(item)).filter(Boolean);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

export const buildShoppingSearchUrl = (category: string, styles: string[], colors: string[]): string => {
  const stylePhrase = formatSearchList(styles.length > 0 ? styles : ['classic']);
  const colorPhrase = formatSearchList(colors.length > 0 ? colors : ['neutral']);
  const query = `Show me ${SHOPPING_GENDER_PREFIX} ${categoryForSearch(category)} in ${stylePhrase} style and ${colorPhrase} color`;
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
};

export const openShoppingSearch = (category: string, styles: string[], colors: string[]) => {
  window.open(buildShoppingSearchUrl(category, styles, colors), '_blank', 'noopener,noreferrer');
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

export interface ShoppingListTuple {
  style: string;
  color: string;
}

export interface ShoppingListComboLink {
  style: string;
  color: string;
  label: string;
  url: string;
}

export interface ShoppingListRow {
  id: string;
  itemLabel: string;
  cleanLabel: string;
  category: string;
  priority: ItemPriority;
  styles: string[];
  colors: string[];
  tuples: ShoppingListTuple[];
  tupleText: string;
  lookForText: string;
  comboLinks: ShoppingListComboLink[];
  searchAllUrl: string;
  /** @deprecated Use searchAllUrl — kept for existing callers */
  googleShoppingUrl: string;
  exportUrl: string;
}

export const SHOPPING_LIST_SEARCH_ALL_LIMIT = 3;

const CATEGORY_DISPLAY_LABELS: Record<string, string> = {
  shirt: 'Shirt',
  shirts: 'Shirt',
  trouser: 'Trousers',
  trousers: 'Trousers',
  shoe: 'Shoes',
  shoes: 'Shoes',
  blazer: 'Blazer',
  blazers: 'Blazer',
  sweater: 'Sweater',
  sweaters: 'Sweater',
  jacket: 'Jacket',
  jackets: 'Jacket',
  tie: 'Tie',
  ties: 'Tie',
  belt: 'Belt',
  belts: 'Belt',
};

const dedupeWords = (label: string): string => {
  const words = label.split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const word of words) {
    const key = word.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(word);
    }
  }

  return result.join(' ');
};

const categoryStem = (category: string): string =>
  category.trim().toLowerCase().replace(/s$/, '');

const NON_TAXONOMY_JUNK_TERMS = new Set([
  'dress',
  'dresses',
  'gown',
  'gowns',
  'skirt',
  'skirts',
  'blouse',
  'blouses',
  'romper',
  'rompers',
  'jumpsuit',
  'jumpsuits',
]);

const ITERATION_2_CATEGORY_VOCABULARY = new Set([
  'shirt',
  'shirts',
  'trouser',
  'trousers',
  'pants',
  'blazer',
  'blazers',
  'suit',
  'suits',
  'sweater',
  'sweaters',
  'jacket',
  'jackets',
  'shoe',
  'shoes',
  'belt',
  'belts',
  'tie',
  'ties',
]);

const COLOR_AND_MATERIAL_WORDS = new Set([
  'black',
  'white',
  'gray',
  'grey',
  'beige',
  'tan',
  'navy',
  'brown',
  'burgundy',
  'red',
  'blue',
  'green',
  'olive',
  'purple',
  'pink',
  'yellow',
  'mint',
  'pastel',
  'neutral',
  'merino',
  'linen',
  'cotton',
  'wool',
  'silk',
  'leather',
  'denim',
  'cashmere',
  'knit',
  'fleece',
  'corduroy',
  'suede',
  'canvas',
  'nylon',
  'polyester',
  'velvet',
]);

const isColorOrMaterialWord = (word: string): boolean =>
  COLOR_AND_MATERIAL_WORDS.has(word.toLowerCase());

const hasIteration2VocabularyOverlap = (words: string[]): boolean =>
  words.some((word) => ITERATION_2_CATEGORY_VOCABULARY.has(word.toLowerCase()));

export const cleanShoppingItemLabel = (name: string, category: string): string => {
  const catKey = category.trim().toLowerCase();
  const categoryLabel = CATEGORY_DISPLAY_LABELS[catKey] ?? prettyLabel(category);
  const rawName = prettyLabel(name || category);
  const rawWords = rawName.toLowerCase().split(/\s+/).filter(Boolean);
  const stem = categoryStem(category);

  const isCategoryWord = (word: string): boolean =>
    word === catKey || word === stem || word === categoryLabel.toLowerCase();

  const categoryRepeatCount = rawWords.filter(isCategoryWord).length;
  if (categoryRepeatCount >= 2) {
    return categoryLabel;
  }

  const nameLabel = dedupeWords(rawName);
  const nameWords = nameLabel.toLowerCase().split(/\s+/).filter(Boolean);
  const nonCategoryWords = nameWords.filter((word) => !isCategoryWord(word));

  if (nonCategoryWords.length === 0) {
    return categoryLabel;
  }

  if (nonCategoryWords.some((word) => NON_TAXONOMY_JUNK_TERMS.has(word))) {
    return categoryLabel;
  }

  if (!hasIteration2VocabularyOverlap(nameWords)) {
    return categoryLabel;
  }

  if (
    nonCategoryWords.length === 1 &&
    nameWords.length <= 3 &&
    isColorOrMaterialWord(nonCategoryWords[0])
  ) {
    return categoryLabel;
  }

  return nameLabel;
};

const formatColorOrList = (colors: string[]): string => {
  const lowered = colors.map((color) => color.toLowerCase());
  if (lowered.length === 0) return 'neutral';
  if (lowered.length === 1) return lowered[0];
  if (lowered.length === 2) return `${lowered[0]} or ${lowered[1]}`;
  return `${lowered.slice(0, -1).join(', ')}, or ${lowered[lowered.length - 1]}`;
};

const capitalizeFirst = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

export const formatLookForText = (tuples: ShoppingListTuple[]): string => {
  if (tuples.length === 0) return 'Classic neutral';

  if (tuples.length === 1) {
    const { style, color } = tuples[0];
    if (style.toLowerCase() === 'classic' && color.toLowerCase() === 'neutral') {
      return 'Classic neutral';
    }
  }

  const styleGroups: { style: string; colors: string[] }[] = [];
  const seenStyles = new Set<string>();

  for (const tuple of tuples) {
    const styleKey = tuple.style.toLowerCase();
    let group = styleGroups.find((entry) => entry.style.toLowerCase() === styleKey);
    if (!group) {
      group = { style: tuple.style, colors: [] };
      styleGroups.push(group);
      seenStyles.add(styleKey);
    }
    if (!group.colors.some((color) => color.toLowerCase() === tuple.color.toLowerCase())) {
      group.colors.push(tuple.color);
    }
  }

  const phrases = styleGroups.map(
    (group) => `${formatColorOrList(group.colors)} ${group.style.toLowerCase()}`
  );

  if (phrases.length === 1) {
    return capitalizeFirst(phrases[0]);
  }

  const first = capitalizeFirst(phrases[0]);
  const rest = phrases.slice(1);
  const last = `${rest.pop()} OK`;
  const middle = rest.join('; ');
  return [first, middle, last].filter(Boolean).join('; ');
};

export const buildComboSearchUrl = (
  category: string,
  style: string,
  color: string
): string => buildShoppingSearchUrl(category, [style], [color]);

export const buildSearchAllUrl = (category: string, tuples: ShoppingListTuple[]): string => {
  const limited = tuples.slice(0, SHOPPING_LIST_SEARCH_ALL_LIMIT);
  if (limited.length === 0) {
    return buildShoppingSearchUrl(category, ['classic'], ['neutral']);
  }

  const comboPhrase = limited.map((tuple) => `${tuple.style} ${tuple.color}`).join(' ');
  const query = `Show me ${SHOPPING_GENDER_PREFIX} ${categoryForSearch(category)} ${comboPhrase}`.trim();
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
};

const uniquePrettyValues = (values: string[], fallback: string): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const label = prettyLabel(value.trim());
    const key = label.toLowerCase();
    if (label && !seen.has(key)) {
      seen.add(key);
      normalized.push(label);
    }
  }

  return normalized.length > 0 ? normalized : [prettyLabel(fallback)];
};

export const buildStyleColorTuples = (
  styles: string[],
  colors: string[]
): ShoppingListTuple[] => {
  const normalizedStyles = uniquePrettyValues(styles, 'classic');
  const normalizedColors = uniquePrettyValues(colors, 'neutral');

  return normalizedStyles.flatMap((style) =>
    normalizedColors.map((color) => ({ style, color }))
  );
};

export const formatStyleColorTuples = (tuples: ShoppingListTuple[]): string =>
  tuples.map((tuple) => `(${tuple.style}, ${tuple.color})`).join(', ');

export const SHOPPING_LIST_TUPLE_PREVIEW_LIMIT = 6;

export const formatStyleColorTuplePreview = (
  tuples: ShoppingListTuple[],
  limit = SHOPPING_LIST_TUPLE_PREVIEW_LIMIT
): string => {
  if (tuples.length <= limit) return formatStyleColorTuples(tuples);

  const visibleTuples = tuples.slice(0, limit);
  return `${formatStyleColorTuples(visibleTuples)} +${tuples.length - limit} more`;
};

export const buildShoppingListRows = (items: WardrobeMissingItem[]): ShoppingListRow[] =>
  items.map((item) => {
    const tuples = buildStyleColorTuples(item.worksWith, item.bestColors);
    const category = item.category || item.name;
    const cleanLabel = cleanShoppingItemLabel(item.name, category);
    const itemLabel = cleanLabel;
    const searchAllUrl = buildSearchAllUrl(category, tuples);
    const comboLinks = tuples.map((tuple) => ({
      style: tuple.style,
      color: tuple.color,
      label: `${tuple.style} · ${tuple.color}`,
      url: buildComboSearchUrl(category, tuple.style, tuple.color),
    }));
    const exportUrl = searchAllUrl || comboLinks[0]?.url || '';

    return {
      id: item.id,
      itemLabel,
      cleanLabel,
      category,
      priority: item.priority,
      styles: uniquePrettyValues(item.worksWith, 'classic'),
      colors: uniquePrettyValues(item.bestColors, 'neutral'),
      tuples,
      tupleText: formatStyleColorTuples(tuples),
      lookForText: formatLookForText(tuples),
      comboLinks,
      searchAllUrl,
      googleShoppingUrl: searchAllUrl,
      exportUrl,
    };
  });

const formatContextLine = (context: WardrobeInsightContext): string =>
  `${prettyLabel(context.occasion)} · ${prettyLabel(context.season)} · ${prettyLabel(context.style)}`;

export const buildCopyListText = (
  rows: ShoppingListRow[],
  context?: WardrobeInsightContext
): string => {
  const lines = ['ClosIQ Shopping List'];

  if (context) {
    lines.push(`For: ${formatContextLine(context)}`);
  }

  lines.push('');

  if (rows.length === 0) {
    lines.push('No shopping list items for this analysis.');
    return lines.join('\n');
  }

  rows.forEach((row, index) => {
    lines.push(`${index + 1}. ${row.cleanLabel} (${row.priority})`);
    lines.push(`   → ${row.lookForText}`);
    lines.push(`   ${row.exportUrl}`);
    lines.push('');
  });

  return lines.join('\n').trimEnd();
};

export const buildWhatsAppShoppingListText = (
  rows: ShoppingListRow[],
  context?: WardrobeInsightContext
): string => {
  const lines = ['🛍 ClosIQ Shopping List'];

  if (context) {
    lines.push(`For: ${formatContextLine(context)}`);
  }

  lines.push('');

  if (rows.length === 0) {
    lines.push('No shopping list items for this analysis.');
    return lines.join('\n');
  }

  rows.forEach((row, index) => {
    lines.push(`${index + 1}. ${row.cleanLabel} (${row.priority})`);
    lines.push(`   → ${row.lookForText}`);
    lines.push(`   🔗 ${row.exportUrl}`);
    lines.push('');
  });

  return lines.join('\n').trimEnd();
};

export const buildPrintShoppingListText = (
  rows: ShoppingListRow[],
  context?: WardrobeInsightContext
): string => buildCopyListText(rows, context);

export const buildWhatsAppShoppingListUrl = (
  rows: ShoppingListRow[],
  context?: WardrobeInsightContext
): string => `https://wa.me/?text=${encodeURIComponent(buildWhatsAppShoppingListText(rows, context))}`;

export const SCORE_LABELS: readonly ScoreLabel[] = ['Weak', 'Fair', 'Good', 'Strong'];

export const scoreLabelFromValue = (value: number): ScoreLabel => {
  if (value <= 39) return 'Weak';
  if (value <= 59) return 'Fair';
  if (value <= 79) return 'Good';
  return 'Strong';
};

export const CATEGORY_ORDER = ['shirt', 'trouser', 'blazer', 'sweater', 'jacket', 'shoes', 'belt'] as const;

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
  sweater: ['crew neck', 'v-neck', 'cardigan', 'merino', 'cable knit'],
  jacket: ['bomber', 'denim jacket', 'field jacket', 'lightweight shell', 'harrington'],
  tie: ['silk', 'knit tie', 'classic width', 'textured', 'solid'],
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
