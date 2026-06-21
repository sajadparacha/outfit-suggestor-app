import type { WardrobeInsightContext } from '../models/WardrobeInsightResult';
import {
  buildShoppingListStorageKey,
  countBoughtItems,
  getChecklistItem,
  loadShoppingListChecklist,
  saveShoppingListChecklist,
  setChecklistItem,
  SHOPPING_LIST_STORAGE_PREFIX,
} from './shoppingListStorage';

const context: WardrobeInsightContext = {
  occasion: 'business',
  season: 'winter',
  style: 'smart casual',
};

describe('shoppingListStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds a stable storage key from context and sorted item ids', () => {
    const key = buildShoppingListStorageKey(context, ['item-b', 'item-a', 'item-c']);

    expect(key).toBe(
      `${SHOPPING_LIST_STORAGE_PREFIX}business|winter|smart casual:item-a,item-b,item-c`
    );
  });

  it('loads an empty checklist when nothing is stored', () => {
    const key = buildShoppingListStorageKey(context, ['item-a']);
    expect(loadShoppingListChecklist(key)).toEqual({ items: {} });
  });

  it('persists checklist checked state and notes', () => {
    const key = buildShoppingListStorageKey(context, ['belt-1']);
    const initial = setChecklistItem({ items: {} }, 'belt-1', {
      checked: true,
      note: 'Try M&S',
    });

    saveShoppingListChecklist(key, initial);
    const loaded = loadShoppingListChecklist(key);

    expect(getChecklistItem(loaded, 'belt-1')).toEqual({
      checked: true,
      note: 'Try M&S',
    });
    expect(countBoughtItems(loaded)).toBe(1);
  });

  it('returns safe defaults for corrupt stored JSON', () => {
    const key = buildShoppingListStorageKey(context, ['item-a']);
    localStorage.setItem(key, '{not-json');

    expect(loadShoppingListChecklist(key)).toEqual({ items: {} });
  });
});
