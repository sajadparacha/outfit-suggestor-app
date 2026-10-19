/**
 * Thumbnail helpers + session cache for full photos.
 * List endpoints return `image_thumbnail` with `image_data: null`; the detail endpoints
 * (GET /api/outfit-history/{id}, GET /api/wardrobe/{id}) return the full photo.
 */
import ApiService from '../services/ApiService';
import type { OutfitHistoryEntry } from '../models/OutfitModels';
import type { WardrobeItem } from '../models/WardrobeModels';

type PhotoFields = { image_data?: string | null; image_thumbnail?: string | null };

/** Base64 for list cards: thumbnail first, full photo as fallback (detail-shaped payloads). */
export function thumbnailBase64(source: PhotoFields | null | undefined): string | null {
  return source?.image_thumbnail || source?.image_data || null;
}

export function hasPhoto(source: PhotoFields | null | undefined): boolean {
  return !!thumbnailBase64(source);
}

const historyEntryCache = new Map<number, Promise<OutfitHistoryEntry>>();
const wardrobeItemCache = new Map<number, Promise<WardrobeItem>>();

function cached<T>(cache: Map<number, Promise<T>>, id: number, load: () => Promise<T>): Promise<T> {
  const existing = cache.get(id);
  if (existing) return existing;
  const pending = load();
  cache.set(id, pending);
  pending.catch(() => {
    if (cache.get(id) === pending) cache.delete(id);
  });
  return pending;
}

export function fetchFullHistoryEntry(entryId: number): Promise<OutfitHistoryEntry> {
  return cached(historyEntryCache, entryId, () => ApiService.getOutfitHistoryEntry(entryId));
}

export function fetchFullWardrobeItem(itemId: number): Promise<WardrobeItem> {
  return cached(wardrobeItemCache, itemId, () => ApiService.getWardrobeItem(itemId));
}

/** Store a detail-shaped item (e.g. PUT response) so the next view skips the fetch. */
export function primeWardrobeItem(item: WardrobeItem): void {
  if (item.image_data) {
    wardrobeItemCache.set(item.id, Promise.resolve(item));
  }
}

export function invalidateWardrobeItem(itemId: number): void {
  wardrobeItemCache.delete(itemId);
}

export function invalidateHistoryEntry(entryId: number): void {
  historyEntryCache.delete(entryId);
}

export function clearFullImageCache(): void {
  historyEntryCache.clear();
  wardrobeItemCache.clear();
}

/** Item with full `image_data`: returns as-is when already full or photo-less, else fetches detail. */
export async function resolveFullWardrobeItem(item: WardrobeItem): Promise<WardrobeItem> {
  if (item.image_data || !item.image_thumbnail) return item;
  const full = await fetchFullWardrobeItem(item.id);
  return { ...item, ...full };
}

/** Entry with full `image_data`: returns as-is when already full, else fetches detail. */
export async function resolveFullHistoryEntry(entry: OutfitHistoryEntry): Promise<OutfitHistoryEntry> {
  if (entry.image_data) return entry;
  const full = await fetchFullHistoryEntry(entry.id);
  return { ...entry, ...full };
}
