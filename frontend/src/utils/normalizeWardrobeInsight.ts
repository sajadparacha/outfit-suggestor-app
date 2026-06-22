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

const derivePriorityList = (
  result: WardrobeGapAnalysisResponse,
  categories: string[]
): WardrobePriorityShoppingItem[] => {
  if (result.priorityShoppingList?.length) return result.priorityShoppingList;

  type RankedPriority = WardrobePriorityShoppingItem & { score: number };
  const ranked: RankedPriority[] = categories
    .map<RankedPriority>((category) => {
      const entry = result.analysis_by_category[category];
      const score = gapScore(entry);
      const priority = priorityFromScore(score);
      return {
        score,
        rank: 0,
        itemName: `${entry.missing_colors[0] || 'core'} ${entry.missing_styles[0] || category} ${category}`,
        category,
        priority,
        recommendedColors: entry.missing_colors,
        recommendedStyles: entry.missing_styles,
        reason: `Improves your ${result.style} ${result.occasion} options for ${result.season}.`,
        outfitImpact: `Unlocks more complete looks in ${prettyLabel(category)}.`,
        actions: ['Show outfit examples'],
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked.map(({ score: _score, ...item }, idx): WardrobePriorityShoppingItem => ({ ...item, rank: idx + 1 }));
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
    allMissing.push(...entry.missing_colors);
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
  const missingColors = uniqueStrings(allMissing);

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
    allMissing.push(...filterStylesForCategory(category, entry.missing_styles));
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
  const missingStyles = uniqueStrings(allMissing);

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
      details: `Owned: ${entry.owned_colors.length} colors, ${entry.owned_styles.length} styles. Missing: ${entry.missing_colors.length} colors, ${entry.missing_styles.length} styles.`,
      ownedColors: [...entry.owned_colors],
      ownedStyles: filterStylesForCategory(category, entry.owned_styles),
      missingColors: [...entry.missing_colors],
      missingStyles: filterStylesForCategory(category, entry.missing_styles),
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
    name: prettyLabel(item.itemName),
    category: item.category,
    priority: item.priority,
  }));

const toMissingItems = (items: WardrobePriorityShoppingItem[]): WardrobeMissingItem[] =>
  items.map((item) => {
    const categoryStyles = filterStylesForCategory(item.category, item.recommendedStyles);
    return {
      id: `missing-${item.rank}-${item.category}`,
      name: prettyLabel(item.itemName),
      category: item.category,
      priority: item.priority,
      reason: item.reason,
      bestColors: item.recommendedColors,
      worksWith:
        categoryStyles.length > 0
          ? categoryStyles.slice(0, 4).map(prettyLabel)
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
