//
//  OutfitLayerExclusivity.swift
//  OutfitSuggestor
//
//  Jacket vs blazer mutual exclusivity — keep in sync with frontend outfitLayerExclusivity.ts
//

import Foundation

enum OutfitLayerExclusivity {
    private static let blazerPlaceholderPhrases = [
        "no structured blazer",
        "outfit built around your outerwear",
    ]

    static func shouldShowBlazerCard(suggestion: OutfitSuggestion) -> Bool {
        if shouldShowAnchoredOuterwearInCoreGrid(suggestion: suggestion) {
            return false
        }
        if OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion) == "outerwear" {
            return false
        }
        return !isBlazerPlaceholder(suggestion.blazer)
    }

    static func resolveOuterwearDisplayText(suggestion: OutfitSuggestion) -> String? {
        if let outerwear = suggestion.outerwear?.trimmingCharacters(in: .whitespacesAndNewlines), !outerwear.isEmpty {
            let lower = outerwear.lowercased()
            if lower != "null" && lower != "none" && lower != "n/a" {
                return outerwear
            }
        }
        if OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion) == "outerwear" {
            return "Your wardrobe jacket (uploaded item)"
        }
        return nil
    }

    static func shouldShowAnchoredOuterwearInCoreGrid(suggestion: OutfitSuggestion) -> Bool {
        OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion) == "outerwear"
            && resolveOuterwearDisplayText(suggestion: suggestion) != nil
    }

    static func optionalLayerCategories(for suggestion: OutfitSuggestion) -> [String] {
        let anchor = OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion)
        let all = ["sweater", "outerwear", "tie"]
        switch anchor {
        case "blazer":
            return ["tie"]
        case "outerwear":
            return ["tie"]
        default:
            return all
        }
    }

    static func hasVisibleOptionalLayers(_ suggestion: OutfitSuggestion) -> Bool {
        !OutfitOptionalLayers.items(for: suggestion, allowedCategories: optionalLayerCategories(for: suggestion)).isEmpty
    }

    private static func isBlazerPlaceholder(_ text: String) -> Bool {
        let lower = text.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if lower.isEmpty || lower == "null" || lower == "n/a" || lower == "none" {
            return true
        }
        return blazerPlaceholderPhrases.contains { lower.contains($0) }
    }
}
