import {
  CoverageStatus,
  ItemPriority,
  WardrobeCategoryHealth,
  WardrobeInsightResult,
  WardrobeMissingItem,
  WardrobeTopPriority,
} from '../models/WardrobeInsightResult';
import {
  WardrobeCategoryGap,
  WardrobeGapAnalysisResponse,
  WardrobePriorityShoppingItem,
} from '../models/WardrobeModels';
import {
  CASUAL_STYLE_KEYWORDS,
  CATEGORY_ORDER,
  filterStylesForCategory,
  FORMAL_OCCASIONS,
  NEUTRAL_COLORS,
  prettyLabel,
  scoreLabelFromValue,
} from './insightsHelpers';

export type StylePriority = 'Essential' | 'Useful' | 'Skip';

const PRIORITY_RANK: Record<StylePriority, number> = {
  Essential: 0,
  Useful: 1,
  Skip: 2,
};

export const stylePriorityFor = (
  style: string,
  priorities?: Record<string, StylePriority>
): StylePriority | undefined => {
  if (!priorities) return undefined;
  if (priorities[style]) return priorities[style];
  return priorities[style.trim().toLowerCase()];
};

export const sortStylesByPriority = (
  styles: string[],
  priorities?: Record<string, StylePriority>
): string[] => {
  if (!priorities || Object.keys(priorities).length === 0) {
    return [...styles];
  }

  return [...styles].sort((a, b) => {
    const rankA = PRIORITY_RANK[stylePriorityFor(a, priorities) ?? 'Useful'];
    const rankB = PRIORITY_RANK[stylePriorityFor(b, priorities) ?? 'Useful'];
    return rankA - rankB;
  });
};

export const priorityMissingStyles = (
  styles: string[],
  priorities?: Record<string, StylePriority>,
  limit = 10
): string[] => {
  const sorted = sortStylesByPriority(styles, priorities);
  if (!priorities || Object.keys(priorities).length === 0) {
    return sorted;
  }

  return sorted
    .filter((style) => stylePriorityFor(style, priorities) !== 'Skip')
    .slice(0, limit);
};

const mergeStylePriorities = (
  maps: Array<Record<string, StylePriority> | undefined>
): Record<string, StylePriority> | undefined => {
  const merged: Record<string, StylePriority> = {};
  maps.forEach((map) => {
    if (!map) return;
    Object.entries(map).forEach(([tag, priority]) => {
      const existing = merged[tag];
      if (!existing || PRIORITY_RANK[priority] < PRIORITY_RANK[existing]) {
        merged[tag] = priority;
      }
    });
  });
  return Object.keys(merged).length > 0 ? merged : undefined;
};

const categoryDisplayNames: Record<string, string> = {
  shirt: 'Shirts',
  trouser: 'Trousers',
  shoes: 'Shoes',
  blazer: 'Blazers',
  sweater: 'Sweaters',
  jacket: 'Jackets',
  tie: 'Ties',
  belt: 'Belts',
  colors: 'Colors',
  styles: 'Styles',
};

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values));

const colorMatchKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, ' ')
    .trim()
    .replace(/grey/g, 'gray');

const styleMatchKey = (value: string): string => value.trim().toLowerCase();

const dropOwned = (
  missing: string[],
  owned: string[],
  matchKey: (value: string) => string
): string[] => {
  const ownedKeys = new Set(owned.map(matchKey));
  return missing.filter((item) => !ownedKeys.has(matchKey(item)));
};

const remainingMissingColors = (entry: WardrobeCategoryGap): string[] =>
  dropOwned(entry.missing_colors, entry.owned_colors, colorMatchKey);

const remainingMissingStyles = (category: string, entry: WardrobeCategoryGap): string[] =>
  dropOwned(
    filterStylesForCategory(category, entry.missing_styles),
    entry.owned_styles,
    styleMatchKey
  );

const isClothingCategory = (category: string): boolean =>
  category !== 'colors' && category !== 'styles';

