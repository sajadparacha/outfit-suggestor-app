//
//  WardrobeCardUx.swift
//  OutfitSuggestor
//
//  Copy and accessibility identifiers for wardrobe item cards.
//

import Foundation

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
    static let menuTriggerAccessibilityLabel = "More actions"

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
