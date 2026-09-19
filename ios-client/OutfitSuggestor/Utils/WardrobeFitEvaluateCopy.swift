//
//  WardrobeFitEvaluateCopy.swift
//  OutfitSuggestor
//
//  Shared copy for wardrobe fit evaluate (web/spec parity).
//

import Foundation

enum WardrobeFitEvaluateCopy {
    static let action = "How this fits"
    static let loading = "Checking how this works with your wardrobe…"
    static let sectionPairs = "Works with what you own"
    static let sectionGap = "Missing for your goal"
    static let emptyPairs = "Add items to see what this pairs with."
    static let error = "Couldn’t evaluate this piece. Try again."
    static let retry = "Try again"
    static let close = "Close"
    static let changeGoal = "Change goal"
    static let applyGoal = "Update evaluation"
    static let getOutfitWithItem = "Get outfit with this item"
    static let openInsights = "Open Insights"
    static let goalStripPrefix = "Goal"
    static let notesPlaceholder = "Optional notes (budget, fabrics…)"

    static func verdictLabel(_ verdict: WardrobeFitVerdict) -> String {
        switch verdict {
        case .strongFit: return "Strong fit"
        case .weakFit: return "Weak fit"
        case .redundant: return "Already covered"
        }
    }

    static func verdictLabel(rawValue: String) -> String {
        if let verdict = WardrobeFitVerdict(rawValue: rawValue) {
            return verdictLabel(verdict)
        }
        return rawValue
    }

    static let guideStep =
        "Tap How this fits on any item (sign in required) to see how many pieces it pairs with and what’s missing for your goal—defaults to smart casual, work + everyday, classic."
}