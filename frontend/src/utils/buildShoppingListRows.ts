import { WardrobeCategoryHealth } from '../models/WardrobeInsightResult';
import { prettyLabel } from './insightsHelpers';

export interface ShoppingListRow {
  categoryKey: string;
  category: string;
  style: string;
  color: string;
  key: string;
}

export const SHOPPING_LIST_CATEGORY_ORDER = [
  'shirt',
  'trouser',
  'blazer',
  'jacket',
  'shoes',
  'belt',
  'sweater',
] as const;

const CLOTHING_CATEGORY_IDS = new Set<string>(SHOPPING_LIST_CATEGORY_ORDER);

const SHOPPING_LIST_CATEGORY_LABELS: Record<string, string> = {
  shirt: 'Shirt',
  trouser: 'Pant',
  blazer: 'Jacket',
  jacket: 'Jacket',
  shoes: 'Shoes',
  belt: 'Belt',
  sweater: 'Sweater',
};

const EMPTY_CELL = '—';

const categoryDisplayLabel = (categoryKey: string): string =>
  SHOPPING_LIST_CATEGORY_LABELS[categoryKey] ?? prettyLabel(categoryKey);

const shouldIncludeRow = (item: WardrobeCategoryHealth): boolean => {
  const hasMissingStyle = item.missingStyles.length > 0;
  const hasMissingColor = item.missingColors.length > 0;
  const isWeakOrMissing = item.status === 'Missing' || item.status === 'Weak';
  return hasMissingStyle || hasMissingColor || isWeakOrMissing;
};

const rowKey = (categoryKey: string, style: string, color: string, index: number): string =>
  `${categoryKey}-${style}-${color}-${index}`;

const buildRowsForCategory = (
  categoryKey: string,
  item: WardrobeCategoryHealth
): ShoppingListRow[] => {
  const category = categoryDisplayLabel(categoryKey);
  const styles = item.missingStyles.map(prettyLabel);
  const colors = item.missingColors.map(prettyLabel);

  if (styles.length > 0 && colors.length > 0) {
    let index = 0;
    return styles.flatMap((style) =>
      colors.map((color) => {
        const row = { categoryKey, category, style, color, key: rowKey(categoryKey, style, color, index) };
        index += 1;
        return row;
      })
    );
  }

  if (styles.length > 0) {
    return styles.map((style, index) => ({
      categoryKey,
      category,
      style,
      color: EMPTY_CELL,
      key: rowKey(categoryKey, style, EMPTY_CELL, index),
    }));
  }

  if (colors.length > 0) {
    return colors.map((color, index) => ({
      categoryKey,
      category,
      style: EMPTY_CELL,
      color,
      key: rowKey(categoryKey, EMPTY_CELL, color, index),
    }));
  }

  return [
    {
      categoryKey,
      category,
      style: EMPTY_CELL,
      color: EMPTY_CELL,
      key: rowKey(categoryKey, EMPTY_CELL, EMPTY_CELL, 0),
    },
  ];
};

export const buildShoppingListRows = (
  categoryHealth: WardrobeCategoryHealth[]
): ShoppingListRow[] => {
  const byId = new Map(categoryHealth.map((item) => [item.id, item]));

  return SHOPPING_LIST_CATEGORY_ORDER.flatMap((categoryKey) => {
    if (!CLOTHING_CATEGORY_IDS.has(categoryKey)) return [];

    const item = byId.get(categoryKey);
    if (!item || !shouldIncludeRow(item)) return [];

    return buildRowsForCategory(categoryKey, item);
  });
};

export const buildShoppingListCsv = (rows: ShoppingListRow[]): string => {
  const escapeCsv = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvValue = (value: string): string => (value === EMPTY_CELL ? '' : value);

  const lines = [
    'Category,Style,Color',
    ...rows.map((row) =>
      [row.category, csvValue(row.style), csvValue(row.color)].map(escapeCsv).join(',')
    ),
  ];

  return lines.join('\n');
};

export const buildWhatsAppShoppingMessage = (rows: ShoppingListRow[]): string => {
  const bullets = rows.map((row) => {
    const stylePart = row.style !== EMPTY_CELL ? row.style : null;
    const colorPart = row.color !== EMPTY_CELL ? row.color : null;

    let detail = EMPTY_CELL;
    if (stylePart && colorPart) detail = `${stylePart}, ${colorPart}`;
    else if (stylePart) detail = stylePart;
    else if (colorPart) detail = colorPart;

    return `• ${row.category} — ${detail}`;
  });

  return ['Shopping list (wardrobe analysis)', '', ...bullets].join('\n');
};
