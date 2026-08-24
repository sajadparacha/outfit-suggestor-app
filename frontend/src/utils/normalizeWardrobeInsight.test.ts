import { WardrobeGapAnalysisResponse } from '../models/WardrobeModels';
import {
  normalizeWardrobeInsight,
  priorityMissingStyles,
  sortStylesByPriority,
} from './normalizeWardrobeInsight';

const baseResponse: WardrobeGapAnalysisResponse = {
  occasion: 'casual',
  season: 'summer',
  style: 'modern',
  overall_summary: 'Add brighter shirts and lightweight trousers.',
  analysis_by_category: {
    shirt: {
      category: 'shirt',
      owned_colors: ['white'],
      owned_styles: ['oxford'],
      missing_colors: ['pastel pink', 'mint green'],
      missing_styles: ['linen'],
      recommended_purchases: ['Pastel pink linen shirt'],
      item_count: 1,
    },
    trouser: {
      category: 'trouser',
      owned_colors: ['navy blue'],
      owned_styles: ['chino'],
      missing_colors: ['light gray'],
      missing_styles: ['linen'],
      recommended_purchases: ['Light gray linen trousers'],
      item_count: 1,
    },
    blazer: {
      category: 'blazer',
      owned_colors: [],
      owned_styles: [],
      missing_colors: ['navy'],
      missing_styles: ['unstructured'],
      recommended_purchases: ['Navy blazer'],
      item_count: 0,
    },
    sweater: {
      category: 'sweater',
      owned_colors: ['gray'],
      owned_styles: ['crew neck'],
      missing_colors: ['navy'],
      missing_styles: ['cardigan'],
      recommended_purchases: ['Navy cardigan'],
      item_count: 1,
    },
    jacket: {
      category: 'jacket',
      owned_colors: [],
      owned_styles: [],
      missing_colors: ['olive'],
      missing_styles: ['bomber'],
      recommended_purchases: ['Olive bomber jacket'],
      item_count: 0,
    },
    shoes: {
      category: 'shoes',
      owned_colors: ['brown'],
      owned_styles: ['loafers'],
      missing_colors: [],
      missing_styles: [],
      recommended_purchases: [],
      item_count: 2,
    },
    belt: {
      category: 'belt',
      owned_colors: ['brown'],
      owned_styles: ['leather'],
      missing_colors: ['black'],
      missing_styles: [],
      recommended_purchases: ['Black leather belt'],
      item_count: 1,
    },
  },
};

