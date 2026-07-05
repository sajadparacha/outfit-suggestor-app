//
//  WardrobeModels.swift
//  OutfitSuggestor
//
//  Models for wardrobe API (matches backend)
//

import Foundation

struct WardrobeItem: Codable, Identifiable {
    let id: Int
    let category: String
    let name: String?
    let description: String?
    let color: String?
    let brand: String?
    let size: String?
    let image_data: String?
    let tags: String?
    let condition: String?
    let wear_count: Int
    let created_at: String
    let updated_at: String

    enum CodingKeys: String, CodingKey {
        case id
        case category
        case name
        case description
        case color
        case brand
        case size
        case image_data
        case tags
        case condition
        case wear_count
        case created_at
        case updated_at
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        category = try c.decodeIfPresent(String.self, forKey: .category) ?? "other"
        name = try c.decodeIfPresent(String.self, forKey: .name)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        color = try c.decodeIfPresent(String.self, forKey: .color)
        brand = try c.decodeIfPresent(String.self, forKey: .brand)
        size = try c.decodeIfPresent(String.self, forKey: .size)
        image_data = try c.decodeIfPresent(String.self, forKey: .image_data)
        tags = try c.decodeIfPresent(String.self, forKey: .tags)
        condition = try c.decodeIfPresent(String.self, forKey: .condition)
        wear_count = try c.decodeIfPresent(Int.self, forKey: .wear_count) ?? 0
        created_at = try c.decodeIfPresent(String.self, forKey: .created_at) ?? ""
        updated_at = try c.decodeIfPresent(String.self, forKey: .updated_at) ?? ""
    }

    init(
        id: Int,
        category: String,
        name: String? = nil,
        description: String? = nil,
        color: String? = nil,
        brand: String? = nil,
        size: String? = nil,
        image_data: String? = nil,
        tags: String? = nil,
        condition: String? = nil,
        wear_count: Int = 0,
        created_at: String = "2026-01-01T00:00:00",
        updated_at: String = "2026-01-01T00:00:00"
    ) {
        self.id = id
        self.category = category
        self.name = name
        self.description = description
        self.color = color
        self.brand = brand
        self.size = size
        self.image_data = image_data
        self.tags = tags
        self.condition = condition
        self.wear_count = wear_count
        self.created_at = created_at
        self.updated_at = updated_at
    }
}

enum WardrobeCompletionSlot: String, CaseIterable {
    case shirt
    case trouser
    case blazer
    case outerwear
    case sweater
    case shoes
    case belt

    static let upperBodyExclusiveSlots: Set<WardrobeCompletionSlot> = [.blazer, .outerwear, .sweater]

    var displayName: String {
        switch self {
        case .shirt: return "Shirt"
        case .trouser: return "Trousers"
        case .blazer: return "Blazer"
        case .outerwear: return "Outerwear"
        case .sweater: return "Sweater"
        case .shoes: return "Shoes"
        case .belt: return "Belt"
        }
    }

    /// Lowercase slot label for multi-select status copy (trouser → trousers).
    var summaryLabel: String {
        switch self {
        case .trouser: return "trousers"
        default: return rawValue
        }
    }

    static func normalized(from category: String) -> WardrobeCompletionSlot? {
        let value = category.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch value {
        case "shirt", "t_shirt", "t-shirt", "polo":
            return .shirt
        case "trouser", "trousers", "pants", "jeans", "shorts":
            return .trouser
        case "blazer", "suit", "sport_coat", "sport coat":
            return .blazer
        case "jacket", "jackets", "coat", "coats", "outerwear":
            return .outerwear
        case "sweater", "sweaters":
            return .sweater
        case "shoe", "shoes":
            return .shoes
        case "belt", "belts":
            return .belt
        default:
            return nil
        }
    }
}

enum WardrobeMultiSelectToggleResult: Equatable {
    case selected
    case deselected
    case unsupportedCategory
    case duplicateSlot
    case upperBodySlotConflict
    case maximumReached

    var message: String? {
        switch self {
        case .selected, .deselected:
            return nil
        case .unsupportedCategory:
            return "This item cannot be used to complete an outfit."
        case .duplicateSlot:
            return "Choose one item per outfit slot"
        case .upperBodySlotConflict:
            return "Choose only one of blazer, outerwear, or sweater"
        case .maximumReached:
            return "Select up to 5 items"
        }
    }
}

struct WardrobeMultiSelectState: Equatable {
    static let maximumSelectedItems = 5
    static let minimumSelectedItems = 1

    private(set) var selectedItemIds: [Int] = []
    private(set) var selectedSlots: [WardrobeCompletionSlot: Int] = [:]

    var selectedCount: Int { selectedItemIds.count }
    var canCompleteOutfit: Bool { selectedCount >= Self.minimumSelectedItems }
    var actionTitle: String { canCompleteOutfit ? "Complete outfit with AI" : "Select at least 1 item" }

    func isSelected(_ item: WardrobeItem) -> Bool {
        selectedItemIds.contains(item.id)
    }

    func slot(for item: WardrobeItem) -> WardrobeCompletionSlot? {
        WardrobeCompletionSlot.normalized(from: item.category)
    }

    func isEligible(_ item: WardrobeItem) -> Bool {
        slot(for: item) != nil
    }

