//
//  HistoryPageLoader.swift
//  OutfitSuggestor
//
//  Offset pagination over GET /api/outfit-history (newest first). A page shorter
//  than the requested limit is the last page.
//

import Foundation
import Combine

@MainActor
final class HistoryPageLoader: ObservableObject {
    nonisolated static let pageSize = 20
    /// Page size used while draining remaining pages for client-side search.
    nonisolated static let drainPageSize = 100
    /// Load the next page once one of the last N rows appears.
    nonisolated static let prefetchThreshold = 3
    nonisolated static let loadingMoreAccessibilityLabel = "Loading more looks"

    @Published private(set) var entries: [OutfitHistoryEntry] = []
    @Published private(set) var isLoadingFirstPage = false
    @Published private(set) var isLoadingMore = false
    @Published private(set) var hasMore = true
    @Published private(set) var hasLoadedFirstPage = false
    @Published private(set) var errorMessage: String?

    let wardrobeItemId: Int?
    private let apiService: APIServiceProtocol
    private var nextOffset = 0

    init(apiService: APIServiceProtocol = APIService.shared, wardrobeItemId: Int? = nil) {
        self.apiService = apiService
        self.wardrobeItemId = wardrobeItemId
    }

    var isBusy: Bool { isLoadingFirstPage || isLoadingMore }

    /// History header line (matches web): "Showing last N entries." while pages remain, else "Showing all N entries".
    nonisolated static func headerText(count: Int, hasMore: Bool) -> String {
        let noun = count == 1 ? "entry" : "entries"
        return hasMore ? "Showing last \(count) \(noun)." : "Showing all \(count) \(noun)"
    }

    var headerText: String {
        Self.headerText(count: entries.count, hasMore: hasMore)
    }

    func loadFirstPage() async {
        guard !isBusy else { return }
        isLoadingFirstPage = true
        errorMessage = nil
        defer { isLoadingFirstPage = false }
        do {
            let page = try await fetch(offset: 0, limit: Self.pageSize)
            entries = page
            nextOffset = page.count
            hasMore = page.count >= Self.pageSize
            hasLoadedFirstPage = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Appends the next page. Returns false when the request failed (loaded entries are kept).
    @discardableResult
    func loadMore(pageSize: Int = HistoryPageLoader.pageSize) async -> Bool {
        guard hasLoadedFirstPage, hasMore, !isBusy else { return true }
        let limit = min(max(pageSize, 1), APIService.outfitHistoryMaxLimit)
        isLoadingMore = true
        defer { isLoadingMore = false }
        do {
            let page = try await fetch(offset: nextOffset, limit: limit)
            let known = Set(entries.map(\.id))
            entries.append(contentsOf: page.filter { !known.contains($0.id) })
            nextOffset += page.count
            hasMore = page.count >= limit
            return true
        } catch {
            return false
        }
    }

    /// Row `onAppear` hook: loads the next page when one of the last rows becomes visible.
    func loadMoreIfNeeded(currentEntryId: Int, visibleIds: [Int]) async {
        guard hasMore, !isBusy,
              let index = visibleIds.firstIndex(of: currentEntryId),
              index >= visibleIds.count - Self.prefetchThreshold else { return }
        await loadMore()
    }

    /// Loads every remaining page (page size 100) — used while a client-side search is active.
    func loadAllRemaining() async {
        guard hasLoadedFirstPage else { return }
        while hasMore {
            if isBusy {
                try? await Task.sleep(nanoseconds: 50_000_000)
                continue
            }
            let ok = await loadMore(pageSize: Self.drainPageSize)
            if !ok || Task.isCancelled { return }
        }
    }

    /// Local removal after delete; shifts the server offset so the next page does not skip an entry.
    func remove(entryId: Int) {
        guard entries.contains(where: { $0.id == entryId }) else { return }
        entries.removeAll { $0.id == entryId }
        nextOffset = max(0, nextOffset - 1)
    }

    private func fetch(offset: Int, limit: Int) async throws -> [OutfitHistoryEntry] {
        try await apiService.getOutfitHistory(
            limit: limit,
            offset: offset,
            wardrobeItemId: wardrobeItemId,
            includeImages: true
        )
    }
}
