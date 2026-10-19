//
//  ImageThumbnailData.swift
//  OutfitSuggestor
//
//  List payloads carry `image_thumbnail` (≤256 px) with `image_data` null; full photos
//  come from detail endpoints and are cached for the session.
//

import Foundation

enum ImageThumbnailData {
    /// Value to render as a list thumbnail: `image_thumbnail ?? image_data` (empty strings ignored).
    static func thumbnailOrFull(thumbnail: String?, full: String?) -> String? {
        if let thumbnail, !thumbnail.isEmpty { return thumbnail }
        if let full, !full.isEmpty { return full }
        return nil
    }

    /// Value for flows that need the real photo: full `image_data` when present, else the thumbnail.
    static func fullOrThumbnail(full: String?, thumbnail: String?) -> String? {
        thumbnailOrFull(thumbnail: full, full: thumbnail)
    }
}

/// Session cache of detail payloads (full `image_data`) keyed by history entry id / wardrobe item id.
final class FullImageCache {
    static let shared = FullImageCache()

    private final class Box<Value> {
        let value: Value
        init(_ value: Value) { self.value = value }
    }

    private let historyEntries = NSCache<NSNumber, Box<OutfitHistoryEntry>>()
    private let wardrobeItems = NSCache<NSNumber, Box<WardrobeItem>>()

    init(countLimit: Int = 60) {
        historyEntries.countLimit = countLimit
        wardrobeItems.countLimit = countLimit
    }

    func historyEntry(id: Int) -> OutfitHistoryEntry? {
        historyEntries.object(forKey: NSNumber(value: id))?.value
    }

    func store(historyEntry: OutfitHistoryEntry) {
        historyEntries.setObject(Box(historyEntry), forKey: NSNumber(value: historyEntry.id))
    }

    func invalidateHistoryEntry(id: Int) {
        historyEntries.removeObject(forKey: NSNumber(value: id))
    }

    func wardrobeItem(id: Int) -> WardrobeItem? {
        wardrobeItems.object(forKey: NSNumber(value: id))?.value
    }

    func store(wardrobeItem: WardrobeItem) {
        wardrobeItems.setObject(Box(wardrobeItem), forKey: NSNumber(value: wardrobeItem.id))
    }

    func invalidateWardrobeItem(id: Int) {
        wardrobeItems.removeObject(forKey: NSNumber(value: id))
    }

    func removeAll() {
        historyEntries.removeAllObjects()
        wardrobeItems.removeAllObjects()
    }
}

/// Fetches detail endpoints for flows that need the real photo (enlarge, load into main flow).
enum FullImageLoader {
    static func historyEntryDetail(
        id: Int,
        api: APIServiceProtocol = APIService.shared,
        cache: FullImageCache = .shared
    ) async throws -> OutfitHistoryEntry {
        if let cached = cache.historyEntry(id: id) { return cached }
        let entry = try await api.getOutfitHistoryEntry(id: id)
        cache.store(historyEntry: entry)
        return entry
    }

    static func wardrobeItemDetail(
        id: Int,
        api: APIServiceProtocol = APIService.shared,
        cache: FullImageCache = .shared
    ) async throws -> WardrobeItem {
        if let cached = cache.wardrobeItem(id: id) { return cached }
        let item = try await api.getWardrobeItem(id: id)
        cache.store(wardrobeItem: item)
        return item
    }

    /// Full photo for an enlarge viewer; nil when the fetch fails (caller keeps the thumbnail).
    static func historyInputFullImageData(
        entryId: Int,
        api: APIServiceProtocol = APIService.shared,
        cache: FullImageCache = .shared
    ) async -> String? {
        guard let entry = try? await historyEntryDetail(id: entryId, api: api, cache: cache),
              let full = entry.image_data, !full.isEmpty else { return nil }
        return full
    }

    static func wardrobeFullImageData(
        itemId: Int,
        api: APIServiceProtocol = APIService.shared,
        cache: FullImageCache = .shared
    ) async -> String? {
        guard let item = try? await wardrobeItemDetail(id: itemId, api: api, cache: cache),
              let full = item.image_data, !full.isEmpty else { return nil }
        return full
    }
}