    mutating func toggle(_ item: WardrobeItem) -> WardrobeMultiSelectToggleResult {
        if let existingIndex = selectedItemIds.firstIndex(of: item.id) {
            selectedItemIds.remove(at: existingIndex)
            if let slot = slot(for: item) {
                selectedSlots[slot] = nil
            }
            return .deselected
        }

        guard let slot = slot(for: item) else {
            return .unsupportedCategory
        }

        if let selectedId = selectedSlots[slot], selectedId != item.id {
            return .duplicateSlot
        }

        if WardrobeCompletionSlot.upperBodyExclusiveSlots.contains(slot) {
            for otherSlot in WardrobeCompletionSlot.upperBodyExclusiveSlots where otherSlot != slot {
                if selectedSlots[otherSlot] != nil {
                    return .upperBodySlotConflict
                }
            }
        }

        guard selectedItemIds.count < Self.maximumSelectedItems else {
            return .maximumReached
        }

        selectedItemIds.append(item.id)
        selectedSlots[slot] = item.id
        return .selected
    }

    mutating func clear() {
        selectedItemIds = []
        selectedSlots = [:]
    }

    mutating func remove(_ item: WardrobeItem) {
        guard let existingIndex = selectedItemIds.firstIndex(of: item.id) else { return }
        selectedItemIds.remove(at: existingIndex)
        if let slot = slot(for: item), selectedSlots[slot] == item.id {
            selectedSlots[slot] = nil
        }
    }

    func selectionSummary(for items: [WardrobeItem]) -> String {
        guard selectedCount > 0 else { return WardrobeCompletionCopy.noItemsSelected }
        let slotLabels = selectedItemIds.compactMap { id -> String? in
            guard let item = items.first(where: { $0.id == id }),
                  let slot = slot(for: item) else { return nil }
            return slot.summaryLabel
        }
        return "\(selectedCount) selected: \(slotLabels.joined(separator: ", "))"
    }
}

struct WardrobeSummary: Codable {
    let total_items: Int
    let by_category: [String: Int]
    let by_color: [String: Int]
    let categories: [String]
}

struct WardrobeListResponse: Codable {
    let items: [WardrobeItem]
    let total: Int
    let limit: Int
    let offset: Int
}

struct WardrobeDuplicateResponse: Codable {
    let is_duplicate: Bool
    let existing_item: WardrobeItem?
}

struct WardrobeAnalyzeResponse: Codable {
    let category: String
    let color: String
    let description: String
    let model_used: String?
}

struct WardrobeOutfitSuggestionRequest: Encodable {
    let occasion: String?
    let season: String?
    let style: String?
    let text_input: String?
    let selected_wardrobe_item_ids: [Int]
    let previous_outfit_text: String?
    let avoid_outfit_texts: [String]?

    enum CodingKeys: String, CodingKey {
        case occasion, season, style, text_input, selected_wardrobe_item_ids
        case previous_outfit_text, avoid_outfit_texts
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(occasion, forKey: .occasion)
        try container.encodeIfPresent(season, forKey: .season)
        try container.encodeIfPresent(style, forKey: .style)
        try container.encodeIfPresent(text_input, forKey: .text_input)
        try container.encode(selected_wardrobe_item_ids, forKey: .selected_wardrobe_item_ids)
        try container.encodeIfPresent(previous_outfit_text, forKey: .previous_outfit_text)
        if let avoidOutfitTexts = avoid_outfit_texts, !avoidOutfitTexts.isEmpty {
            try container.encode(avoidOutfitTexts, forKey: .avoid_outfit_texts)
        }
    }
}

// MARK: - Wardrobe Gap Analysis

struct WardrobeGapAnalysisRequest: Codable {
    let occasion: String
    let season: String
    let style: String
    let text_input: String
    let analysis_mode: String // "free" or "premium"
}

struct WardrobeCategoryGap: Codable {
    let category: String
    let owned_colors: [String]
    let owned_styles: [String]
    let missing_colors: [String]
    let missing_styles: [String]
    let recommended_purchases: [String]
    let item_count: Int
}

struct WardrobeGapAnalysisCost: Codable, Equatable {
    let gpt4_cost: Double?
    let model_image_cost: Double?
    let total_cost: Double?
    let input_tokens: Int?
    let output_tokens: Int?
}

struct WardrobePriorityShoppingItem: Codable, Identifiable {
    let rank: Int
    let itemName: String
    let category: String
    let priority: String
    let recommendedColors: [String]
    let recommendedStyles: [String]
    let reason: String
    let outfitImpact: String
    let actions: [String]

    var id: String { "\(rank)-\(category)-\(itemName)" }
}

struct WardrobeCategoryInsight: Codable, Identifiable {
    let category: String
    let missingColors: [String]
    let missingStyles: [String]
    let priority: String
    let whyThisMatters: String
    let recommendation: String
    let suggestedActions: [String]

    var id: String { category }
}

struct WardrobeGapAnalysisResponse: Codable {
    let occasion: String
    let season: String
    let style: String
    let analysis_mode: String?
    let analysis_by_category: [String: WardrobeCategoryGap]
    let overall_summary: String
    let summaryText: String?
    let analysisDepth: String?
    let priorityShoppingList: [WardrobePriorityShoppingItem]?
    let categoryInsights: [WardrobeCategoryInsight]?
    let ai_prompt: String?
    let ai_raw_response: String?
    let cost: WardrobeGapAnalysisCost?
}