const gapScore = (entry: WardrobeCategoryGap): number =>
  entry.missing_colors.length * 2 + entry.missing_styles.length * 2 + (entry.item_count === 0 ? 2 : 0);

const priorityFromScore = (score: number): ItemPriority =>
  score >= 8 ? 'High' : score >= 4 ? 'Medium' : 'Low';

const categoryStatusFromGap = (entry: WardrobeCategoryGap): CoverageStatus => {
  if (entry.item_count === 0) return 'Missing';
  const score = gapScore(entry);
  if (score >= 8) return 'Weak';
  if (score >= 4) return 'Medium';
  return 'Good';
};

const orderedCategories = (result: WardrobeGapAnalysisResponse): string[] => {
  const fromResponse = Object.keys(result.analysis_by_category);
  const extras = fromResponse.filter((category) => !CATEGORY_ORDER.includes(category as typeof CATEGORY_ORDER[number]));
  return [...CATEGORY_ORDER, ...extras].filter((category) => result.analysis_by_category[category]);
};

const shoppingItemFromCategory = (
  result: WardrobeGapAnalysisResponse,
  category: string
): (WardrobePriorityShoppingItem & { score: number }) | null => {
  const entry = result.analysis_by_category[category];
  if (!entry) return null;

  const missingColors = remainingMissingColors(entry);
  const remainingStyles = remainingMissingStyles(category, entry);
  const rankedStyles = priorityMissingStyles(
    sortStylesByPriority(remainingStyles, entry.style_priorities),
    entry.style_priorities,
    remainingStyles.length
  );
  if (missingColors.length === 0 && rankedStyles.length === 0) return null;

  const score = gapScore(entry);
  return {
    score,
    rank: 0,
    itemName: categoryDisplayNames[category] || prettyLabel(category),
    category,
    priority: priorityFromScore(score),
    recommendedColors: missingColors,
    recommendedStyles: rankedStyles,
    reason: `Improves your ${result.style} ${result.occasion} options for ${result.season}.`,
    outfitImpact: `Unlocks more complete looks in ${prettyLabel(category)}.`,
    actions: ['Show outfit examples'],
  };
};

const rerankShoppingList = (items: WardrobePriorityShoppingItem[]): WardrobePriorityShoppingItem[] =>
  items.map((item, idx) => ({ ...item, rank: idx + 1 }));

const derivePriorityList = (
  result: WardrobeGapAnalysisResponse,
  categories: string[]
): WardrobePriorityShoppingItem[] => {
  const clothingCategories = categories.filter(isClothingCategory);

  if (result.priorityShoppingList?.length) {
    const merged: WardrobePriorityShoppingItem[] = [...result.priorityShoppingList];
    const present = new Set(merged.map((item) => item.category));
    clothingCategories.forEach((category) => {
      if (present.has(category)) return;
      const derived = shoppingItemFromCategory(result, category);
      if (!derived) return;
      const { score: _score, ...item } = derived;
      merged.push(item);
      present.add(category);
    });
    return rerankShoppingList(merged);
  }

  type RankedPriority = WardrobePriorityShoppingItem & { score: number };
  const ranked: RankedPriority[] = clothingCategories
    .map((category) => shoppingItemFromCategory(result, category))
    .filter((item): item is RankedPriority => item !== null && item.score > 0)
    .sort((a, b) => b.score - a.score);

  return rerankShoppingList(ranked.map(({ score: _score, ...item }) => item));
};

const deriveScoreValue = (result: WardrobeGapAnalysisResponse, categories: string[]): number => {
  let penalty = 0;
  let categoryCount = 0;

  for (const category of categories) {
    const entry = result.analysis_by_category[category];
    categoryCount += 1;
    penalty += entry.missing_colors.length * 3;
    penalty += entry.missing_styles.length * 3;
    if (entry.item_count === 0) penalty += 12;
  }

  const maxPenalty = Math.max(categoryCount * 18, 1);
  const raw = 100 - Math.round((penalty / maxPenalty) * 60);
  return Math.max(0, Math.min(100, raw));
};

