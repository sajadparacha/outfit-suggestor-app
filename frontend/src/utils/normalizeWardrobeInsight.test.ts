import { WardrobeGapAnalysisResponse } from '../models/WardrobeModels';
import { normalizeWardrobeInsight } from './normalizeWardrobeInsight';

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

    expect(result.missingItems[0].name).toBe('Custom Shirt');
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
});
