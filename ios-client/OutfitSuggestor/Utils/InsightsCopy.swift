//
//  InsightsCopy.swift
//  OutfitSuggestor
//
//  User-facing Insights labels shared across views.
//  Mirrors web insights section copy — keep in sync with spec.
//

import Foundation

enum InsightsCopy {
    // MARK: - Header

    static let pageTitle = "Wardrobe Insights"
    static let pageSubtitle = "AI-powered analysis of your wardrobe to help you dress better."
    static let newAnalysisButton = "New Analysis"
    static let analyzeButton = "Analyze My Wardrobe"

    // MARK: - Context bar

    static let analyzedForLabel = "Analyzed for"
    static let changePreferencesButton = "Change preferences"
    static let sharedPreferencesNote =
        "Shared with Suggest — occasion, season, style, and notes stay in sync across outfit suggestions and wardrobe insights."

    // MARK: - Summary card

    static let topPrioritiesTitle = "Top priorities"

    // MARK: - Top missing items

    static let topItemsTitle = "Top items to add"
    static let topItemsSubtitle = "High impact pieces that will level up your wardrobe."
    static let shopSimilarButton = "Shop similar"
    static let bestColorsLabel = "Best colors"
    static let worksWithLabel = "Styles To Try"

    // MARK: - Shopping list

    static let shoppingListButton = "Shopping list"
    static let shoppingListTitle = "Shopping list"
    static let shoppingListBuyColumn = "Buy"
    static let shoppingListLookForColumn = "Look for"
    static let shoppingListSearchOnlineColumn = "Search online"
    static let shoppingListSearchAllButton = "Search all"
    static let copyListButton = "Copy list"
    static let seeAllOptionsButton = "See all options"
    static let hideOptionsButton = "Hide options"
    static let copiedToClipboardMessage = "Copied to clipboard"
    static let exportToWhatsAppButton = "Export to WhatsApp"
    static let exportAsPDFButton = "Export as PDF"
    static let shoppingListEmptyMessage = "No shopping list items for this analysis."
    static let shoppingListExportErrorMessage = "Could not export shopping list."

    // MARK: - Coverage dashboard

    static let coverageTitle = "Wardrobe coverage"
    static let coverageSubtitle = "How your wardrobe looks across essential categories."

    // MARK: - Category details

    static let categoryDetailsTitle = "Detailed category analysis"
    static let categoryDetailsSubtitle = "Tap a category to see details and recommendations."
    static let recommendedNextStepLabel = "Recommended next step"
    static let ownedColorsLabel = "Owned colors"
    static let missingColorsLabel = "Missing colors"
    static let ownedStylesLabel = "Owned styles"
    static let missingStylesLabel = "Missing styles"
    static let noOwnedColorsMessage = "No colors detected yet."
    static let noMissingColorsMessage = "You already have enough core colors in this category."
    static let noOwnedStylesMessage = "No style keywords detected yet."
    static let noMissingStylesMessage = "Your style coverage looks balanced for this category."

    // MARK: - Quick tip

    static let quickTipText =
        "Focus on versatile, neutral pieces. They will work with most of your existing clothes and help you create more outfits with fewer items."
    static let viewStyleGuideButton = "View style guide"

    // MARK: - Analysis mode

    static let modePickerTitle = "How would you like to check your wardrobe?"
    static let modePickerSubtitle = "Pick the level of detail you want from your stylist."
    static let quickCheckSegmentLabel = "Quick Check"
    static let aiStylistSegmentLabel = "AI Stylist"
    static let quickCheckModeTitle = "Quick Wardrobe Check"
    static let aiStylistModeTitle = "AI Stylist Review"
    static let quickCheckModeSubtitle = "Fast snapshot with practical buy-next guidance."
    static let aiStylistModeSubtitle = "Deeper styling advice tailored to your occasion and wardrobe."

    // MARK: - Loading

    static let quickCheckLoadingMessage = "Running your Quick Wardrobe Check..."
    static let aiStylistLoadingMessage = "Preparing your AI Stylist Review..."
    static let aiStylistReadyToast = "Your AI Stylist Review is ready. ✅"

    // MARK: - Empty / error

    static let emptyStateMessage = "Run a check to see what's missing in each part of your wardrobe."
    static let genericErrorMessage = "We couldn't complete your wardrobe analysis. Please try again."

    // MARK: - Admin

    static let adminDiagnosticsTitle = "Admin diagnostics"
    static let adminDiagnosticsSubtitle =
        "Prompt, response, and cost details appear for Premium analysis runs. Basic analysis shows placeholders below."
    static let analysisCostTitle = "Analysis Cost"
    static let inputPromptTitle = "Input Prompt"
    static let aiResponseTitle = "AI Response"
    static let adminUnavailablePlaceholder =
        "Unavailable for this run (likely Basic analysis or premium fallback)."

    // MARK: - Legacy (tests / backward refs)

    static let shoppingSectionTitle = "What to Buy Next"
    static let categoriesCheckedLabel = "Categories checked"
    static let colorsToAddLabel = "Colors to add"
    static let stylesToTryLabel = "Styles to try"
    static let bestCategoryToShopNextLabel = "Best category to shop next"
    static let reviewTypePrefix = "Review type:"

    static func reviewTypeLabel(forAnalysisMode mode: String) -> String {
        mode == "premium" ? aiStylistModeTitle : quickCheckModeTitle
    }

    static func reviewTypeDisplay(forAnalysisMode mode: String) -> String {
        "\(reviewTypePrefix) \(reviewTypeLabel(forAnalysisMode: mode))"
    }

    static func reviewTypeDisplay(forAnalysisDepth depth: String) -> String {
        let normalized = depth.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if normalized == "premium" {
            return "\(reviewTypePrefix) \(aiStylistModeTitle)"
        }
        return "\(reviewTypePrefix) \(quickCheckModeTitle)"
    }

    static func loadingMessage(forAnalysisMode mode: String) -> String {
        mode == "premium" ? aiStylistLoadingMessage : quickCheckLoadingMessage
    }
}
