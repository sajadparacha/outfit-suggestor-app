//
//  WardrobeInsightsPresentation.swift
//  OutfitSuggestor
//
//  Testable presentation rules for Wardrobe Insights flow.
//

import Foundation

enum WardrobeInsightsPresentation {
    /// Full preferences form before first analysis or when user expands preferences.
    static func shouldShowExpandedPreferences(hasResult: Bool, isPreferencesExpanded: Bool) -> Bool {
        !hasResult || isPreferencesExpanded
    }

    /// Collapsed context bar after analysis when preferences are not expanded.
    static func shouldShowContextBar(hasResult: Bool, isPreferencesExpanded: Bool) -> Bool {
        hasResult && !isPreferencesExpanded
    }

    /// Primary analyze CTA when no result yet or user is editing preferences.
    static func shouldShowAnalyzeButton(hasResult: Bool, isPreferencesExpanded: Bool, isLoading: Bool) -> Bool {
        guard !isLoading else { return false }
        return !hasResult || isPreferencesExpanded
    }

    static func shouldShowAdminDebug(isAdmin: Bool) -> Bool {
        isAdmin
    }

    static func shouldShowResults(hasResult: Bool) -> Bool {
        hasResult
    }

    static func shouldShowShoppingListAction(hasResult: Bool) -> Bool {
        hasResult
    }

    static var shoppingListExportActionTitles: [String] {
        [
            InsightsCopy.exportToWhatsAppButton,
            InsightsCopy.copyListButton,
            InsightsCopy.exportAsPDFButton,
        ]
    }
}

enum WardrobeCategoryIcon {
    static func symbolName(for categoryId: String) -> String {
        switch categoryId.lowercased() {
        case "shirt", "shirts": return "tshirt.fill"
        case "trouser", "trousers": return "figure.walk"
        case "shoes", "shoe": return "shoe.fill"
        case "blazer", "blazers": return "jacket.fill"
        case "belt", "belts": return "minus.rectangle.fill"
        case "colors": return "paintpalette.fill"
        case "styles": return "tag.fill"
        default: return "hanger"
        }
    }
}

enum WardrobeInsightsAccordionLogic {
    static let initialExpandedIds: Set<String> = []

    static func isExpanded(categoryId: String, expandedIds: Set<String>) -> Bool {
        expandedIds.contains(categoryId)
    }

    static func toggled(categoryId: String, expandedIds: Set<String>) -> Set<String> {
        var next = expandedIds
        if next.contains(categoryId) {
            next.remove(categoryId)
        } else {
            next.insert(categoryId)
        }
        return next
    }
}

enum WardrobeInsightsLayout {
    /// iOS uses 2-column LazyVGrid for coverage (layout-only; same UX on iPhone and iPad).
    static let coverageGridColumnCount = 2
}

enum WardrobeCoverageStatusStyle {
    static func color(for status: WardrobeCoverageStatus) -> (red: Double, green: Double, blue: Double) {
        switch status {
        case .good: return (0.13, 0.77, 0.37)
        case .medium: return (0.92, 0.70, 0.03)
        case .weak: return (0.98, 0.45, 0.09)
        case .missing: return (0.94, 0.27, 0.27)
        case .needsNeutrals: return (0.43, 0.50, 0.92)
        case .tooCasual: return (0.23, 0.51, 0.96)
        }
    }
}
