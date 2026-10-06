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
    static let checkBeforeBuyAction = "Check before you buy"
    static let checkBeforeBuyLoading = "Checking how this would fit your wardrobe…"
    static let addToWardrobe = "Add to wardrobe"

    static let viewFullImage = "View full image"

    static func viewFullImageLabel(itemLabel: String) -> String {
        "View full image of \(itemLabel)"
    }

    static let showLess = "Show less"

    static func viewAll(_ count: Int) -> String {
        "View all (\(count))"
    }

    static func pairsWithLabel(count: Int) -> String {
        "Pairs with \(count)"
    }

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
        "Tap How this fits on a saved piece (sign in required) to see a Strong fit, Weak fit, or Already covered verdict, how many of your items it pairs with, and what’s missing for your goal. The goal starts from your last fit check, then your Insights preferences, otherwise smart-casual, work + everyday, classic. Matches are ranked by AI when available. Tap a photo to view it full screen. Under Works with what you own, each category shows the first three matches; tap View all (N) to see the rest, or Show less to collapse."

    static let checkBeforeBuyGuideStep =
        "On the main screen, once a photo is added, Check before you buy appears under Generate Outfit (sign in required). Tap it to see what that piece pairs with and what’s missing. It’s not saved unless you tap Add to wardrobe. The result works the same way as How this fits, including full-screen photos and View all (N)."

    static let aboutFitFeature =
        "• How this fits — tap any wardrobe item to see a Strong fit, Weak fit, or Already covered verdict, how many pieces it pairs with, and what’s still missing for your goal."

    static let aboutCheckBeforeBuyFeature =
        "• Check before you buy — upload a piece you’re considering to see what it pairs with in your wardrobe and what’s missing, without saving it."
}