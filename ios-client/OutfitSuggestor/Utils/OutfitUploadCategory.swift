//
//  OutfitUploadCategory.swift
//  OutfitSuggestor
//
//  Upload slot resolution — keep in sync with frontend/src/utils/outfitItemThumbnail.ts
//

import Foundation

enum OutfitUploadCategory {
    private static let uploadTextMarkers = [
        "uploaded item",
        "from your upload",
        "your upload",
        "uploaded image",
    ]

    private static let uploadCategoryOrder = [
        "outerwear",
        "blazer",
        "shirt",
        "trouser",
        "shoes",
        "belt",
        "sweater",
        "tie",
    ]

    private static let outerwearCategoryPattern =
        "\\b(jacket|jackets|coat|coats|outerwear|parka|parkas|bomber|windbreaker|anorak|puffer|overcoat|trench|shacket|overshirt|corduroy|duffle|duffel|field jacket|harrington|denim jacket|leather jacket|quilted|padded|insulated|fleece)\\b"

    private static let dressShirtOnlyPattern =
        "\\b(dress shirt|oxford shirt|button[- ]down shirt|formal shirt)\\b"

    static func textSuggestsOuterwear(_ text: String?) -> Bool {
        guard let trimmed = text?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else {
            return false
        }
        let lower = trimmed.lowercased()
        if uploadTextMarkers.contains(where: { lower.contains($0) }) {
            return true
        }
        guard lower.range(of: outerwearCategoryPattern, options: .regularExpression) != nil else {
            return false
        }
        if lower.range(of: dressShirtOnlyPattern, options: .regularExpression) != nil {
            return false
        }
        return true
    }

    private static func inferUploadCategoryFromMisSlottedText(suggestion: OutfitSuggestion) -> String? {
        let slot = OutfitItemCardSourceTag.normalizedUploadCategory(from: suggestion.upload_matched_category)
            ?? OutfitItemCardSourceTag.normalizedUploadCategory(from: suggestion.source_slot)
        if slot == "shirt", textSuggestsOuterwear(suggestion.shirt) {
            return "outerwear"
        }
        if slot == "blazer", textSuggestsOuterwear(suggestion.blazer) {
            return "outerwear"
        }
        return nil
    }

    static func inferOutfitSlot(fromWardrobeCategory raw: String?) -> String? {
        if let direct = OutfitItemCardSourceTag.normalizedUploadCategory(from: raw) {
            return direct
        }
        guard let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else {
            return nil
        }
        let lower = trimmed.lowercased()
        if lower.range(of: outerwearCategoryPattern, options: .regularExpression) != nil {
            return "outerwear"
        }
        return nil
    }

    static func resolvedUploadCategory(
        suggestion: OutfitSuggestion,
        sourceWardrobeCategory: String? = nil
    ) -> String? {
        if let fromLiveSource = inferOutfitSlot(fromWardrobeCategory: sourceWardrobeCategory) {
            return fromLiveSource
        }

        if let fromText = findUploadAnchoredCategory(suggestion: suggestion) {
            return fromText
        }

        // Only trust source_wardrobe_item_id when user started from a wardrobe item (live category).
        if sourceWardrobeCategory != nil,
           let fromSourceItem = resolveSourceWardrobeUploadCategory(suggestion: suggestion) {
            return fromSourceItem
        }

        if let fromMisSlottedText = inferUploadCategoryFromMisSlottedText(suggestion: suggestion) {
            return fromMisSlottedText
        }

        return nil
    }

