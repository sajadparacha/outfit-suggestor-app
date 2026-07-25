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

    struct LayerContext {
        var season: String? = nil
        var occasion: String? = nil
        var style: String? = nil
    }

    static func isWarmSeason(_ season: String?) -> Bool {
        let s = (season ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return s == "summer" || s == "warm"
    }

    static func prefersBlazerOverJacket(occasion: String?, style: String?) -> Bool {
        let occ = (occasion ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: "_", with: "-")
        let sty = (style ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let blazerOccasions: Set<String> = [
            "work", "business", "formal", "office", "interview",
            "wedding", "wedding-guest", "date-night", "everyday",
        ]
        if blazerOccasions.contains(occ) { return true }
        if ["classic", "elegant", "formal", "business"].contains(sty) { return true }
        return false
    }

    static func shouldShowBlazerCard(suggestion: OutfitSuggestion) -> Bool {
        if shouldShowAnchoredOuterwearInCoreGrid(suggestion: suggestion) {
            return false
        }
        if OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion) == "outerwear" {
            return false
        }
        return !isBlazerPlaceholder(suggestion.blazer)
    }

    static func resolveOuterwearDisplayText(
        suggestion: OutfitSuggestion,
        context: LayerContext = LayerContext()
    ) -> String? {
        let anchor = OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion)
        if isWarmSeason(context.season), anchor != "outerwear" {
            return nil
        }
        if let outerwear = suggestion.outerwear?.trimmingCharacters(in: .whitespacesAndNewlines),
           !outerwear.isEmpty {
            let lower = outerwear.lowercased()
            if lower != "null" && lower != "none" && lower != "n/a" {
                if !isBlazerPlaceholder(suggestion.blazer) {
                    if prefersBlazerOverJacket(occasion: context.occasion, style: context.style) {
                        return nil
                    }
                    if anchor != "outerwear" {
                        return nil
                    }
                }
                return outerwear
            }
        }
        if anchor == "outerwear" {
            return "Your wardrobe jacket (uploaded item)"
        }
        return nil
    }

    static func shouldShowAnchoredOuterwearInCoreGrid(suggestion: OutfitSuggestion) -> Bool {
        OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion) == "outerwear"
            && resolveOuterwearDisplayText(suggestion: suggestion) != nil
    }

    static func optionalLayerCategories(
        for suggestion: OutfitSuggestion,
        context: LayerContext = LayerContext()
    ) -> [String] {
        let anchor = OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion)
        let all = ["sweater", "outerwear", "tie"]
        switch anchor {
        case "blazer":
            return ["tie"]
        case "outerwear":
            return ["tie"]
        default:
            if isWarmSeason(context.season) || shouldShowBlazerCard(suggestion: suggestion) {
                return all.filter { $0 != "outerwear" }
            }
            return all
        }
    }

    static func hasVisibleOptionalLayers(
        _ suggestion: OutfitSuggestion,
        context: LayerContext = LayerContext()
    ) -> Bool {
        !OutfitOptionalLayers.items(
            for: suggestion,
            allowedCategories: optionalLayerCategories(for: suggestion, context: context)
        ).isEmpty
    }

    private static func isBlazerPlaceholder(_ text: String) -> Bool {
        let lower = text.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if lower.isEmpty || lower == "null" || lower == "n/a" || lower == "none" {
            return true
        }
        if lower.hasPrefix("consider adding") { return true }
        return blazerPlaceholderPhrases.contains { lower.contains($0) }
    }
}
