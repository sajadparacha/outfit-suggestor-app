//
//  IosLayoutBugFixPresentation.swift
//  OutfitSuggestor
//
//  Pure helpers for the Aug 2026 iOS layout bug-fix batch (testable contracts).
//

import Foundation

/// Wardrobe tab: avoid large-title overlap on Filter chips.
enum WardrobeNavigationPresentation {
    static let title = "Wardrobe"
    /// Large titles overlap the Filter-by chips; always use inline.
    static let usesInlineTitle = true
}

/// Week Planner shared Season / Reminder control sizing.
enum WeekPlanSharedControlsLayout {
    static let controlMinHeight: CGFloat = 88
    static let controlsAccessibilityId = "week.controls"
    static let seasonAccessibilityId = "week.sharedSeason"
    static let reminderAccessibilityId = "week.reminderTime"
    static let timezoneAccessibilityId = "week.timezone"

    /// Both controls share equal width in an HStack.
    static func equalWidthPairCount() -> Int { 2 }
}

/// Week overview horizontal scroll affordance.
enum WeekPlanOverviewScrollHint {
    static let overviewAccessibilityId = "week.overview"
    static let scrollHintAccessibilityId = "week.overview.scrollHint"
    static let accessibilityHint = "Swipe horizontally to see more days"
    static let trailingFadeWidth: CGFloat = 36
    static let trailingContentPadding: CGFloat = 28

    /// Always show the peek chevron when the overview has at least one day card.
    static func shouldShowScrollHint(dayCount: Int) -> Bool {
        dayCount > 0
    }
}

/// Suggest result sticky actions: equal size, wrap to two rows when needed.
enum MainFlowResultActionsLayout {
    static let buttonMinHeight: CGFloat = 44
    static let generateAnotherAccessibilityId = "main.generateAnotherButton"
    static let saveLookAccessibilityId = "main.saveLookButton"
    static let refineAccessibilityId = "main.refineButton"

    /// Prefer a single row when width is enough for three equal buttons + gaps.
    static func prefersSingleRow(availableWidth: CGFloat, spacing: CGFloat = 10) -> Bool {
        let minimumPerButton: CGFloat = 96
        let needed = (minimumPerButton * 3) + (spacing * 2)
        return availableWidth >= needed
    }
}

/// Wardrobe card complete-outfit CTA copy selection (web parity).
enum WardrobeCompleteOutfitCardAction: Equatable {
    case add
    case remove
    case unavailable

    var title: String {
        switch self {
        case .add: return WardrobeCardUx.addToOutfitCompletion
        case .remove: return WardrobeCardUx.removeFromOutfitCompletion
        case .unavailable: return "Outfit completion unavailable"
        }
    }

    static func resolve(isEligible: Bool, isSelected: Bool) -> WardrobeCompleteOutfitCardAction {
        guard isEligible else { return .unavailable }
        return isSelected ? .remove : .add
    }

    /// First tap outside selection mode should enter selection, then toggle.
    static func shouldEnterSelectionMode(isCurrentlyInMode: Bool) -> Bool {
        !isCurrentlyInMode
    }

    static func shouldShowCompleteOutfitButton(
        hasCompletionHandler: Bool,
        isWeekPlanPickMode: Bool
    ) -> Bool {
        hasCompletionHandler && !isWeekPlanPickMode
    }
}

extension FiltersView.GridContract {
    /// Parent already renders a "Preferences" headline (MainFlow / Wardrobe disclosure).
    static func shouldShowEmbeddedSectionTitle(parentShowsPreferencesHeading: Bool) -> Bool {
        !parentShowsPreferencesHeading
    }
}
