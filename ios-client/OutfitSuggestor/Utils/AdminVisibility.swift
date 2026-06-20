//
//  AdminVisibility.swift
//  OutfitSuggestor
//
//  Pure helpers for admin-only UI gating (testable, defense in depth).
//

import Foundation

enum AdminVisibility {
    static func isAdmin(user: User?) -> Bool {
        user?.is_admin == true
    }

    static func shouldShowSettingsAdminSection(for user: User?) -> Bool {
        isAdmin(user: user)
    }

    /// Combines admin role with user toggle — never show prompt/response panels to non-admins.
    static func effectiveShowAiPromptResponse(isAdmin: Bool, toggleEnabled: Bool) -> Bool {
        isAdmin && toggleEnabled
    }

    static func guideIncludesModelImagesSection(isAdmin: Bool) -> Bool {
        isAdmin
    }

    static func guideIncludesReportsNavRow(isAdmin: Bool) -> Bool {
        isAdmin
    }

    static func aboutIncludesAdminDiagnostics(isAdmin: Bool) -> Bool {
        isAdmin
    }
}

enum GuideCopy {
    static let wardrobeSingleItemStep =
        "Tap Style this item with AI on any card to open Suggest with that piece loaded—set preferences and tap Generate Outfit."
    static let wardrobeMultiSelectStep =
        "Tap Select items, choose 1 to 5 pieces with one item per outfit slot (shirt, trousers, blazer, shoes, belt), expand Preferences to set occasion, season, style, and notes, then tap Complete outfit with AI."
    static let wardrobeMultiSelectTip =
        "Preferences on Wardrobe stay in sync with Suggest and Insights. Only one item per slot—picking a second shirt shows Choose one item per outfit slot. Multi-select keeps your chosen pieces and AI fills missing slots."
    static let wardrobeOnlyModeStep =
        "On Suggest or in Wardrobe completion Preferences, enable Use my wardrobe only so the AI recommends only items from your saved wardrobe."
    static let adminShowAiPromptTip =
        "Toggle Show AI prompt & response in Advanced options to peek at technical details on outfit suggestions."
    static let adminDiagnosticsTip =
        "Premium analysis runs can include mode used, cost, full AI prompt, and full AI response in Admin diagnostics."
    static let reportsNavDescription = "Admins only—usage and access insights."
}

enum AboutCopy {
    static let generalTechStack =
        "Built with React (web), SwiftUI (iOS), FastAPI, OpenAI GPT-4 Vision, and more."
    static let wardrobeCompletionFeature =
        "• Complete outfits from selected wardrobe pieces—set occasion, season, style, and notes inline on Wardrobe before tapping Complete outfit with AI (one item per slot)."
    static let adminDiagnosticsSuffix = " Includes transparent admin diagnostics for administrators."

    static func techStackDescription(isAdmin: Bool) -> String {
        isAdmin ? generalTechStack + adminDiagnosticsSuffix : generalTechStack
    }
}