describe('normalizeWardrobeInsight', () => {
  it('maps context and summary from API response', () => {
    const result = normalizeWardrobeInsight(baseResponse);

    expect(result.context).toEqual({
      occasion: 'casual',
      season: 'summer',
      style: 'modern',
    });
    expect(result.score.summary).toBe('Add brighter shirts and lightweight trousers.');
  });

  it('derives score value and label from category gaps', () => {
    const result = normalizeWardrobeInsight(baseResponse);

    expect(result.score.value).toBeGreaterThanOrEqual(0);
    expect(result.score.value).toBeLessThanOrEqual(100);
    expect(['Weak', 'Fair', 'Good', 'Strong']).toContain(result.score.label);
  });

  it('assigns score labels by band', () => {
    const weak = normalizeWardrobeInsight({
      ...baseResponse,
      analysis_by_category: {
        shirt: {
          category: 'shirt',
          owned_colors: [],
          owned_styles: [],
          missing_colors: ['black', 'navy', 'gray', 'brown'],
          missing_styles: ['linen', 'slim', 'tailored'],
          recommended_purchases: [],
          item_count: 0,
        },
      },
    });
    expect(weak.score.label).toBe('Weak');

    const strong = normalizeWardrobeInsight({
      ...baseResponse,
      analysis_by_category: {
        shirt: {
          category: 'shirt',
          owned_colors: ['white', 'navy', 'gray'],
          owned_styles: ['solid', 'linen'],
          missing_colors: [],
          missing_styles: [],
          recommended_purchases: [],
          item_count: 5,
        },
      },
    });
    expect(strong.score.label).toBe('Strong');
  });

  it('builds top 3 priorities from gap analysis', () => {
    const result = normalizeWardrobeInsight(baseResponse);

    expect(result.topPriorities.length).toBeLessThanOrEqual(3);
    expect(result.topPriorities[0].rank).toBe(1);
    expect(result.topPriorities[0].priority).toMatch(/High|Medium|Low/);
  });

  it('uses priorityShoppingList when provided', () => {
    const result = normalizeWardrobeInsight({
      ...baseResponse,
      priorityShoppingList: [
        {
          rank: 1,
          itemName: 'Custom shirt',
          category: 'shirt',
          priority: 'High',
          recommendedColors: ['navy'],
          recommendedStyles: ['linen'],
          reason: 'Custom reason',
          outfitImpact: 'Custom impact',
          actions: [],
        },
      ],
    });

    expect(result.missingItems[0].name).toBe('Shirts');
    expect(result.missingItems[0].reason).toBe('Custom reason');
  });

  it('includes category health for all essential categories plus colors and styles', () => {
    const result = normalizeWardrobeInsight(baseResponse);
    const names = result.categoryHealth.map((c) => c.category);

    expect(names).toContain('Shirts');
    expect(names).toContain('Trousers');
    expect(names).toContain('Shoes');
    expect(names).toContain('Blazers');
    expect(names).toContain('Sweaters');
    expect(names).toContain('Jackets');
    expect(names).toContain('Belts');
    expect(names).toContain('Colors');
    expect(names).toContain('Styles');
    expect(names).not.toContain('Ties');

    const clothingRows = result.categoryHealth.filter((c) => c.id !== 'colors' && c.id !== 'styles');
    expect(clothingRows).toHaveLength(7);
    expect(result.categoryHealth).toHaveLength(9);
  });

  it('includes tie only when returned in analysis_by_category', () => {
    const casual = normalizeWardrobeInsight(baseResponse);
    expect(casual.categoryHealth.find((c) => c.id === 'tie')).toBeUndefined();

    const formal = normalizeWardrobeInsight({
      ...baseResponse,
      occasion: 'business',
      analysis_by_category: {
        ...baseResponse.analysis_by_category,
        tie: {
          category: 'tie',
          owned_colors: [],
          owned_styles: [],
          missing_colors: ['navy'],
          missing_styles: ['silk'],
          recommended_purchases: ['Navy silk tie'],
          item_count: 0,
        },
      },
    });

    const tie = formal.categoryHealth.find((c) => c.id === 'tie');
    expect(tie?.category).toBe('Ties');
    expect(formal.categoryHealth.filter((c) => c.id !== 'colors' && c.id !== 'styles')).toHaveLength(8);
    expect(formal.categoryHealth).toHaveLength(10);
  });

  it('marks empty categories as Missing', () => {
    const result = normalizeWardrobeInsight(baseResponse);
    const blazers = result.categoryHealth.find((c) => c.category === 'Blazers');

    expect(blazers?.status).toBe('Missing');
  });

  it('includes admin metadata when present', () => {
    const result = normalizeWardrobeInsight({
      ...baseResponse,
      ai_prompt: 'test-prompt',
      ai_raw_response: '{"ok":true}',
      cost: { gpt4_cost: 0.01, total_cost: 0.01 },
    });

    expect(result.admin?.aiPrompt).toBe('test-prompt');
    expect(result.admin?.aiRawResponse).toBe('{"ok":true}');
    expect(result.admin?.cost?.total_cost).toBe(0.01);
  });

  it('builds diagnostics for admin use', () => {
    const result = normalizeWardrobeInsight(baseResponse);

    expect(result.diagnostics?.colorsToAdd.length).toBeGreaterThan(0);
    expect(result.diagnostics?.stylesToTry.length).toBeGreaterThan(0);
    expect(result.diagnostics?.missingCategories).toContain('Blazers');
  });

  it('populates inventory arrays on clothing category health rows', () => {
    const result = normalizeWardrobeInsight(baseResponse);
    const shirts = result.categoryHealth.find((c) => c.id === 'shirt');

    expect(shirts).toMatchObject({
      ownedColors: ['white'],
      ownedStyles: ['oxford'],
      missingColors: ['pastel pink', 'mint green'],
      missingStyles: ['linen'],
    });
  });

  it('aggregates unique owned and missing colors on the colors row', () => {
    const result = normalizeWardrobeInsight(baseResponse);
    const colors = result.categoryHealth.find((c) => c.id === 'colors');

    expect(colors?.ownedColors).toEqual(
      expect.arrayContaining(['white', 'navy blue', 'brown'])
    );
    expect(colors?.missingColors).toEqual(
      expect.arrayContaining(['pastel pink', 'mint green', 'light gray', 'navy', 'black'])
    );
    expect(colors?.ownedStyles).toEqual([]);
    expect(colors?.missingStyles).toEqual([]);
  });

  it('aggregates unique owned and missing styles on the styles row', () => {
    const result = normalizeWardrobeInsight(baseResponse);
    const styles = result.categoryHealth.find((c) => c.id === 'styles');

    expect(styles?.ownedStyles).toEqual(
      expect.arrayContaining(['oxford', 'chino', 'loafers', 'leather'])
    );
    expect(styles?.missingStyles).toEqual(
      expect.arrayContaining(['linen', 'unstructured'])
    );
    expect(styles?.ownedColors).toEqual([]);
    expect(styles?.missingColors).toEqual([]);
  });

  it('filters cross-category styles from shirt category health', () => {
    const result = normalizeWardrobeInsight({
      ...baseResponse,
      analysis_by_category: {
        ...baseResponse.analysis_by_category,
        shirt: {
          category: 'shirt',
          owned_colors: ['white'],
          owned_styles: ['oxford', 'clean sneakers'],
          missing_colors: [],
          missing_styles: ['linen', 'clean sneakers', 'loafers'],
          recommended_purchases: [],
          item_count: 2,
        },
      },
      priorityShoppingList: [
        {
          rank: 1,
          itemName: 'Linen shirt',
          category: 'shirt',
          priority: 'High',
          recommendedColors: ['white'],
          recommendedStyles: ['linen', 'clean sneakers'],
          reason: 'Expand shirt options',
          outfitImpact: 'More summer looks',
          actions: [],
        },
      ],
    });

    const shirts = result.categoryHealth.find((c) => c.id === 'shirt');
    expect(shirts?.ownedStyles).toEqual(['oxford']);
    expect(shirts?.missingStyles).toEqual(['linen']);
    expect(shirts?.missingStyles).not.toContain('clean sneakers');
    expect(shirts?.ownedStyles).not.toContain('clean sneakers');

    expect(result.missingItems[0].worksWith).toEqual(['Linen']);
    expect(result.missingItems[0].worksWith).not.toContain('Clean Sneakers');
  });

  it('drops owned colors from missingColors in the same category (case-insensitive)', () => {
    const result = normalizeWardrobeInsight({
      ...baseResponse,
      analysis_by_category: {
        ...baseResponse.analysis_by_category,
        blazer: {
          category: 'blazer',
          owned_colors: ['Charcoal'],
          owned_styles: [],
          missing_colors: ['Charcoal', 'Navy'],
          missing_styles: ['unstructured'],
          recommended_purchases: ['Navy blazer'],
          item_count: 1,
        },
      },
    });

    const blazers = result.categoryHealth.find((c) => c.id === 'blazer');
    expect(blazers?.missingColors).toEqual(['Navy']);
    expect(blazers?.missingColors).not.toContain('Charcoal');
    expect(blazers?.details).toContain('Missing: 1 colors');
  });

  it('drops owned styles from missingStyles in the same category', () => {
    const result = normalizeWardrobeInsight({
      ...baseResponse,
      analysis_by_category: {
        ...baseResponse.analysis_by_category,
        shirt: {
          category: 'shirt',
          owned_colors: ['white'],
          owned_styles: ['Oxford'],
          missing_colors: ['navy'],
          missing_styles: ['oxford', 'linen'],
          recommended_purchases: [],
          item_count: 2,
        },
      },
    });

    const shirts = result.categoryHealth.find((c) => c.id === 'shirt');
    expect(shirts?.missingStyles).toEqual(['linen']);
    expect(shirts?.missingStyles).not.toContain('oxford');
    expect(shirts?.ownedStyles).toEqual(['Oxford']);
  });

  it('appends clothing categories with remaining gaps to priorityShoppingList', () => {
    const result = normalizeWardrobeInsight({
      ...baseResponse,
      analysis_by_category: {
        ...baseResponse.analysis_by_category,
        shirt: {
          category: 'shirt',
          owned_colors: ['white'],
          owned_styles: [],
          missing_colors: [],
          missing_styles: ['oxford', 'linen'],
          style_priorities: {
            oxford: 'Essential',
            linen: 'Useful',
          },
          recommended_purchases: [],
          item_count: 2,
        },
      },
      priorityShoppingList: [
        {
          rank: 1,
          itemName: 'Navy blazer',
          category: 'blazer',
          priority: 'High',
          recommendedColors: ['navy'],
          recommendedStyles: ['unstructured'],
          reason: 'Fill the blazer gap',
          outfitImpact: 'More formal looks',
          actions: [],
        },
      ],
    });

    const shirts = result.categoryHealth.find((c) => c.id === 'shirt');
    expect(shirts?.status).toBe('Medium');
    expect(result.missingItems.map((item) => item.category)).toContain('shirt');
    expect(result.missingItems[0].category).toBe('blazer');
  });
});

