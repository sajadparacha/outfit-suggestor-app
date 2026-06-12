//
//  MainFlowLayoutLogic.swift
//  OutfitSuggestor
//
//  Creation vs compact result layout for Suggest main flow (testable).
//

import Foundation

enum MainFlowLayoutLogic {
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
