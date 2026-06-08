//
//  InsightsCopy.swift
//  OutfitSuggestor
//
//  User-facing Insights labels shared across views.
//  Mirrors frontend/src/utils/insightsCopy.ts — keep in sync with spec mapping.
//

import Foundation

enum InsightsCopy {
    // MARK: - Primary labels

    static let pageTitle = "What's Missing From My Wardrobe?"
    static let shoppingSectionTitle = "What to Buy Next"

    // MARK: - Analysis mode names (full)

    static let quickCheckModeTitle = "Quick Wardrobe Check"
    static let aiStylistModeTitle = "AI Stylist Review"

    // MARK: - Segmented control (short)

    static let quickCheckSegmentLabel = "Quick Check"
    static let aiStylistSegmentLabel = "AI Stylist"

    // MARK: - Mode picker

    static let modePickerTitle = "How would you like to check your wardrobe?"
    static let modePickerSubtitle = "Pick the level of detail you want from your stylist."

    // MARK: - Mode subtitles

    static let quickCheckModeSubtitle = "Fast snapshot with practical buy-next guidance."
    static let aiStylistModeSubtitle = "Deeper styling advice tailored to your occasion and wardrobe."

    // MARK: - Loading

    static let quickCheckLoadingMessage = "Running your Quick Wardrobe Check..."
    static let aiStylistLoadingMessage = "Preparing your AI Stylist Review..."

    // MARK: - Ready toast (web parity)

    static let aiStylistReadyToast = "Your AI Stylist Review is ready. ✅"

    // MARK: - Stat cards

    static let categoriesCheckedLabel = "Categories checked"
    static let colorsToAddLabel = "Colors to add"
    static let stylesToTryLabel = "Styles to try"
    static let bestCategoryToShopNextLabel = "Best category to shop next"

    // MARK: - Empty state

    static let emptyStateMessage = "Run a check to see what's missing in each part of your wardrobe."

    // MARK: - Review type

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
