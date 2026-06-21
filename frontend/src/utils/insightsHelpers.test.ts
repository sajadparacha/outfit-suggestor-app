import type { WardrobeMissingItem } from '../models/WardrobeInsightResult';
import {
  SHOPPING_LIST_SEARCH_ALL_LIMIT,
  buildComboSearchUrl,
  buildCopyListText,
  buildSearchAllUrl,
  buildShoppingListRows,
  buildStyleColorTuples,
  buildWhatsAppShoppingListText,
  buildWhatsAppShoppingListUrl,
  cleanShoppingItemLabel,
  formatLookForText,
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
    bestColors: ['black', 'brown'],
    worksWith: ['leather', 'braided'],
  },
];

describe('insights shopping list helpers', () => {
  it('dedupes repeated words and prefers category labels', () => {
    expect(cleanShoppingItemLabel('White Trouser Trouser', 'trouser')).toBe('Trousers');
    expect(cleanShoppingItemLabel('belt', 'belt')).toBe('Belt');
    expect(cleanShoppingItemLabel('shirt', 'shirt')).toBe('Shirt');
  });

  it('formats human-readable look-for text with sentence-case or lists', () => {
    const beltTuples = buildStyleColorTuples(['leather', 'braided'], ['black', 'brown']);
    expect(formatLookForText(beltTuples)).toBe('Black or brown leather; black or brown braided OK');

    const shirtTuples = buildStyleColorTuples(['oxford'], ['olive', 'white']);
    expect(formatLookForText(shirtTuples)).toBe('Olive or white oxford');
  });

  it('formats style and color tuples from a cross product', () => {
    const tuples = buildStyleColorTuples(['oxford', 'linen'], ['olive', 'white']);

    expect(formatStyleColorTuples(tuples)).toBe(
      '(Oxford, Olive), (Oxford, White), (Linen, Olive), (Linen, White)'
    );
  });

  it('builds per-combo URLs with focused category, style, and color queries', () => {
    const url = buildComboSearchUrl('belt', 'Leather', 'Black');
    const decoded = decodeURIComponent(url);

    expect(url).toContain('tbm=shop');
    expect(decoded).toMatch(/belts/i);
    expect(decoded).toMatch(/Leather/i);
    expect(decoded).toMatch(/Black/i);
  });

  it('limits search-all URLs to the top three combos', () => {
    const tuples = buildStyleColorTuples(
      Array.from({ length: 4 }, (_, index) => `style ${index + 1}`),
      Array.from({ length: 4 }, (_, index) => `color ${index + 1}`)
    );

    const url = buildSearchAllUrl('shirt', tuples);
    const decoded = decodeURIComponent(url);

    expect(tuples.length).toBeGreaterThan(SHOPPING_LIST_SEARCH_ALL_LIMIT);
    expect(decoded).toMatch(/Style 1 Color 1/i);
    expect(decoded).toMatch(/Style 1 Color 2/i);
    expect(decoded).toMatch(/Style 1 Color 3/i);
    expect(decoded).not.toMatch(/Style 1 Color 4/i);
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
  });

  it('uses classic and neutral fallbacks when styles or colors are missing', () => {
    const tuples = buildStyleColorTuples([], []);

    expect(formatStyleColorTuples(tuples)).toBe('(Classic, Neutral)');
    expect(formatLookForText(tuples)).toBe('Classic neutral');
  });

  it('builds shopping-list rows with clean labels, look-for text, and combo links', () => {
    const rows = buildShoppingListRows(missingItems);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 'missing-shirt',
      cleanLabel: 'Shirt',
      itemLabel: 'Shirt',
      category: 'shirt',
      priority: 'High',
      styles: ['Oxford', 'Linen'],
      colors: ['Olive', 'White'],
      lookForText: 'Olive or white oxford; olive or white linen OK',
      tupleText: '(Oxford, Olive), (Oxford, White), (Linen, Olive), (Linen, White)',
    });
    expect(rows[0].comboLinks).toHaveLength(4);
    expect(rows[0].searchAllUrl).toContain('tbm=shop');
    expect(rows[1].cleanLabel).toBe('Belt');
    expect(rows[1].lookForText).toBe('Black or brown leather; black or brown braided OK');
  });

  it('builds numbered WhatsApp export text with one link per item and no raw tuples', () => {
    const rows = buildShoppingListRows(missingItems);
    const text = buildWhatsAppShoppingListText(rows, {
      occasion: 'business',
      season: 'winter',
      style: 'smart casual',
    });

    expect(text).toContain('🛍 ClosIQ Shopping List');
    expect(text).toContain('For: Business · Winter · Smart Casual');
    expect(text).toContain('1. Shirt (High)');
    expect(text).toContain('→ Olive or white oxford; olive or white linen OK');
    expect(text).toContain('🔗');
    expect(text).toContain('2. Belt (Medium)');
    expect(text).not.toContain('(Oxford, Olive)');
    expect(text).not.toMatch(/\(Style, Color\)/);

    const url = buildWhatsAppShoppingListUrl(rows, {
      occasion: 'business',
      season: 'winter',
      style: 'smart casual',
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(url)).toContain('1. Shirt (High)');
  });

  it('builds plain copy-list text aligned with WhatsApp structure', () => {
    const rows = buildShoppingListRows(missingItems);
    const text = buildCopyListText(rows, {
      occasion: 'business',
      season: 'winter',
      style: 'smart casual',
    });

    expect(text).toContain('ClosIQ Shopping List');
    expect(text).toContain('2. Belt (Medium)');
    expect(text).toContain('→ Black or brown leather; black or brown braided OK');
    expect(text).not.toContain('(Leather, Black)');
  });
});
