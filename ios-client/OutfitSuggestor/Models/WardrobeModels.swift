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