const LARGE_CATALOG = Array.from({ length: 32 }, (_, index) => `style-${index + 1}`);
const LARGE_PRIORITIES = LARGE_CATALOG.reduce<Record<string, 'Essential' | 'Useful' | 'Skip'>>(
  (map, tag, index) => {
    if (index < 6) map[tag] = 'Essential';
    else if (index < 11) map[tag] = 'Useful';
    else map[tag] = 'Skip';
    return map;
  },
  {}
);

const SHIRT_LIBRARY_TAGS = ['linen', 'textured', 'smart casual', 'overshirt', 'oxford'];

describe('style priority helpers', () => {
  it('sorts missing styles Essential → Useful → Skip', () => {
    const shuffled = ['style-20', 'style-1', 'style-8', 'style-32', 'style-2'];
    expect(sortStylesByPriority(shuffled, LARGE_PRIORITIES)).toEqual([
      'style-1',
      'style-2',
      'style-8',
      'style-20',
      'style-32',
    ]);
  });

  it('returns a priority-only missing list: Essential first, about 8–12', () => {
    const preview = priorityMissingStyles(LARGE_CATALOG, LARGE_PRIORITIES);

    expect(preview.length).toBeGreaterThanOrEqual(8);
    expect(preview.length).toBeLessThanOrEqual(12);
    expect(preview.slice(0, 6)).toEqual(LARGE_CATALOG.slice(0, 6));
    preview.forEach((tag) => {
      expect(LARGE_PRIORITIES[tag]).not.toBe('Skip');
    });
    expect(preview).not.toContain('style-12');
  });

  it('show-all path exposes the full catalog including Skip tags', () => {
    const preview = priorityMissingStyles(LARGE_CATALOG, LARGE_PRIORITIES);
    const fullCatalog = sortStylesByPriority(LARGE_CATALOG, LARGE_PRIORITIES);

    expect(fullCatalog).toHaveLength(32);
    expect(fullCatalog.length).toBeGreaterThan(preview.length);
    expect(fullCatalog.slice(-5)).toEqual(['style-28', 'style-29', 'style-30', 'style-31', 'style-32']);
    expect(fullCatalog.filter((tag) => LARGE_PRIORITIES[tag] === 'Skip').length).toBe(21);
  });
});

