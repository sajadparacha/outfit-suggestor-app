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
        sourceWardrobeCategory: String? = nil,
        context: LayerContext = LayerContext()
    ) -> String? {
        let anchor = OutfitItemCardSourceTag.resolvedUploadCategory(
            suggestion: suggestion,
            sourceWardrobeCategory: sourceWardrobeCategory
        )
        if isWarmSeason(context.season), anchor != "outerwear" {
            return nil
        }
        // Keep a real description stored alongside a legacy marker
        // ("From your upload — navy bomber jacket" → "navy bomber jacket").
        if let cleanedOuterwear = OutfitUploadCategory.cleanUploadMarkerText(suggestion.outerwear) {
            if !isBlazerPlaceholder(suggestion.blazer) {
                if prefersBlazerOverJacket(occasion: context.occasion, style: context.style) {
                    return nil
                }
                if anchor != "outerwear" {
                    return nil
                }
            }
            return cleanedOuterwear
        }
        if anchor == "outerwear" {
            // Standalone photo upload with no wardrobe match still renders a card.
            return uploadOuterwearText(
                suggestion: suggestion,
                sourceWardrobeCategory: sourceWardrobeCategory
            )
        }
        return nil
    }

    /// Best copy for an uploaded jacket/coat — never an "(uploaded item)" placeholder.
    /// Mirrors backend `OutfitController._outerwear_upload_text`.
    static func uploadOuterwearText(
        suggestion: OutfitSuggestion,
        sourceWardrobeCategory: String? = nil
    ) -> String {
        let items = uploadOuterwearWardrobeItems(suggestion: suggestion)
        let label = uploadOuterwearLabel(
            sourceWardrobeCategory: sourceWardrobeCategory,
            items: items
        )
        for item in items {
            if let description = cleanedCopy(item.description) {
                return description
            }
        }
        for item in items {
            if let color = cleanedCopy(item.color) {
                return "Your wardrobe \(label) — \(color)"
            }
        }
        return "The \(label) in your photo"
    }

    private static func uploadOuterwearLabel(
        sourceWardrobeCategory: String?,
        items: [MatchingWardrobeItem]
    ) -> String {
        let normalized = (sourceWardrobeCategory ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
        if !normalized.isEmpty {
            return normalized.contains("coat") ? "coat" : "jacket"
        }
        if items.contains(where: { isCoatCategory($0.category) }) {
            return "coat"
        }
        return "jacket"
    }

    private static func isCoatCategory(_ raw: String?) -> Bool {
        let normalized = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return normalized.contains("coat")
    }

    /// Priority: the pinned source item, then the selected outerwear item, then the
    /// first outerwear wardrobe match (which drives the card thumbnail).
    private static func uploadOuterwearWardrobeItems(
        suggestion: OutfitSuggestion
    ) -> [MatchingWardrobeItem] {
        var items: [MatchingWardrobeItem] = []
        var seenIds = Set<Int>()
        let pinnedIds = [suggestion.source_wardrobe_item_id, suggestion.outerwear_id]
        for id in pinnedIds {
            guard let id, !seenIds.contains(id) else { continue }
            if let item = findMatchingWardrobeItem(suggestion: suggestion, itemId: id) {
                items.append(item)
                seenIds.insert(item.id)
            }
        }
        if let firstMatch = suggestion.matching_wardrobe_items?.outerwear?.first,
           !seenIds.contains(firstMatch.id) {
            items.append(firstMatch)
        }
        return items
    }

    private static func findMatchingWardrobeItem(
        suggestion: OutfitSuggestion,
        itemId: Int
    ) -> MatchingWardrobeItem? {
        guard let groups = suggestion.matching_wardrobe_items else { return nil }
        let buckets: [[MatchingWardrobeItem]?] = [
            groups.shirt,
            groups.trouser,
            groups.blazer,
            groups.shoes,
            groups.belt,
            groups.sweater,
            groups.outerwear,
            groups.tie,
        ]
        for bucket in buckets {
            if let match = bucket?.first(where: { $0.id == itemId }) {
                return match
            }
        }
        return nil
    }

    private static func cleanedCopy(_ raw: String?) -> String? {
        guard let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines),
              !trimmed.isEmpty else {
            return nil
        }
        if ["null", "none", "n/a"].contains(trimmed.lowercased()) {
            return nil
        }
        return trimmed
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
