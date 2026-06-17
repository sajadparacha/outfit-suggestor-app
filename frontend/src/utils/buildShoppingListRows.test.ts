import { WardrobeCategoryHealth } from '../models/WardrobeInsightResult';
import {
  buildShoppingListCsv,
  buildShoppingListRows,
  buildWhatsAppShoppingMessage,
} from './buildShoppingListRows';

const makeCategory = (
  overrides: Partial<WardrobeCategoryHealth> & Pick<WardrobeCategoryHealth, 'id'>
): WardrobeCategoryHealth => ({
  category: overrides.id,
  status: 'Good',
  summary: '',
  details: '',
  ownedColors: [],
  ownedStyles: [],
  missingColors: [],
  missingStyles: [],
  recommendedStep: '',
  ...overrides,
});

describe('buildShoppingListRows', () => {
  it('builds rows for clothing categories with missing style or color', () => {
    const categories: WardrobeCategoryHealth[] = [
      makeCategory({
        id: 'shirt',
        missingStyles: ['oxford'],
        missingColors: ['navy'],
      }),
      makeCategory({
        id: 'trouser',
        missingStyles: ['chino'],
        missingColors: ['charcoal'],
      }),
    ];

    expect(buildShoppingListRows(categories)).toEqual([
      {
        categoryKey: 'shirt',
        category: 'Shirt',
        style: 'Oxford',
        color: 'Navy',
        key: 'shirt-Oxford-Navy-0',
      },
      {
        categoryKey: 'trouser',
        category: 'Pant',
        style: 'Chino',
        color: 'Charcoal',
        key: 'trouser-Chino-Charcoal-0',
      },
    ]);
  });

  it('maps display labels for blazer and jacket to Jacket', () => {
    const categories: WardrobeCategoryHealth[] = [
      makeCategory({
        id: 'blazer',
        status: 'Missing',
        missingStyles: ['unstructured'],
        missingColors: ['navy'],
      }),
      makeCategory({
        id: 'jacket',
        status: 'Weak',
        missingStyles: ['bomber'],
        missingColors: ['black'],
      }),
    ];

    const rows = buildShoppingListRows(categories);
    expect(rows[0].category).toBe('Jacket');
    expect(rows[1].category).toBe('Jacket');
  });

  it('includes rows when status is Missing or Weak even without missing arrays', () => {
    const categories: WardrobeCategoryHealth[] = [
      makeCategory({ id: 'shoes', status: 'Weak' }),
      makeCategory({ id: 'belt', status: 'Missing' }),
    ];

    const rows = buildShoppingListRows(categories);
    expect(rows).toEqual([
      {
        categoryKey: 'shoes',
        category: 'Shoes',
        style: '—',
        color: '—',
        key: 'shoes-—-—-0',
      },
      {
        categoryKey: 'belt',
        category: 'Belt',
        style: '—',
        color: '—',
        key: 'belt-—-—-0',
      },
    ]);
  });

  it('skips aggregate pseudo-categories colors and styles', () => {
    const categories: WardrobeCategoryHealth[] = [
      makeCategory({
        id: 'colors',
        missingColors: ['mint green'],
        missingStyles: ['linen'],
      }),
      makeCategory({
        id: 'styles',
        missingStyles: ['smart casual'],
        missingColors: ['navy'],
      }),
      makeCategory({
        id: 'shirt',
        missingColors: ['white'],
      }),
    ];

    const rows = buildShoppingListRows(categories);
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryKey).toBe('shirt');
  });

  it('skips categories with solid coverage and no gaps', () => {
    const categories: WardrobeCategoryHealth[] = [
      makeCategory({ id: 'belt', status: 'Good' }),
      makeCategory({
        id: 'sweater',
        status: 'Medium',
        missingColors: ['burgundy'],
      }),
    ];

    const rows = buildShoppingListRows(categories);
    expect(rows).toEqual([
      {
        categoryKey: 'sweater',
        category: 'Sweater',
        style: '—',
        color: 'Burgundy',
        key: 'sweater-—-Burgundy-0',
      },
    ]);
  });

  it('emits cartesian product when both missing styles and colors exist', () => {
    const categories: WardrobeCategoryHealth[] = [
      makeCategory({
        id: 'shirt',
        missingStyles: ['linen', 'oxford'],
        missingColors: ['black', 'blue'],
      }),
    ];

    const rows = buildShoppingListRows(categories);
    expect(rows).toHaveLength(4);
    expect(rows).toEqual([
      expect.objectContaining({ style: 'Linen', color: 'Black', key: 'shirt-Linen-Black-0' }),
      expect.objectContaining({ style: 'Linen', color: 'Blue', key: 'shirt-Linen-Blue-1' }),
      expect.objectContaining({ style: 'Oxford', color: 'Black', key: 'shirt-Oxford-Black-2' }),
      expect.objectContaining({ style: 'Oxford', color: 'Blue', key: 'shirt-Oxford-Blue-3' }),
    ]);
  });

  it('emits one row per missing style when only styles exist', () => {
    const categories: WardrobeCategoryHealth[] = [
      makeCategory({
        id: 'shirt',
        missingStyles: ['linen', 'oxford'],
      }),
    ];

    const rows = buildShoppingListRows(categories);
    expect(rows).toEqual([
      {
        categoryKey: 'shirt',
        category: 'Shirt',
        style: 'Linen',
        color: '—',
        key: 'shirt-Linen-—-0',
      },
      {
        categoryKey: 'shirt',
        category: 'Shirt',
        style: 'Oxford',
        color: '—',
        key: 'shirt-Oxford-—-1',
      },
    ]);
  });

  it('emits one row per missing color when only colors exist', () => {
    const categories: WardrobeCategoryHealth[] = [
      makeCategory({
        id: 'shirt',
        missingColors: ['black', 'blue'],
      }),
    ];

    const rows = buildShoppingListRows(categories);
    expect(rows).toEqual([
      {
        categoryKey: 'shirt',
        category: 'Shirt',
        style: '—',
        color: 'Black',
        key: 'shirt-—-Black-0',
      },
      {
        categoryKey: 'shirt',
        category: 'Shirt',
        style: '—',
        color: 'Blue',
        key: 'shirt-—-Blue-1',
      },
    ]);
  });
});

describe('buildShoppingListCsv', () => {
  it('exports header and rows with empty cells for dashes', () => {
    const csv = buildShoppingListCsv([
      {
        categoryKey: 'shirt',
        category: 'Shirt',
        style: 'Oxford',
        color: 'Navy',
        key: 'shirt-Oxford-Navy-0',
      },
      {
        categoryKey: 'shoes',
        category: 'Shoes',
        style: '—',
        color: 'Black',
        key: 'shoes-—-Black-0',
      },
    ]);

    expect(csv).toBe('Category,Style,Color\nShirt,Oxford,Navy\nShoes,,Black');
  });
});

describe('buildWhatsAppShoppingMessage', () => {
  it('formats bullet list with header', () => {
    const message = buildWhatsAppShoppingMessage([
      {
        categoryKey: 'shirt',
        category: 'Shirt',
        style: 'Oxford',
        color: 'Navy',
        key: 'shirt-Oxford-Navy-0',
      },
      {
        categoryKey: 'trouser',
        category: 'Pant',
        style: 'Chino',
        color: 'Charcoal',
        key: 'trouser-Chino-Charcoal-0',
      },
    ]);

    expect(message).toBe(
      'Shopping list (wardrobe analysis)\n\n• Shirt — Oxford, Navy\n• Pant — Chino, Charcoal'
    );
  });
});
