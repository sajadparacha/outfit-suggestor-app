//
//  WardrobeCardUx.swift
//  OutfitSuggestor
//
//  Copy and accessibility identifiers for wardrobe item cards.
//

import Foundation
import UIKit
import Combine

enum WardrobeCardMenuAction: String, CaseIterable {
    case viewImage
    case edit
    case history
    case delete

    var title: String {
        switch self {
        case .viewImage: return "View image"
        case .edit: return "Edit"
        case .history: return "Past Suggestions"
        case .delete: return "Delete"
        }
    }

    var systemImage: String {
        switch self {
        case .viewImage: return "photo"
        case .edit: return "pencil"
        case .history: return "clock.arrow.circlepath"
        case .delete: return "trash"
        }
    }
}

enum WardrobeCardUx {
    static let styleThisItemTitle = "Style this item"
    static let styleThisItemAccessibilityLabel = "Style this item with AI"
    static let pastSuggestionsTitle = "Past Suggestions"
    static let pastSuggestionsAccessibilityLabel = "Past Suggestions"
    static let pastSuggestionsLoadingAccessibilityLabel = "Loading…"
    static let pastSuggestionsLoadingMessage = "Loading past suggestions for this item…"
    static let menuTriggerAccessibilityLabel = "More actions"

    static let pastSuggestionsProgressPanelAccessibilityIdentifier = "ai.progressPanel"
    static let pastSuggestionsProgressTitleAccessibilityIdentifier = "ai.progressTitle"
    static let pastSuggestionsProgressOperationType: AiOperationType = .pastSuggestions

    /// Overflow menu order for wardrobe card actions.
    /// WardrobeCardView uses native SwiftUI `Menu`; the system popover presents outside
    /// the card and is unaffected by the card's `clipShape` (web overflow-hidden bug N/A).
    static let menuActionsOrder: [WardrobeCardMenuAction] = [
        .viewImage, .edit, .history, .delete
    ]

    static let flowTipStep2Fragment = "Tap Style this item"

    static func heroButtonIdentifier(itemId: Int) -> String {
        "wardrobe.getSuggestion.\(itemId)"
    }

    static func pastSuggestionsButtonIdentifier(itemId: Int) -> String {
        "wardrobe.pastSuggestions.\(itemId)"
    }

    static func menuTriggerIdentifier(itemId: Int) -> String {
        "wardrobe.itemMenu.\(itemId)"
    }

    static func menuItemIdentifier(itemId: Int, action: WardrobeCardMenuAction) -> String {
        "wardrobe.menu.\(action.rawValue).\(itemId)"
    }

    static func historyUseThisIdentifier(entryId: Int) -> String {
        "wardrobe.history.useThis.\(entryId)"
    }
}

enum WardrobeCompletionCopy {
    static let noItemsSelected = "No items selected"
    static let sharedPreferencesHint = InsightsCopy.sharedPreferencesNote
    static let preferencesPanelAccessibilityId = "wardrobe.completion.preferences"
    static let wardrobeOnlyCheckboxAccessibilityId = "wardrobe.completion.wardrobeOnlyCheckbox"

    static func filterAccessibilityId(for title: String) -> String {
        "wardrobe.completion.filter.\(title.lowercased())"
    }
}

enum WardrobeImageData {
    static func decodeUIImage(from value: String?) -> UIImage? {
        guard let raw = value, !raw.isEmpty else { return nil }
        let payload = raw.contains("base64,") ? String(raw.split(separator: ",").last ?? "") : raw
        let cleaned = payload.replacingOccurrences(of: "\\s", with: "", options: .regularExpression)
        guard let data = Data(base64Encoded: cleaned) else { return nil }
        return UIImage(data: data)
    }
}

enum WardrobeCompletionThumbnails {
    static let rowAccessibilityId = "wardrobe.multiSelect.thumbnails"

    static func thumbnailAccessibilityId(itemId: Int) -> String {
        "wardrobe.multiSelect.thumb.\(itemId)"
    }

    static func viewImageAccessibilityLabel(for item: WardrobeItem) -> String {
        let slot = WardrobeCompletionSlot.normalized(from: item.category)
        let name = slot?.summaryLabel ?? item.category
        return "View \(name)"
    }

    static func selectedItemsInOrder(selectedItemIds: [Int], allItems: [WardrobeItem]) -> [WardrobeItem] {
        selectedItemIds.compactMap { id in
            allItems.first { $0.id == id }
        }
    }

    static func thumbnailItemsInOrder(selectedItemIds: [Int], allItems: [WardrobeItem]) -> [WardrobeItem] {
        selectedItemsInOrder(selectedItemIds: selectedItemIds, allItems: allItems)
            .filter { hasDecodableImageData($0.image_data) }
    }

    static func hasDecodableImageData(_ value: String?) -> Bool {
        WardrobeImageData.decodeUIImage(from: value) != nil
    }
}

enum WardrobePastSuggestionsMatching {
    static func historyEntryReferencesItem(_ entry: OutfitHistoryEntry, item: WardrobeItem) -> Bool {
        if entry.source_wardrobe_item_id == item.id {
            return true
        }
        let slotIds = [entry.shirt_id, entry.trouser_id, entry.blazer_id, entry.shoes_id, entry.belt_id]
        if slotIds.contains(where: { $0 == item.id }) {
            return true
        }
        guard let itemImage = item.image_data, let entryImage = entry.image_data else {
            return false
        }
        return itemImage == entryImage
    }
}

@MainActor
final class WardrobePastSuggestionsLoader: ObservableObject {
    @Published private(set) var loadingItemId: Int?
    @Published var showSheet = false
    @Published var suggestions: [OutfitHistoryEntry] = []
    @Published var error: String?
    @Published var sourceItem: WardrobeItem?

    private let apiService: APIServiceProtocol

    init(apiService: APIServiceProtocol = APIService.shared) {
        self.apiService = apiService
    }

    var showsProgressPanel: Bool {
        loadingItemId != nil
    }

    var progressOperationType: AiOperationType {
        WardrobeCardUx.pastSuggestionsProgressOperationType
    }

    var progressMessage: String {
        WardrobeCardUx.pastSuggestionsLoadingMessage
    }

    func open(for item: WardrobeItem) async {
        loadingItemId = item.id
        sourceItem = item
        error = nil
        suggestions = []
        defer { loadingItemId = nil }

        do {
            let allHistory = try await apiService.getOutfitHistory(limit: 100)
            let matches = allHistory.filter { entry in
                WardrobePastSuggestionsMatching.historyEntryReferencesItem(entry, item: item)
            }
            suggestions = matches
            if matches.isEmpty {
                error = "No history suggestions found for this wardrobe item yet."
            }
            showSheet = true
        } catch {
            self.error = error.localizedDescription
            showSheet = true
        }
    }
}
