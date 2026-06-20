import type { WardrobeMissingItem } from '../models/WardrobeInsightResult';
import {
  buildShoppingListRows,
  buildStyleColorTuples,
  buildWhatsAppShoppingListText,
  buildWhatsAppShoppingListUrl,
  formatStyleColorTuplePreview,
  formatStyleColorTuples,
} from './insightsHelpers';

const missingItems: WardrobeMissingItem[] = [
  {
    id: 'missing-shirt',
    name: 'shirt',
    category: 'shirt',
    priority: 'High',
    reason: 'Adds range to office looks.',
    bestColors: ['olive', 'white'],
    worksWith: ['oxford', 'linen'],
  },
  {
    id: 'missing-belt',
    name: 'belt',
    category: 'belt',
    priority: 'Medium',
    reason: 'Completes trouser outfits.',
    bestColors: [],
    worksWith: [],
  },
];

describe('insights shopping list helpers', () => {
  it('formats style and color tuples from a cross product', () => {
    const tuples = buildStyleColorTuples(['oxford', 'linen'], ['olive', 'white']);

    expect(formatStyleColorTuples(tuples)).toBe(
      '(Oxford, Olive), (Oxford, White), (Linen, Olive), (Linen, White)'
    );
  });

  it('formats a bounded shopping-list tuple preview for long rows', () => {
    const longItem: WardrobeMissingItem = {
      id: 'long-tuple-shirt',
      name: 'shirt',
      category: 'shirt',
      priority: 'High',
      reason: 'Needs many style and color options.',
      bestColors: Array.from({ length: 8 }, (_, index) => `color ${index + 1}`),
      worksWith: Array.from({ length: 8 }, (_, index) => `style ${index + 1}`),
    };
    const row = buildShoppingListRows([longItem])[0];
    const preview = formatStyleColorTuplePreview(row.tuples);

    expect(preview).toBe(
      '(Style 1, Color 1), (Style 1, Color 2), (Style 1, Color 3), (Style 1, Color 4), (Style 1, Color 5), (Style 1, Color 6) +58 more'
    );
    expect(preview.length).toBeLessThan(row.tupleText.length);
    expect(preview).not.toContain('(Style 8, Color 8)');
    expect(row.tupleText).toContain('(Style 8, Color 8)');
    expect(decodeURIComponent(row.googleShoppingUrl)).toContain('Style 8 Color 8');
    expect(buildWhatsAppShoppingListText([row])).toContain('(Style 8, Color 8)');
  });

  it('uses classic and neutral fallbacks when styles or colors are missing', () => {
    const tuples = buildStyleColorTuples([], []);

    expect(formatStyleColorTuples(tuples)).toBe('(Classic, Neutral)');
  });

  it('builds shopping-list rows from normalized missing items', () => {
    const rows = buildShoppingListRows(missingItems);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 'missing-shirt',
      itemLabel: 'Shirt',
      category: 'shirt',
      styles: ['Oxford', 'Linen'],
      colors: ['Olive', 'White'],
      tupleText: '(Oxford, Olive), (Oxford, White), (Linen, Olive), (Linen, White)',
    });
    expect(rows[0].googleShoppingUrl).toContain('tbm=shop');
    expect(decodeURIComponent(rows[0].googleShoppingUrl)).toMatch(/shirts Shirt Oxford Olive/i);
    expect(rows[1].tupleText).toBe('(Classic, Neutral)');
  });

  it('builds readable WhatsApp export text and an encoded wa.me URL', () => {
    const rows = buildShoppingListRows(missingItems);
    const text = buildWhatsAppShoppingListText(rows, {
      occasion: 'business',
      season: 'winter',
      style: 'smart casual',
    });

    expect(text).toContain('Wardrobe Insights shopping list');
    expect(text).toContain('Analyzed for: Business / Winter / Smart Casual');
    expect(text).toContain('- Shirt: (Oxford, Olive), (Oxford, White), (Linen, Olive), (Linen, White)');
    expect(text).toContain('- Belt: (Classic, Neutral)');

    const url = buildWhatsAppShoppingListUrl(rows, {
      occasion: 'business',
      season: 'winter',
      style: 'smart casual',
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(url)).toContain('- Shirt: (Oxford, Olive)');
  });
});
