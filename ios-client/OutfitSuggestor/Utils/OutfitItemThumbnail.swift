//
//  OutfitItemThumbnail.swift
//  OutfitSuggestor
//
//  Keep in sync with frontend/src/utils/outfitItemThumbnail.ts
//

import Foundation
import UIKit

enum OutfitItemThumbnail {
    static func resolveMatchingItem(
        suggestion: OutfitSuggestion,
        category: String
    ) -> MatchingWardrobeItem? {
        let list: [MatchingWardrobeItem]?
        switch category {
        case "shirt": list = suggestion.matching_wardrobe_items?.shirt
        case "trouser": list = suggestion.matching_wardrobe_items?.trouser
        case "blazer": list = suggestion.matching_wardrobe_items?.blazer
        case "shoes": list = suggestion.matching_wardrobe_items?.shoes
        case "belt": list = suggestion.matching_wardrobe_items?.belt
        case "sweater": list = suggestion.matching_wardrobe_items?.sweater
        case "outerwear": list = suggestion.matching_wardrobe_items?.outerwear
        case "tie": list = suggestion.matching_wardrobe_items?.tie
        default: list = nil
        }
        let selectedId = selectedWardrobeId(for: category, suggestion: suggestion)

        if let matches = list, !matches.isEmpty {
            if let selectedId {
                if let byId = matches.first(where: { $0.id == selectedId }) {
                    return byId
                }
                if category == "outerwear" {
                    if let crossBucket = findMatchingWardrobeItemById(
                        suggestion: suggestion,
                        itemId: selectedId
                    ) {
                        return crossBucket
                    }
                }
            }
            return matches.first
        }

        if category == "outerwear", let selectedId {
            return findMatchingWardrobeItemById(suggestion: suggestion, itemId: selectedId)
        }

        return nil
    }

    private static func findMatchingWardrobeItemById(
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

    private static func selectedWardrobeId(
        for category: String,
        suggestion: OutfitSuggestion
    ) -> Int? {
        switch category {
        case "shirt": return suggestion.shirt_id
        case "trouser": return suggestion.trouser_id
        case "blazer": return suggestion.blazer_id
        case "shoes": return suggestion.shoes_id
        case "belt": return suggestion.belt_id
        case "sweater": return suggestion.sweater_id
        case "outerwear": return suggestion.outerwear_id
        case "tie": return suggestion.tie_id
        default: return nil
        }
    }

    static func wardrobeUIImage(from item: MatchingWardrobeItem?) -> UIImage? {
        guard let b64 = item?.image_data else { return nil }
        let cleaned = b64.replacingOccurrences(of: "\\s", with: "", options: .regularExpression)
        guard let data = Data(base64Encoded: cleaned) else { return nil }
        return UIImage(data: data)
    }

    static func thumbnailImage(
        suggestion: OutfitSuggestion,
        category: String,
        uploadImage: UIImage?,
        sourceWardrobeCategory: String? = nil
    ) -> UIImage? {
        let uploadCategory = OutfitUploadCategory.resolvedUploadCategory(
            suggestion: suggestion,
            sourceWardrobeCategory: sourceWardrobeCategory
        )
        if uploadImage != nil, category == uploadCategory {
            return uploadImage
        }
        return wardrobeUIImage(from: resolveMatchingItem(suggestion: suggestion, category: category))
    }
}
