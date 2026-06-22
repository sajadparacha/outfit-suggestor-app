//
//  WardrobeCategoryDisplay.swift
//  OutfitSuggestor
//
//  Wardrobe list filter chips and category badge labels (parity with web wardrobeCategory.ts).
//

import Foundation

enum WardrobeCategoryFilterChipKind {
    case core
    case extended
}

struct WardrobeCategoryFilterChip: Equatable {
    let key: String
    let label: String
    let kind: WardrobeCategoryFilterChipKind
}

enum WardrobeCategoryDisplay {
    static let coreFilterChips: [WardrobeCategoryFilterChip] = [
        WardrobeCategoryFilterChip(key: "shirt", label: "Shirt", kind: .core),
        WardrobeCategoryFilterChip(key: "trouser", label: "Trousers", kind: .core),
        WardrobeCategoryFilterChip(key: "blazer", label: "Blazer", kind: .core),
        WardrobeCategoryFilterChip(key: "shoes", label: "Shoes", kind: .core),
        WardrobeCategoryFilterChip(key: "belt", label: "Belt", kind: .core),
    ]

    static let extendedFilterChips: [WardrobeCategoryFilterChip] = [
        WardrobeCategoryFilterChip(key: "polo", label: "Polo", kind: .extended),
        WardrobeCategoryFilterChip(key: "t_shirt", label: "T-shirt", kind: .extended),
        WardrobeCategoryFilterChip(key: "jeans", label: "Jeans", kind: .extended),
        WardrobeCategoryFilterChip(key: "shorts", label: "Shorts", kind: .extended),
        WardrobeCategoryFilterChip(key: "sweater", label: "Sweater", kind: .extended),
        WardrobeCategoryFilterChip(key: "jacket", label: "Jacket", kind: .extended),
        WardrobeCategoryFilterChip(key: "tie", label: "Tie", kind: .extended),
        WardrobeCategoryFilterChip(key: "other", label: "Other", kind: .extended),
    ]

    private static let coreGroupMatchers: [String: [String]] = [
        "shirt": ["shirt", "t_shirt", "t-shirt", "polo", "tshirt", "tee"],
        "trouser": ["trouser", "trousers", "pants", "jeans", "shorts"],
        "blazer": ["blazer", "blazers", "suit"],
        "shoes": ["shoe", "shoes"],
        "belt": ["belt", "belts"],
    ]

    private static let extendedMatchers: [String: [String]] = [
        "polo": ["polo"],
        "t_shirt": ["t_shirt", "t-shirt", "tshirt"],
        "jeans": ["jeans"],
        "shorts": ["shorts"],
        "sweater": ["sweater", "sweaters"],
        "jacket": ["jacket", "jackets"],
        "tie": ["tie", "ties"],
    ]

    private static let categoryBadgeLabels: [String: String] = [
        "shirt": "Shirt",
        "polo": "Polo",
        "t_shirt": "T-shirt",
        "t-shirt": "T-shirt",
        "tshirt": "T-shirt",
        "trouser": "Trousers",
        "trousers": "Trousers",
        "pants": "Trousers",
        "jeans": "Jeans",
        "shorts": "Shorts",
        "blazer": "Blazer",
        "jacket": "Jacket",
        "jackets": "Jacket",
        "shoes": "Shoes",
        "shoe": "Shoes",
        "belt": "Belt",
        "belts": "Belt",
        "sweater": "Sweater",
        "sweaters": "Sweater",
        "tie": "Tie",
        "ties": "Tie",
    ]

    private static let allCoreMatchValues: Set<String> = Set(coreGroupMatchers.values.flatMap { $0 })
    private static let allExtendedMatchValues: Set<String> = Set(extendedMatchers.values.flatMap { $0 })

    static let allFilterChipKeys: [String] = coreFilterChips.map(\.key) + extendedFilterChips.map(\.key)

    static func normalizeCategory(_ category: String) -> String {
        category.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    static func wardrobeCategoryLabel(_ category: String) -> String {
        let normalized = normalizeCategory(category)
        if let label = categoryBadgeLabels[normalized] {
            return label
        }
        if isOtherCategory(category) {
            return "Other"
        }
        return prettyLabel(category)
    }

    static func filterChipLabel(for key: String) -> String {
        if key == "All" {
            return "All"
        }
        if let chip = coreFilterChips.first(where: { $0.key == key })
            ?? extendedFilterChips.first(where: { $0.key == key }) {
            return chip.label
        }
        return wardrobeCategoryLabel(key)
    }

    static func matchesCategoryFilter(_ itemCategory: String, filter: String) -> Bool {
        let filterKey = normalizeCategory(filter)
        if filterKey == "all" {
            return true
        }

        if filterKey == "other" {
            return isOtherCategory(itemCategory)
        }

        if let coreMatchers = coreGroupMatchers[filterKey] {
            return matchesAny(itemCategory, values: coreMatchers)
        }

        if let extendedMatchers = extendedMatchers[filterKey] {
            return matchesAny(itemCategory, values: extendedMatchers)
        }

        return normalizeCategory(itemCategory) == filterKey
    }

    static func rebuildCategoryCounts(from items: [WardrobeItem]) -> [String: Int] {
        var counts: [String: Int] = [:]
        for chip in coreFilterChips + extendedFilterChips {
            counts[chip.key] = 0
        }

        for item in items {
            let category = item.category
            for chip in coreFilterChips where matchesCategoryFilter(category, filter: chip.key) {
                counts[chip.key, default: 0] += 1
            }
            for chip in extendedFilterChips {
                if chip.key == "other" {
                    if isOtherCategory(category) {
                        counts["other", default: 0] += 1
                    }
                } else if matchesCategoryFilter(category, filter: chip.key) {
                    counts[chip.key, default: 0] += 1
                }
            }
        }

        return counts
    }

    static func visibleFilterChipKeys(from counts: [String: Int]) -> [String] {
        var keys = ["All"] + coreFilterChips.map(\.key)
        for chip in extendedFilterChips where (counts[chip.key] ?? 0) > 0 {
            keys.append(chip.key)
        }
        return keys
    }

    private static func isOtherCategory(_ category: String) -> Bool {
        let normalized = normalizeCategory(category)
        if allCoreMatchValues.contains(normalized) {
            return false
        }
        if allExtendedMatchValues.contains(normalized) {
            return false
        }
        return true
    }

    private static func matchesAny(_ category: String, values: [String]) -> Bool {
        let normalized = normalizeCategory(category)
        return values.contains { normalizeCategory($0) == normalized }
    }

    private static func prettyLabel(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .components(separatedBy: CharacterSet(charactersIn: "_- "))
            .filter { !$0.isEmpty }
            .map { part in
                part.prefix(1).uppercased() + part.dropFirst().lowercased()
            }
            .joined(separator: " ")
    }
}
