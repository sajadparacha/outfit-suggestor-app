import type { WardrobeMissingItem } from '../models/WardrobeInsightResult';
import {
  SHOPPING_LIST_SEARCH_ALL_LIMIT,
  buildComboSearchUrl,
  buildCopyListText,
  buildSearchAllUrl,
  buildShoppingListRows,
  buildShoppingSearchUrl,
  buildStyleColorTuples,
  buildWhatsAppShoppingListText,
  buildWhatsAppShoppingListUrl,
  categoryForSearch,
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
  it('maps extended clothing categories for Google Shopping queries with possessive men\'s prefix', () => {
    expect(categoryForSearch('sweater')).toBe('sweater');
    expect(categoryForSearch('Sweaters')).toBe('sweater');
    expect(categoryForSearch('jacket')).toBe('jacket');
    expect(categoryForSearch('Jackets')).toBe('jacket');
    expect(categoryForSearch('tie')).toBe('tie');
    expect(categoryForSearch('ties')).toBe('tie');

    const sweaterUrl = decodeURIComponent(buildShoppingSearchUrl('sweater', ['crew neck'], ['navy']));
    expect(sweaterUrl).toMatch(/men's sweater/i);

    const jacketUrl = decodeURIComponent(buildShoppingSearchUrl('jacket', ['bomber'], ['olive']));
    expect(jacketUrl).toMatch(/men's jacket/i);

    const tieUrl = decodeURIComponent(buildShoppingSearchUrl('tie', ['silk'], ['navy']));
    expect(tieUrl).toMatch(/men's tie/i);

    const shirtUrl = decodeURIComponent(buildShoppingSearchUrl('shirt', ['oxford'], ['white']));
    expect(shirtUrl).toMatch(/men's shirts/i);

    const searchAllUrl = decodeURIComponent(
      buildSearchAllUrl('sweater', [{ style: 'Crew Neck', color: 'Navy' }])
    );
    expect(searchAllUrl).toMatch(/men's sweater/i);
  });

  it('always returns the plural dashboard label, never a SKU name', () => {
    expect(cleanShoppingItemLabel('black leather belt', 'belt')).toBe('Belts');
    expect(cleanShoppingItemLabel('Oxford Shirt', 'shirt')).toBe('Shirts');
    expect(cleanShoppingItemLabel('navy oxford shirt', 'shirts')).toBe('Shirts');
    expect(cleanShoppingItemLabel('White Trouser Trouser', 'trouser')).toBe('Trousers');
    expect(cleanShoppingItemLabel('Merino Sweater Sweater', 'sweater')).toBe('Sweaters');
    expect(cleanShoppingItemLabel('field jacket', 'jacket')).toBe('Jackets');
    expect(cleanShoppingItemLabel('Summer Dress', 'shirt')).toBe('Shirts');
    expect(cleanShoppingItemLabel('belt', 'belt')).toBe('Belts');
    expect(cleanShoppingItemLabel('shirt', 'shirt')).toBe('Shirts');
    expect(cleanShoppingItemLabel('blazer', 'blazer')).toBe('Blazers');
    expect(cleanShoppingItemLabel('tie', 'tie')).toBe('Ties');
    expect(cleanShoppingItemLabel('derby shoes', 'shoes')).toBe('Shoes');
  });

  it('uses the category plural as the shopping-list title even when the AI name is Oxford Shirt', () => {
    const oxfordItem: WardrobeMissingItem = {
      id: 'oxford-shirt',
      name: 'Oxford Shirt',
      category: 'shirt',
      priority: 'High',
      reason: 'Needs a proper shirt.',
      bestColors: ['white'],
      worksWith: ['oxford'],
    };
    const row = buildShoppingListRows([oxfordItem])[0];
    expect(row.cleanLabel).toBe('Shirts');
    expect(row.itemLabel).toBe('Shirts');
    expect(row.cleanLabel).not.toBe('Oxford Shirt');
  });

  it('formats empty-belt look-for as all colors with the first style, remaining styles optional', () => {
    const emptyBeltTuples = buildStyleColorTuples(
      ['leather', 'braided', 'reversible'],
      ['black', 'brown']
    );
    expect(formatLookForText(emptyBeltTuples)).toBe(
      'Black or brown leather; braided or reversible optional'
    );
    expect(formatLookForText(emptyBeltTuples)).not.toMatch(/OK$/);
    expect(formatLookForText(emptyBeltTuples)).not.toContain('black or brown braided');
  });

  it('formats look-for text with colors once, then extra styles as optional', () => {
    const beltTuples = buildStyleColorTuples(['leather', 'braided'], ['black', 'brown']);
    expect(formatLookForText(beltTuples)).toBe('Black or brown leather; braided optional');

    const shirtTuples = buildStyleColorTuples(['oxford'], ['olive', 'white']);
    expect(formatLookForText(shirtTuples)).toBe('Olive or white oxford');
  });

  it('formats style and color tuples from a cross product', () => {
    const tuples = buildStyleColorTuples(['oxford', 'linen'], ['olive', 'white']);

    expect(formatStyleColorTuples(tuples)).toBe(
      '(Oxford, Olive), (Oxford, White), (Linen, Olive), (Linen, White)'
    );
  });

  it('builds one shopping-list row per missing item/category, not one row per color×style combo', () => {
    const emptyBelt: WardrobeMissingItem = {
      id: 'empty-belt',
      name: 'black leather belt',
      category: 'belt',
      priority: 'High',
      reason: 'You own no belts. Buy first black leather.',
      bestColors: ['black', 'brown'],
      worksWith: ['leather', 'braided', 'reversible'],
    };
    const rows = buildShoppingListRows([emptyBelt, missingItems[0]]);

    expect(rows).toHaveLength(2);
    expect(rows.length).toBe(2);
    expect(rows[0].tuples).toHaveLength(6);
    expect(rows[0].comboLinks).toHaveLength(6);
    expect(rows[0].cleanLabel).toBe('Belts');
    expect(rows[0].lookForText).toBe('Black or brown leather; braided or reversible optional');
    expect(rows[1].cleanLabel).toBe('Shirts');
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

  it('builds shopping-list rows with plural category labels, look-for text, and combo links', () => {
    const rows = buildShoppingListRows(missingItems);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 'missing-shirt',
      cleanLabel: 'Shirts',
      itemLabel: 'Shirts',
      category: 'shirt',
      priority: 'High',
      styles: ['Oxford', 'Linen'],
      colors: ['Olive', 'White'],
      lookForText: 'Olive or white oxford; linen optional',
      tupleText: '(Oxford, Olive), (Oxford, White), (Linen, Olive), (Linen, White)',
    });
    expect(rows[0].comboLinks).toHaveLength(4);
    expect(rows[0].searchAllUrl).toContain('tbm=shop');
    expect(rows[1].cleanLabel).toBe('Belts');
    expect(rows[1].lookForText).toBe('Black or brown leather; braided optional');
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
    expect(text).toContain('1. Shirts (High)');
    expect(text).toContain('→ Olive or white oxford; linen optional');
    expect(text).toContain('🔗');
    expect(text).toContain('2. Belts (Medium)');
    expect(text).not.toContain('(Oxford, Olive)');
    expect(text).not.toMatch(/\(Style, Color\)/);

    const url = buildWhatsAppShoppingListUrl(rows, {
      occasion: 'business',
      season: 'winter',
      style: 'smart casual',
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(url)).toContain('1. Shirts (High)');
  });

  it('builds plain copy-list text aligned with WhatsApp structure', () => {
    const rows = buildShoppingListRows(missingItems);
    const text = buildCopyListText(rows, {
      occasion: 'business',
      season: 'winter',
      style: 'smart casual',
    });

    expect(text).toContain('ClosIQ Shopping List');
    expect(text).toContain('2. Belts (Medium)');
    expect(text).toContain('→ Black or brown leather; braided optional');
    expect(text).not.toContain('(Leather, Black)');
  });
});
