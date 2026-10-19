/**
 * ApiService — smaller history/wardrobe responses (spec: api-response-size).
 */
import apiService, { OUTFIT_HISTORY_MAX_LIMIT, OUTFIT_HISTORY_PAGE_SIZE } from './ApiService';
import {
  clearFullImageCache,
  fetchFullHistoryEntry,
  fetchFullWardrobeItem,
  invalidateWardrobeItem,
  primeWardrobeItem,
  resolveFullWardrobeItem,
  thumbnailBase64,
} from '../utils/fullImageCache';
import type { WardrobeItem } from '../models/WardrobeModels';

const BASE = 'http://localhost:8001';

function mockJsonResponse(body: unknown, status = 200) {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h === 'content-type' ? 'application/json' : null) },
    json: async () => body,
    clone() {
      return res;
    },
  };
  return res;
}

const wardrobeItem = (overrides: Partial<WardrobeItem> = {}): WardrobeItem => ({
  id: 7,
  category: 'shirt',
  name: null,
  description: 'Blue shirt',
  color: 'Blue',
  brand: null,
  size: null,
  image_data: null,
  image_thumbnail: 'thumb-7',
  tags: null,
  condition: null,
  wear_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('ApiService response-size contract', () => {
  const originalFetch = global.fetch;

  const requestedUrl = (call = 0) => (global.fetch as jest.Mock).mock.calls[call][0] as string;

  beforeEach(() => {
    localStorage.clear();
    apiService.setAuthToken('test-token');
    clearFullImageCache();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue(mockJsonResponse([])) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    apiService.setAuthToken(null);
    jest.restoreAllMocks();
  });

  describe('getOutfitHistory', () => {
    it('defaults to the first page of 20', async () => {
      await apiService.getOutfitHistory();
      const url = new URL(requestedUrl());
      expect(url.pathname).toBe('/api/outfit-history');
      expect(url.searchParams.get('limit')).toBe(String(OUTFIT_HISTORY_PAGE_SIZE));
      expect(url.searchParams.get('offset')).toBe('0');
      expect(url.searchParams.has('wardrobe_item_id')).toBe(false);
      expect(url.searchParams.has('include_images')).toBe(false);
    });

    it('sends limit, offset, wardrobe_item_id and include_images=false', async () => {
      await apiService.getOutfitHistory({
        limit: 20,
        offset: 40,
        wardrobeItemId: 12,
        includeImages: false,
      });
      const url = new URL(requestedUrl());
      expect(url.searchParams.get('limit')).toBe('20');
      expect(url.searchParams.get('offset')).toBe('40');
      expect(url.searchParams.get('wardrobe_item_id')).toBe('12');
      expect(url.searchParams.get('include_images')).toBe('false');
    });

    it('never requests more than 100 entries', async () => {
      await apiService.getOutfitHistory({ limit: 150 });
      expect(new URL(requestedUrl()).searchParams.get('limit')).toBe(String(OUTFIT_HISTORY_MAX_LIMIT));
    });

    it('omits include_images when images are wanted (server default true)', async () => {
      await apiService.getOutfitHistory({ includeImages: true });
      expect(new URL(requestedUrl()).searchParams.has('include_images')).toBe(false);
    });

    it('returns list entries with thumbnails and null image_data', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse([{ id: 1, image_data: null, image_thumbnail: 'thumb-1' }])
      ) as unknown as typeof fetch;
      const entries = await apiService.getOutfitHistory();
      expect(entries[0].image_data).toBeNull();
      expect(entries[0].image_thumbnail).toBe('thumb-1');
    });
  });

  describe('detail endpoints', () => {
    it('getOutfitHistoryEntry hits GET /api/outfit-history/{id}', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse({ id: 5, image_data: 'full-5', image_thumbnail: 'thumb-5' })
      ) as unknown as typeof fetch;
      const entry = await apiService.getOutfitHistoryEntry(5);
      expect(requestedUrl()).toBe(`${BASE}/api/outfit-history/5`);
      expect(entry.image_data).toBe('full-5');
    });

    it('getOutfitHistoryEntry surfaces 404 detail', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse({ detail: 'History entry not found' }, 404)
      ) as unknown as typeof fetch;
      await expect(apiService.getOutfitHistoryEntry(99)).rejects.toThrow('History entry not found');
    });

    it('getWardrobeItem hits GET /api/wardrobe/{id}', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(wardrobeItem({ image_data: 'full-7' }))
      ) as unknown as typeof fetch;
      const item = await apiService.getWardrobeItem(7);
      expect(requestedUrl()).toBe(`${BASE}/api/wardrobe/7`);
      expect(item.image_data).toBe('full-7');
    });
  });

  describe('full image cache', () => {
    it('caches history detail by entry id for the session', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse({ id: 5, image_data: 'full-5' })
      ) as unknown as typeof fetch;
      await fetchFullHistoryEntry(5);
      await fetchFullHistoryEntry(5);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('does not cache failed detail fetches', async () => {
      const detailResponses = [
        mockJsonResponse({ detail: 'Boom' }, 500),
        mockJsonResponse({ id: 5, image_data: 'full-5' }),
      ];
      global.fetch = jest.fn(async (url: string) =>
        url.includes('/api/error-events') ? mockJsonResponse({ id: 1 }) : detailResponses.shift()
      ) as unknown as typeof fetch;
      await expect(fetchFullHistoryEntry(5)).rejects.toThrow('Boom');
      await expect(fetchFullHistoryEntry(5)).resolves.toMatchObject({ image_data: 'full-5' });
    });

    it('invalidates a wardrobe item so the next view refetches', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(wardrobeItem({ image_data: 'full-7' }))
      ) as unknown as typeof fetch;
      await fetchFullWardrobeItem(7);
      invalidateWardrobeItem(7);
      await fetchFullWardrobeItem(7);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('primed (PUT response) items skip the detail fetch', async () => {
      primeWardrobeItem(wardrobeItem({ image_data: 'updated-full-7' }));
      const item = await fetchFullWardrobeItem(7);
      expect(item.image_data).toBe('updated-full-7');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('resolveFullWardrobeItem fetches detail only for thumbnail-only list items', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(wardrobeItem({ image_data: 'full-7' }))
      ) as unknown as typeof fetch;

      const alreadyFull = wardrobeItem({ image_data: 'inline-full' });
      expect(await resolveFullWardrobeItem(alreadyFull)).toBe(alreadyFull);
      const noPhoto = wardrobeItem({ image_thumbnail: null });
      expect(await resolveFullWardrobeItem(noPhoto)).toBe(noPhoto);
      expect(global.fetch).not.toHaveBeenCalled();

      const resolved = await resolveFullWardrobeItem(wardrobeItem());
      expect(resolved.image_data).toBe('full-7');
      expect(requestedUrl()).toBe(`${BASE}/api/wardrobe/7`);
    });

    it('thumbnailBase64 prefers image_thumbnail over image_data', () => {
      expect(thumbnailBase64({ image_data: 'full', image_thumbnail: 'thumb' })).toBe('thumb');
      expect(thumbnailBase64({ image_data: 'full', image_thumbnail: null })).toBe('full');
      expect(thumbnailBase64({ image_data: null, image_thumbnail: null })).toBeNull();
    });
  });
});
