import { renderHook, act } from '@testing-library/react';
import { useWardrobeController } from './useWardrobeController';
import ApiService from '../services/ApiService';
import { WardrobeItem } from '../models/WardrobeModels';
import { matchesWardrobeCategoryFilter } from '../utils/wardrobeCategory';

jest.mock('../services/ApiService', () => ({
  __esModule: true,
  default: {
    getWardrobe: jest.fn(),
    getWardrobeSummary: jest.fn(),
  },
}));

const mockApi = ApiService as jest.Mocked<typeof ApiService>;

const makeItem = (id: number, category: string): WardrobeItem =>
  ({
    id,
    category,
    name: null,
    description: `${category} ${id}`,
    color: 'Gray',
    image_thumbnail: null,
  } as unknown as WardrobeItem);

/**
 * Mirrors the demo wardrobe: 124 items, more than the backend's 100-item page cap.
 * The 9 trousers are the OLDEST items, so a single-page bulk load drops them.
 */
const buildLargeWardrobe = (): WardrobeItem[] => {
  const items: WardrobeItem[] = [];
  // Oldest first in the DB, newest first on the wire.
  [200, 201, 203, 206, 299, 300, 307, 315, 323].forEach((id) => items.push(makeItem(id, 'trouser')));
  for (let id = 1000; id < 1115; id += 1) {
    items.push(makeItem(id, 'shirt'));
  }
  return items; // 124 items
};

describe('useWardrobeController bulk load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches every page so the Trousers filter matches its summary count', async () => {
    const all = buildLargeWardrobe();
    const total = all.length;
    expect(total).toBe(124);

    mockApi.getWardrobe.mockImplementation(async (_category, _search, limit = 10, offset = 0) => ({
      items: all.slice(offset, offset + limit),
      total,
      limit,
      offset,
    }));

    const { result } = renderHook(() => useWardrobeController());

    await act(async () => {
      // Wardrobe.tsx passes a bulk limit for client-side (grouped) filters.
      await result.current.loadWardrobe(undefined, undefined, 1, 100);
    });

    expect(result.current.wardrobeItems).toHaveLength(total);
    expect(result.current.totalCount).toBe(total);

    const visibleTrousers = result.current.wardrobeItems.filter((item) =>
      matchesWardrobeCategoryFilter(item.category, 'trouser')
    );
    expect(visibleTrousers).toHaveLength(9);

    // Every page was requested, not just the first 100.
    expect(mockApi.getWardrobe).toHaveBeenCalledTimes(2);
    expect(mockApi.getWardrobe).toHaveBeenNthCalledWith(1, undefined, undefined, 100, 0);
    expect(mockApi.getWardrobe).toHaveBeenNthCalledWith(2, undefined, undefined, 100, 100);
  });

  it('stops after one page when the wardrobe fits', async () => {
    const all = [makeItem(1, 'shirt'), makeItem(2, 'trouser')];
    mockApi.getWardrobe.mockResolvedValue({
      items: all,
      total: all.length,
      limit: 100,
      offset: 0,
    } as any);

    const { result } = renderHook(() => useWardrobeController());
    await act(async () => {
      await result.current.loadWardrobe(undefined, undefined, 1, 100);
    });

    expect(mockApi.getWardrobe).toHaveBeenCalledTimes(1);
    expect(result.current.wardrobeItems).toHaveLength(2);
  });

  it('uses plain pagination when no bulk limit is passed', async () => {
    const all = buildLargeWardrobe();
    mockApi.getWardrobe.mockResolvedValue({
      items: all.slice(0, 10),
      total: all.length,
      limit: 10,
      offset: 0,
    } as any);

    const { result } = renderHook(() => useWardrobeController());
    await act(async () => {
      await result.current.loadWardrobe(undefined, undefined, 1);
    });

    expect(mockApi.getWardrobe).toHaveBeenCalledTimes(1);
    expect(mockApi.getWardrobe).toHaveBeenCalledWith(undefined, undefined, 10, 0);
    expect(result.current.wardrobeItems).toHaveLength(10);
    expect(result.current.totalCount).toBe(124);
  });
});