const buildColorsHealth = (
  result: WardrobeGapAnalysisResponse,
  categories: string[]
): WardrobeCategoryHealth => {
  const allOwned: string[] = [];
  const allMissing: string[] = [];
  categories.forEach((category) => {
    const entry = result.analysis_by_category[category];
    allOwned.push(...entry.owned_colors);
    allMissing.push(...remainingMissingColors(entry));
  });

  const missingNeutrals = allMissing.filter((color) => {
    const normalized = color.trim().toLowerCase();
    return NEUTRAL_COLORS.has(normalized) || Array.from(NEUTRAL_COLORS).some((n) => normalized.includes(n));
  });

  let status: CoverageStatus = 'Good';
  if (missingNeutrals.length >= 3) {
    status = 'Needs neutrals';
  } else if (allMissing.length >= 6) {
    status = 'Weak';
  } else if (allMissing.length >= 3) {
    status = 'Medium';
  }

  const summary =
    status === 'Needs neutrals'
      ? 'Add more neutral tones to balance your palette.'
      : allMissing.length === 0
        ? 'Your color range looks balanced.'
        : `${allMissing.length} color gaps across categories.`;

  const ownedColors = uniqueStrings(allOwned);
  const missingColors = dropOwned(uniqueStrings(allMissing), ownedColors, colorMatchKey);

  return {
    id: 'colors',
    category: 'Colors',
    status,
    summary,
    details: `Owned: ${ownedColors.length} colors. Missing: ${missingColors.length} colors.`,
    ownedColors,
    ownedStyles: [],
    missingColors,
    missingStyles: [],
    recommendedStep:
      missingNeutrals.length > 0
        ? 'Start with black, navy, gray, or beige pieces that pair with everything.'
        : 'Add accent colors that complement your neutrals.',
  };
};

const buildStylesHealth = (
  result: WardrobeGapAnalysisResponse,
  categories: string[]
): WardrobeCategoryHealth => {
  const allOwned: string[] = [];
  const allMissing: string[] = [];
  categories.forEach((category) => {
    const entry = result.analysis_by_category[category];
    allOwned.push(...filterStylesForCategory(category, entry.owned_styles));
    allMissing.push(...remainingMissingStyles(category, entry));
  });

  const occasion = result.occasion.trim().toLowerCase();
  const isFormalContext = FORMAL_OCCASIONS.has(occasion) || result.style.toLowerCase().includes('formal');
  const casualMissing = allMissing.filter((style) =>
    CASUAL_STYLE_KEYWORDS.some((keyword) => style.toLowerCase().includes(keyword))
  );

  let status: CoverageStatus = 'Good';
  if (isFormalContext && casualMissing.length >= 2) {
    status = 'Too casual';
  } else if (allMissing.length >= 5) {
    status = 'Weak';
  } else if (allMissing.length >= 2) {
    status = 'Medium';
  }

  const summary =
    status === 'Too casual'
      ? 'Your wardrobe leans casual for this occasion.'
      : allMissing.length === 0
        ? 'Style coverage matches your goals.'
        : `${allMissing.length} style gaps to address.`;

  const ownedStyles = uniqueStrings(allOwned);
  const stylePriorities = mergeStylePriorities(
    categories.map((category) => result.analysis_by_category[category]?.style_priorities)
  );
  const missingStyles = sortStylesByPriority(
    dropOwned(uniqueStrings(allMissing), ownedStyles, styleMatchKey),
    stylePriorities
  );

  return {
    id: 'styles',
    category: 'Styles',
    status,
    summary,
    details: `Owned: ${ownedStyles.length} styles. Missing: ${missingStyles.length} styles.`,
    ownedColors: [],
    ownedStyles,
    missingColors: [],
    missingStyles,
    stylePriorities,
    recommendedStep: isFormalContext
      ? 'Add tailored or structured pieces for formal occasions.'
      : 'Introduce one new style direction to expand outfit options.',
  };
};

