import { prettyLabel } from './insightsHelpers';

export type WardrobeFilterChipKind = 'core' | 'extended';

export interface WardrobeFilterChip {
  key: string;
  label: string;
  kind: WardrobeFilterChipKind;
}

export interface WardrobeCategorySummary {
  total_items?: number;
  by_category?: Record<string, number>;
}

export const WARDROBE_CORE_FILTER_CHIPS: WardrobeFilterChip[] = [
  { key: 'shirt', label: 'Shirt', kind: 'core' },
  { key: 'trouser', label: 'Trousers', kind: 'core' },
  { key: 'blazer', label: 'Blazer', kind: 'core' },
  { key: 'shoes', label: 'Shoes', kind: 'core' },
  { key: 'belt', label: 'Belt', kind: 'core' },
];

export const WARDROBE_EXTENDED_FILTER_CHIPS: WardrobeFilterChip[] = [
  { key: 'polo', label: 'Polo', kind: 'extended' },
  { key: 't_shirt', label: 'T-shirt', kind: 'extended' },
  { key: 'jeans', label: 'Jeans', kind: 'extended' },
  { key: 'shorts', label: 'Shorts', kind: 'extended' },
  { key: 'sweater', label: 'Sweater', kind: 'extended' },
  { key: 'jacket', label: 'Jacket', kind: 'extended' },
  { key: 'tie', label: 'Tie', kind: 'extended' },
  { key: 'other', label: 'Other', kind: 'extended' },
];

const CORE_GROUP_MATCHERS: Record<string, readonly string[]> = {
  shirt: ['shirt', 't_shirt', 't-shirt', 'polo', 'tshirt', 'tee'],
  trouser: ['trouser', 'trousers', 'pants', 'jeans', 'shorts'],
  blazer: ['blazer', 'blazers', 'suit'],
  shoes: ['shoe', 'shoes'],
  belt: ['belt', 'belts'],
};

const EXTENDED_MATCHERS: Record<string, readonly string[]> = {
  polo: ['polo'],
  t_shirt: ['t_shirt', 't-shirt', 'tshirt'],
  jeans: ['jeans'],
  shorts: ['shorts'],
  sweater: ['sweater', 'sweaters'],
  jacket: ['jacket', 'jackets'],
  tie: ['tie', 'ties'],
};

const CATEGORY_BADGE_LABELS: Record<string, string> = {
  shirt: 'Shirt',
  polo: 'Polo',
  t_shirt: 'T-shirt',
  't-shirt': 'T-shirt',
  tshirt: 'T-shirt',
  trouser: 'Trousers',
  trousers: 'Trousers',
  pants: 'Trousers',
  jeans: 'Jeans',
  shorts: 'Shorts',
  blazer: 'Blazer',
  jacket: 'Jacket',
  jackets: 'Jacket',
  shoes: 'Shoes',
  shoe: 'Shoes',
  belt: 'Belt',
  belts: 'Belt',
  sweater: 'Sweater',
  sweaters: 'Sweater',
  tie: 'Tie',
  ties: 'Tie',
};

const ALL_CORE_MATCH_VALUES = new Set(
  Object.values(CORE_GROUP_MATCHERS).flatMap((values) => values)
);

const ALL_EXTENDED_MATCH_VALUES = new Set(
  Object.values(EXTENDED_MATCHERS).flatMap((values) => values)
);

export const WARDROBE_FORM_CATEGORIES = ['shirt', 'trouser', 'blazer', 'shoes', 'belt', 'other'] as const;

export const normalizeWardrobeCategory = (category: string): string =>
  category.trim().toLowerCase();

const matchesAnyInSet = (category: string, values: readonly string[]): boolean => {
  const normalized = normalizeWardrobeCategory(category);
  return values.some((value) => normalizeWardrobeCategory(value) === normalized);
};

const isOtherCategory = (category: string): boolean => {
  const normalized = normalizeWardrobeCategory(category);
  if (ALL_CORE_MATCH_VALUES.has(normalized)) {
    return false;
  }
  if (ALL_EXTENDED_MATCH_VALUES.has(normalized)) {
    return false;
  }
  return true;
};

