import type { WardrobeInsightContext } from '../models/WardrobeInsightResult';

export const SHOPPING_LIST_STORAGE_PREFIX = 'shopping-list-checklist:';

export interface ShoppingListChecklistItem {
  checked: boolean;
  note: string;
}

export interface ShoppingListChecklistState {
  items: Record<string, ShoppingListChecklistItem>;
}

export const buildShoppingListStorageKey = (
  context: WardrobeInsightContext,
  itemIds: string[]
): string => {
  const contextPart = [context.occasion, context.season, context.style].join('|');
  const sortedIds = [...itemIds].sort().join(',');
  return `${SHOPPING_LIST_STORAGE_PREFIX}${contextPart}:${sortedIds}`;
};

const emptyState = (): ShoppingListChecklistState => ({ items: {} });

export const loadShoppingListChecklist = (key: string): ShoppingListChecklistState => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as ShoppingListChecklistState;
    if (!parsed || typeof parsed !== 'object' || !parsed.items) return emptyState();
    return parsed;
  } catch {
    return emptyState();
  }
};

export const saveShoppingListChecklist = (key: string, state: ShoppingListChecklistState): void => {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore quota or privacy errors
  }
};

export const countBoughtItems = (state: ShoppingListChecklistState): number =>
  Object.values(state.items).filter((item) => item.checked).length;

export const getChecklistItem = (
  state: ShoppingListChecklistState,
  itemId: string
): ShoppingListChecklistItem => state.items[itemId] ?? { checked: false, note: '' };

export const setChecklistItem = (
  state: ShoppingListChecklistState,
  itemId: string,
  update: Partial<ShoppingListChecklistItem>
): ShoppingListChecklistState => ({
  items: {
    ...state.items,
    [itemId]: {
      ...getChecklistItem(state, itemId),
      ...update,
    },
  },
});
