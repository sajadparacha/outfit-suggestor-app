//
//  OutfitOptionalLayers.swift
//  OutfitSuggestor
//
//  Optional sweater / outerwear / tie on main-flow result — keep in sync with docs/main-flow-ux-contract.md
//

import Foundation

struct OutfitOptionalLayerItem: Equatable {
    let category: String
    let label: String
    let description: String
}

enum OutfitOptionalLayers {
    static func hasOptionalLayers(_ suggestion: OutfitSuggestion) -> Bool {
        !items(for: suggestion).isEmpty
    }

    static func hasOptionalLayers(
        _ suggestion: OutfitSuggestion,
        allowedCategories: [String]? = nil
    ) -> Bool {
        !items(for: suggestion, allowedCategories: allowedCategories).isEmpty
    }

    static func items(for suggestion: OutfitSuggestion) -> [OutfitOptionalLayerItem] {
        items(for: suggestion, allowedCategories: nil)
    }

    static func items(
        for suggestion: OutfitSuggestion,
        allowedCategories: [String]? = nil
    ) -> [OutfitOptionalLayerItem] {
        let allowed = Set(allowedCategories ?? ["sweater", "outerwear", "tie"])
        var result: [OutfitOptionalLayerItem] = []
        if allowed.contains("sweater"), let sweater = normalizedOptionalText(suggestion.sweater) {
            result.append(
                OutfitOptionalLayerItem(
                    category: "sweater",
                    label: MainFlowUxCopy.layerLabel,
                    description: sweater
                )
            )
        }
        if allowed.contains("outerwear"), let outerwear = normalizedOptionalText(suggestion.outerwear) {
            result.append(
                OutfitOptionalLayerItem(
                    category: "outerwear",
                    label: MainFlowUxCopy.outerwearLabel,
                    description: outerwear
                )
            )
        }
        if allowed.contains("tie"), let tie = normalizedOptionalText(suggestion.tie) {
            result.append(
                OutfitOptionalLayerItem(
                    category: "tie",
                    label: MainFlowUxCopy.tieLabel,
                    description: tie
                )
            )
        }
        return result
    }

    private static func normalizedOptionalText(_ value: String?) -> String? {
        guard let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else {
            return nil
        }
        return trimmed
    }
}
