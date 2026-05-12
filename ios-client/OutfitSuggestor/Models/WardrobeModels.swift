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

struct WardrobeGapAnalysisCost: Codable {
    let gpt4_cost: Double?
    let model_image_cost: Double?
    let total_cost: Double?
    let input_tokens: Int?
    let output_tokens: Int?
}

struct WardrobeGapAnalysisResponse: Codable {
    let occasion: String
    let season: String
    let style: String
    let analysis_mode: String?
    let analysis_by_category: [String: WardrobeCategoryGap]
    let overall_summary: String
    let ai_prompt: String?
    let ai_raw_response: String?
    let cost: WardrobeGapAnalysisCost?
}