describe('normalizeWardrobeInsight style inventory hybrid', () => {
  const shirtCatalogResponse: WardrobeGapAnalysisResponse = {
    ...baseResponse,
    analysis_by_category: {
      ...baseResponse.analysis_by_category,
      shirt: {
        category: 'shirt',
        owned_colors: ['white'],
        owned_styles: ['oxford'],
        missing_colors: ['navy'],
        missing_styles: ['overshirt', 'linen', 'textured', 'smart casual'],
        style_priorities: {
          linen: 'Essential',
          'smart casual': 'Useful',
          textured: 'Skip',
          overshirt: 'Skip',
        },
        recommended_purchases: ['Navy linen shirt'],
        item_count: 2,
      },
    },
    priorityShoppingList: [
      {
        rank: 1,
        itemName: 'Navy linen shirt',
        category: 'shirt',
        priority: 'High',
        recommendedColors: ['navy'],
        recommendedStyles: ['linen', 'smart casual'],
        reason: 'Highest-impact shirt gap for work and everyday.',
        outfitImpact: 'Adds a ranked library shirt',
        actions: [],
      },
    ],
  };

  it('attaches stylePriorities and sorts missingStyles Essential → Useful → Skip', () => {
    const result = normalizeWardrobeInsight(shirtCatalogResponse);
    const shirts = result.categoryHealth.find((c) => c.id === 'shirt');

    expect(shirts?.stylePriorities).toEqual({
      linen: 'Essential',
      'smart casual': 'Useful',
      textured: 'Skip',
      overshirt: 'Skip',
    });
    expect(shirts?.missingStyles).toEqual(['linen', 'smart casual', 'overshirt', 'textured']);
    expect(shirts?.missingStyles).toHaveLength(4);
  });

  it('keeps owned styles intact when priorities are present', () => {
    const result = normalizeWardrobeInsight(shirtCatalogResponse);
    const shirts = result.categoryHealth.find((c) => c.id === 'shirt');
    const styles = result.categoryHealth.find((c) => c.id === 'styles');

    expect(shirts?.ownedStyles).toEqual(['oxford']);
    expect(styles?.ownedStyles).toEqual(
      expect.arrayContaining(['oxford', 'chino', 'loafers', 'leather'])
    );
    expect(shirts?.ownedStyles).not.toContain('linen');
  });

  it('default missing list is priority-only while the catalog stays complete', () => {
    const result = normalizeWardrobeInsight(shirtCatalogResponse);
    const shirts = result.categoryHealth.find((c) => c.id === 'shirt');
    const preview = priorityMissingStyles(shirts?.missingStyles ?? [], shirts?.stylePriorities);

    expect(preview).toEqual(['linen', 'smart casual']);
    expect(shirts?.missingStyles).toEqual(['linen', 'smart casual', 'overshirt', 'textured']);
  });

  it('priority preview for a large catalog is Essential-first and about 8–12 tags', () => {
    const priorities = LARGE_CATALOG.reduce<Record<string, 'Essential' | 'Useful' | 'Skip'>>(
      (map, tag, index) => {
        map[tag] = index < 6 ? 'Essential' : index < 11 ? 'Useful' : 'Skip';
        return map;
      },
      {}
    );
    const response: WardrobeGapAnalysisResponse = {
      ...baseResponse,
      analysis_by_category: {
        shirt: {
          category: 'shirt',
          owned_colors: ['white'],
          owned_styles: ['oxford'],
          missing_colors: [],
          missing_styles: LARGE_CATALOG,
          style_priorities: priorities,
          recommended_purchases: [],
          item_count: 1,
        },
      },
    };

    const result = normalizeWardrobeInsight(response);
    const shirts = result.categoryHealth.find((c) => c.id === 'shirt');
    // Shirt library filters unknown tags; use helpers on the raw catalog as the show-all path does.
    const preview = priorityMissingStyles(LARGE_CATALOG, priorities);
    const fullCatalog = sortStylesByPriority(LARGE_CATALOG, priorities);

    expect(preview.length).toBeGreaterThanOrEqual(8);
    expect(preview.length).toBeLessThanOrEqual(12);
    expect(preview[0]).toBe('style-1');
    expect(fullCatalog).toHaveLength(32);
    expect(shirts?.ownedStyles).toEqual(['oxford']);
  });

  it('keeps shopping-list styles on library tags only', () => {
    const result = normalizeWardrobeInsight(shirtCatalogResponse);
    const libraryLabels = SHIRT_LIBRARY_TAGS.map((tag) =>
      tag
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    );

    expect(result.missingItems[0].worksWith).toEqual(['Linen', 'Smart Casual']);
    result.missingItems[0].worksWith.forEach((label) => {
      expect(libraryLabels).toContain(label);
    });
    expect(result.missingItems[0].worksWith).not.toContain('Bomber');
    expect(result.missingItems[0].worksWith).not.toContain('Silk Tie');
    expect(result.missingItems[0].worksWith).not.toContain('Invented Couture');
  });
});