    /// Normalize API response when wardrobe evidence says jacket but metadata pins shirt/blazer.
    static func normalizeSuggestion(
        _ suggestion: OutfitSuggestion,
        sourceWardrobeCategory: String?
    ) -> OutfitSuggestion {
        var updated = OutfitItemCardSourceTag.applyingSourceWardrobeUploadCategory(
            to: suggestion,
            sourceCategory: sourceWardrobeCategory
        )

        let resolved = resolvedUploadCategory(
            suggestion: updated,
            sourceWardrobeCategory: sourceWardrobeCategory
        )
        guard resolved == "outerwear" else { return updated }

        updated.upload_matched_category = "outerwear"
        updated.source_slot = "outerwear"

        let sourceId = updated.source_wardrobe_item_id ?? updated.outerwear_id
        if let sourceId {
            if updated.shirt_id == sourceId { updated.shirt_id = nil }
            if updated.trouser_id == sourceId { updated.trouser_id = nil }
            if updated.blazer_id == sourceId { updated.blazer_id = nil }
            if updated.shoes_id == sourceId { updated.shoes_id = nil }
            if updated.belt_id == sourceId { updated.belt_id = nil }
            if updated.outerwear_id == nil { updated.outerwear_id = sourceId }
        }

        let existing = updated.outerwear?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if existing.isEmpty || ["null", "none", "n/a"].contains(existing.lowercased()) {
            if let itemId = sourceId,
               let item = findMatchingWardrobeItemById(suggestion: updated, itemId: itemId),
               let description = item.description?.trimmingCharacters(in: .whitespacesAndNewlines),
               !description.isEmpty {
                updated.outerwear = description
            } else {
                let label = (sourceWardrobeCategory ?? "").lowercased().contains("coat") ? "coat" : "jacket"
                updated.outerwear = "Your wardrobe \(label) (uploaded item)"
            }
        }

        return updated
    }

    private static func findUploadAnchoredCategory(suggestion: OutfitSuggestion) -> String? {
        for category in uploadCategoryOrder {
            let text: String?
            switch category {
            case "outerwear": text = suggestion.outerwear
            case "blazer": text = suggestion.blazer
            case "shirt": text = suggestion.shirt
            case "trouser": text = suggestion.trouser
            case "shoes": text = suggestion.shoes
            case "belt": text = suggestion.belt
            case "sweater": text = suggestion.sweater
            case "tie": text = suggestion.tie
            default: text = nil
            }
            guard let value = text else { continue }
            let lower = value.lowercased()
            if uploadTextMarkers.contains(where: { lower.contains($0) }) {
                return category
            }
        }
        return nil
    }

    private static func resolveSourceWardrobeUploadCategory(suggestion: OutfitSuggestion) -> String? {
        guard let itemId = suggestion.source_wardrobe_item_id else { return nil }

        if let wardrobeItem = findMatchingWardrobeItemById(suggestion: suggestion, itemId: itemId),
           let fromCategory = inferOutfitSlot(fromWardrobeCategory: wardrobeItem.category) {
            return fromCategory
        }

        let slotIds: [(String, Int?)] = [
            ("shirt", suggestion.shirt_id),
            ("trouser", suggestion.trouser_id),
            ("blazer", suggestion.blazer_id),
            ("shoes", suggestion.shoes_id),
            ("belt", suggestion.belt_id),
            ("sweater", suggestion.sweater_id),
            ("outerwear", suggestion.outerwear_id),
            ("tie", suggestion.tie_id),
        ]

        for (slot, slotId) in slotIds where slotId == itemId {
            if let wardrobeItem = findMatchingWardrobeItemById(suggestion: suggestion, itemId: itemId),
               let inferred = inferOutfitSlot(fromWardrobeCategory: wardrobeItem.category),
               inferred != slot {
                return inferred
            }
            return slot
        }

        return nil
    }

    private static func findMatchingWardrobeItemById(
        suggestion: OutfitSuggestion,
        itemId: Int
    ) -> MatchingWardrobeItem? {
        guard let groups = suggestion.matching_wardrobe_items else { return nil }
        let allLists = [
            groups.shirt,
            groups.trouser,
            groups.blazer,
            groups.shoes,
            groups.belt,
            groups.sweater,
            groups.outerwear,
            groups.tie,
        ]
        for list in allLists {
            if let match = list?.first(where: { $0.id == itemId }) {
                return match
            }
        }
        return nil
    }
}
