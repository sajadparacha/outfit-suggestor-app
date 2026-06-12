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
        default: list = nil
        }
        return list?.first
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
        uploadImage: UIImage?
    ) -> UIImage? {
        let uploadCategory = OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion)
        if uploadImage != nil, category == uploadCategory {
            return uploadImage
        }
        return wardrobeUIImage(from: resolveMatchingItem(suggestion: suggestion, category: category))
    }
}