const buildCategoryHealth = (
  result: WardrobeGapAnalysisResponse,
  categories: string[]
): WardrobeCategoryHealth[] => {
  const items: WardrobeCategoryHealth[] = categories.map((category) => {
    const entry = result.analysis_by_category[category];
    const displayName = categoryDisplayNames[category] || prettyLabel(category);
    const status = categoryStatusFromGap(entry);
    const recommendedStep =
      entry.recommended_purchases[0] || `Add one versatile ${prettyLabel(category)} option first.`;

    const ownedColors = [...entry.owned_colors];
    const ownedStyles = filterStylesForCategory(category, entry.owned_styles);
    const missingColors = remainingMissingColors(entry);
    const missingStyles = sortStylesByPriority(
      remainingMissingStyles(category, entry),
      entry.style_priorities
    );

    return {
      id: category,
      category: displayName,
      status,
      summary:
        status === 'Missing'
          ? `No ${displayName.toLowerCase()} detected in your wardrobe.`
          : status === 'Good'
            ? `${displayName} coverage looks solid.`
            : `${displayName} needs attention for your ${prettyLabel(result.occasion)} looks.`,
      details: `Owned: ${ownedColors.length} colors, ${ownedStyles.length} styles. Missing: ${missingColors.length} colors, ${missingStyles.length} styles.`,
      ownedColors,
      ownedStyles,
      missingColors,
      missingStyles,
      stylePriorities: entry.style_priorities,
      recommendedStep,
    };
  });

  items.push(buildColorsHealth(result, categories));
  items.push(buildStylesHealth(result, categories));
  return items;
};

const toTopPriorities = (items: WardrobePriorityShoppingItem[]): WardrobeTopPriority[] =>
  items.slice(0, 3).map((item) => ({
    id: `priority-${item.rank}`,
    rank: item.rank,
    name: categoryDisplayNames[item.category] || prettyLabel(item.itemName),
    category: item.category,
    priority: item.priority,
  }));

const toMissingItems = (items: WardrobePriorityShoppingItem[]): WardrobeMissingItem[] =>
  items.map((item) => {
    const categoryStyles = filterStylesForCategory(item.category, item.recommendedStyles);
    return {
      id: `missing-${item.rank}-${item.category}`,
      name: categoryDisplayNames[item.category] || prettyLabel(item.category),
      category: item.category,
      priority: item.priority,
      reason: item.reason,
      bestColors: item.recommendedColors,
      worksWith:
        categoryStyles.length > 0
          ? categoryStyles.map(prettyLabel)
          : [prettyLabel(item.category)],
    };
  });

export const normalizeWardrobeInsight = (response: WardrobeGapAnalysisResponse): WardrobeInsightResult => {
  const categories = orderedCategories(response);
  const priorityList = derivePriorityList(response, categories);
  const scoreValue = deriveScoreValue(response, categories);
  const summary = response.summaryText || response.overall_summary || 'Your wardrobe analysis is ready.';

  const allMissingColors: string[] = [];
  const allMissingStyles: string[] = [];
  const missingCategories: string[] = [];

  categories.forEach((category) => {
    const entry = response.analysis_by_category[category];
    allMissingColors.push(...entry.missing_colors);
    allMissingStyles.push(...filterStylesForCategory(category, entry.missing_styles));
    if (entry.item_count === 0) missingCategories.push(categoryDisplayNames[category] || prettyLabel(category));
  });

  const result: WardrobeInsightResult = {
    context: {
      occasion: response.occasion,
      season: response.season,
      style: response.style,
    },
    score: {
      value: scoreValue,
      label: scoreLabelFromValue(scoreValue),
      summary,
    },
    topPriorities: toTopPriorities(priorityList),
    missingItems: toMissingItems(priorityList),
    categoryHealth: buildCategoryHealth(response, categories),
    diagnostics: {
      missingCategories,
      colorsToAdd: Array.from(new Set(allMissingColors)),
      stylesToTry: Array.from(new Set(allMissingStyles)),
    },
  };

  if (response.ai_prompt || response.ai_raw_response || response.cost) {
    result.admin = {
      aiPrompt: response.ai_prompt,
      aiRawResponse: response.ai_raw_response,
      cost: response.cost,
    };
  }

  return result;
};
