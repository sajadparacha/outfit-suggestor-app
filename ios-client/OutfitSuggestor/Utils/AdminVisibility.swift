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
    static let wardrobeCategoryFiltersStep =
        "Open the Wardrobe tab to browse shirts, trousers, blazers, shoes, and belts. When you own specific types—polo, T-shirt, jeans, shorts, sweater, jacket, tie, and more—extra filter chips appear so you can narrow the list quickly."
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
    static let wardrobeFilterFeature =
        "• Digital wardrobe with AI item recognition—filter by core slots (shirts, trousers, blazers, shoes, belts) plus specific types when you own them (polo, T-shirt, jeans, shorts, sweater, jacket, tie, and more). Outfit completion still uses the same five core slots."
    static let wardrobeCompletionFeature =
        "• Complete outfits from selected wardrobe pieces—set occasion, season, style, and notes inline on Wardrobe before tapping Complete outfit with AI (one item per slot)."
    static let wardrobeInsightsFeature =
        "• Wardrobe Insights — AI-powered gap analysis with a summary score, top priorities, coverage dashboard (including sweaters, jackets, and ties for formal occasions), and a market-ready shopping list with Buy, Look for, and Search online columns, per style/color Google Shopping searches, Copy list, and WhatsApp or PDF export. Outfit suggestions still use the same five core slots."
    static let outfitSuggestionsFeature =
        "• Outfit suggestions with occasion, season, and style filters. Results show five core pieces; the AI may also suggest optional layering (sweater, coat/jacket, or tie) when relevant."
    static let weekPlannerFeature =
        "• Week Outfit Planner — enable days, set occasion and style per day (season is shared), toggle Use wardrobe, generate outfits, and expand a day for slot details and Why this works. On iOS, daily wake-up reminders use local notifications; on web, Today is shown in-app only."
    static let adminDiagnosticsSuffix = " Includes transparent admin diagnostics for administrators."

    static func techStackDescription(isAdmin: Bool) -> String {
        isAdmin ? generalTechStack + adminDiagnosticsSuffix : generalTechStack
    }
}
