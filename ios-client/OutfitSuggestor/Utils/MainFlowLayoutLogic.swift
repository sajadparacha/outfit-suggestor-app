//
//  MainFlowLayoutLogic.swift
//  OutfitSuggestor
//
//  Creation vs compact result layout for Suggest main flow (testable).
//  Keep in sync with frontend/src/utils/mainFlowLayoutLogic.ts
//

import CoreGraphics
import Foundation

enum MainFlowLayoutLogic {
    /// Max content width for main flow (matches web `max-w-[980px]`).
    static let maxContentWidth: CGFloat = 980

    /// Gap between side-by-side columns (matches web `gap-5` / 20px).
    static let sideBySideColumnSpacing: CGFloat = 20

    /// True when viewport uses two-column side-by-side shell (regular horizontal size class).
    static func usesSideBySideColumns(isRegularHorizontalSizeClass: Bool) -> Bool {
        isRegularHorizontalSizeClass
    }

    /// True when sticky bottom result actions should appear (compact result, not guest-gated).
    static func showsStickyResultActions(
        showsCompactResultLayout: Bool,
        showsGuestLimitGate: Bool
    ) -> Bool {
        showsCompactResultLayout && !showsGuestLimitGate
    }

    /// True when wardrobe "Style this item" loaded an item but the user has not generated a new outfit yet.
    static func isWardrobeStylePending(
        sourceWardrobeItemId: Int?,
        hasSuggestion: Bool,
        highlightGenerateButton: Bool
    ) -> Bool {
        if highlightGenerateButton { return true }
        if sourceWardrobeItemId != nil, !hasSuggestion { return true }
        return false
    }

    /// When true, show compact summary + result column; when false, show full creation input with Generate Outfit.
    static func showsCompactResultLayout(
        hasSuggestion: Bool,
        sourceWardrobeItemId: Int?,
        highlightGenerateButton: Bool
    ) -> Bool {
        hasSuggestion && !isWardrobeStylePending(
            sourceWardrobeItemId: sourceWardrobeItemId,
            hasSuggestion: hasSuggestion,
            highlightGenerateButton: highlightGenerateButton
        )
    }
}