export const matchesWardrobeCategoryFilter = (
  itemCategory: string,
  filterKey: string | null
): boolean => {
  if (!filterKey) {
    return true;
  }

  if (filterKey === 'other') {
    return isOtherCategory(itemCategory);
  }

  const coreMatchers = CORE_GROUP_MATCHERS[filterKey];
  if (coreMatchers) {
    return matchesAnyInSet(itemCategory, coreMatchers);
  }

  const extendedMatchers = EXTENDED_MATCHERS[filterKey];
  if (extendedMatchers) {
    return matchesAnyInSet(itemCategory, extendedMatchers);
  }

  return normalizeWardrobeCategory(itemCategory) === normalizeWardrobeCategory(filterKey);
};

export const wardrobeCategoryLabel = (category: string): string => {
  const normalized = normalizeWardrobeCategory(category);
  return CATEGORY_BADGE_LABELS[normalized] ?? (isOtherCategory(category) ? 'Other' : prettyLabel(category));
};

const getSummaryCountForCategoryKey = (
  summary: WardrobeCategorySummary | null | undefined,
  categoryKey: string
): number => {
  if (!summary?.by_category) {
    return 0;
  }

  const normalizedKey = normalizeWardrobeCategory(categoryKey);
  for (const [key, value] of Object.entries(summary.by_category)) {
    if (normalizeWardrobeCategory(key) === normalizedKey) {
      return value;
    }
  }
  return 0;
};

export const getCoreFilterCount = (
  summary: WardrobeCategorySummary | null | undefined,
  filterKey: string
): number => {
  const matchers = CORE_GROUP_MATCHERS[filterKey];
  if (!summary?.by_category || !matchers) {
    return 0;
  }

  return Object.entries(summary.by_category).reduce((total, [category, count]) => {
    if (matchesAnyInSet(category, matchers)) {
      return total + count;
    }
    return total;
  }, 0);
};

export const getExtendedFilterCount = (
  summary: WardrobeCategorySummary | null | undefined,
  filterKey: string
): number => {
  if (filterKey === 'other') {
    return getOtherFilterCount(summary);
  }

  const matchers = EXTENDED_MATCHERS[filterKey];
  if (!summary?.by_category || !matchers) {
    return 0;
  }

  return Object.entries(summary.by_category).reduce((total, [category, count]) => {
    if (matchesAnyInSet(category, matchers)) {
      return total + count;
    }
    return total;
  }, 0);
};

export const getOtherFilterCount = (
  summary: WardrobeCategorySummary | null | undefined
): number => {
  if (!summary?.by_category) {
    return 0;
  }

  return Object.entries(summary.by_category).reduce((total, [category, count]) => {
    if (isOtherCategory(category)) {
      return total + count;
    }
    return total;
  }, 0);
};

export const getFilterChipCount = (
  summary: WardrobeCategorySummary | null | undefined,
  filterKey: string
): number => {
  if (WARDROBE_CORE_FILTER_CHIPS.some((chip) => chip.key === filterKey)) {
    return getCoreFilterCount(summary, filterKey);
  }

  if (filterKey === 'other') {
    return getOtherFilterCount(summary);
  }

  return getExtendedFilterCount(summary, filterKey);
};

export const getVisibleFilterChips = (
  summary: WardrobeCategorySummary | null | undefined
): WardrobeFilterChip[] => {
  const chips: WardrobeFilterChip[] = [...WARDROBE_CORE_FILTER_CHIPS];

  WARDROBE_EXTENDED_FILTER_CHIPS.forEach((chip) => {
    if (getFilterChipCount(summary, chip.key) > 0) {
      chips.push(chip);
    }
  });

  return chips;
};

/** Grouped core and multi-alias extended filters need client-side matching on loaded items. */
export const usesClientSideCategoryFilter = (filterKey: string | null): boolean => {
  if (!filterKey) {
    return false;
  }

  if (filterKey === 'other') {
    return true;
  }

  if (WARDROBE_CORE_FILTER_CHIPS.some((chip) => chip.key === filterKey)) {
    return true;
  }

  return ['t_shirt', 'sweater', 'jacket', 'tie'].includes(filterKey);
};

export const apiCategoryParamForFilter = (filterKey: string | null): string | undefined => {
  if (!filterKey || usesClientSideCategoryFilter(filterKey)) {
    return undefined;
  }
  return filterKey;
};

export const getSummaryCountForStoredCategory = getSummaryCountForCategoryKey;
