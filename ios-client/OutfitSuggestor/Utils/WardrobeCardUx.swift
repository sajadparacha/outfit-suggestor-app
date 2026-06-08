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
        case .history: return "History"
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
    static let menuTriggerAccessibilityLabel = "More actions"

    static let menuActionsOrder: [WardrobeCardMenuAction] = [
        .viewImage, .edit, .history, .delete
    ]

    static let flowTipStep2Fragment = "Tap Style this item"

    static func heroButtonIdentifier(itemId: Int) -> String {
        "wardrobe.getSuggestion.\(itemId)"
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
