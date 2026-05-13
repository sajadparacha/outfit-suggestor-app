//
//  OutfitModels.swift
//  OutfitSuggestor
//
//  Models for outfit suggestion data
//

import Foundation

// MARK: - Matching Wardrobe Item (from API matching_wardrobe_items)
struct MatchingWardrobeItem: Codable {
    let id: Int
    let category: String
    let color: String?
    let description: String?
    let image_data: String?
}

// MARK: - Matching items by category (shirt, trouser, blazer, shoes, belt)
struct MatchingWardrobeItems: Codable {
    let shirt: [MatchingWardrobeItem]?
    let trouser: [MatchingWardrobeItem]?
    let blazer: [MatchingWardrobeItem]?
    let shoes: [MatchingWardrobeItem]?
    let belt: [MatchingWardrobeItem]?
}

struct OutfitCost: Codable {
    let gpt4_cost: Double
    let model_image_cost: Double?
    let total_cost: Double
    let input_tokens: Int?
    let output_tokens: Int?
}

// MARK: - Outfit Suggestion Response
struct OutfitSuggestion: Codable, Identifiable {
    let id: String
    let shirt: String
    let trouser: String
    let blazer: String
    let shoes: String
    let belt: String
    let reasoning: String
    var imageData: Data?
    /// Base64-encoded model image (AI-generated outfit visualization)
    var model_image: String?
    /// Matched wardrobe items per category (shirt, trouser, etc.) — use for correct thumbnails
    var matching_wardrobe_items: MatchingWardrobeItems?
    /// Category of the wardrobe item that matched the upload (e.g. "shirt", "trouser"). Use upload image for that category only.
    var upload_matched_category: String?
    var ai_prompt: String?
    var ai_raw_response: String?
    var cost: OutfitCost?
    
    enum CodingKeys: String, CodingKey {
        case shirt, trouser, blazer, shoes, belt, reasoning, model_image, matching_wardrobe_items, upload_matched_category, ai_prompt, ai_raw_response, cost
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID().uuidString
        self.shirt = try container.decode(String.self, forKey: .shirt)
        self.trouser = try container.decode(String.self, forKey: .trouser)
        self.blazer = try container.decode(String.self, forKey: .blazer)
        self.shoes = try container.decode(String.self, forKey: .shoes)
        self.belt = try container.decode(String.self, forKey: .belt)
        self.reasoning = try container.decode(String.self, forKey: .reasoning)
        self.model_image = try container.decodeIfPresent(String.self, forKey: .model_image)
        self.matching_wardrobe_items = try container.decodeIfPresent(MatchingWardrobeItems.self, forKey: .matching_wardrobe_items)
        self.upload_matched_category = try container.decodeIfPresent(String.self, forKey: .upload_matched_category)
        self.ai_prompt = try container.decodeIfPresent(String.self, forKey: .ai_prompt)
        self.ai_raw_response = try container.decodeIfPresent(String.self, forKey: .ai_raw_response)
        self.cost = try container.decodeIfPresent(OutfitCost.self, forKey: .cost)
        self.imageData = nil
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(shirt, forKey: .shirt)
        try container.encode(trouser, forKey: .trouser)
        try container.encode(blazer, forKey: .blazer)
        try container.encode(shoes, forKey: .shoes)
        try container.encode(belt, forKey: .belt)
        try container.encode(reasoning, forKey: .reasoning)
        try container.encodeIfPresent(model_image, forKey: .model_image)
        try container.encodeIfPresent(matching_wardrobe_items, forKey: .matching_wardrobe_items)
        try container.encodeIfPresent(upload_matched_category, forKey: .upload_matched_category)
        try container.encodeIfPresent(ai_prompt, forKey: .ai_prompt)
        try container.encodeIfPresent(ai_raw_response, forKey: .ai_raw_response)
        try container.encodeIfPresent(cost, forKey: .cost)
    }
    
    init(id: String = UUID().uuidString,
         shirt: String,
         trouser: String,
         blazer: String,
         shoes: String,
         belt: String,
         reasoning: String,
         imageData: Data? = nil,
         model_image: String? = nil,
         matching_wardrobe_items: MatchingWardrobeItems? = nil,
         upload_matched_category: String? = nil,
         ai_prompt: String? = nil,
         ai_raw_response: String? = nil,
         cost: OutfitCost? = nil) {
        self.id = id
        self.shirt = shirt
        self.trouser = trouser
        self.blazer = blazer
        self.shoes = shoes
        self.belt = belt
        self.reasoning = reasoning
        self.imageData = imageData
        self.model_image = model_image
        self.matching_wardrobe_items = matching_wardrobe_items
        self.upload_matched_category = upload_matched_category
        self.ai_prompt = ai_prompt
        self.ai_raw_response = ai_raw_response
        self.cost = cost
    }
}

// MARK: - Filters
struct OutfitFilters {
    var occasion: String = "casual"
    var season: String = "all"
    var style: String = "modern"
    
    var description: String {
        "Occasion: \(occasion), Season: \(season), Style: \(style)"
    }
}

// MARK: - API Error
struct APIError: Codable {
    let detail: String
}

// MARK: - Filter Options
enum Occasion: String, CaseIterable {
    case casual = "Casual"
    case business = "Business"
    case formal = "Formal"
    case party = "Party"
    case date = "Date Night"

    var apiValue: String {
        switch self {
        case .casual: return "casual"
        case .business: return "business"
        case .formal: return "formal"
        case .party: return "party"
        case .date: return "date"
        }
    }
}

enum Season: String, CaseIterable {
    case all = "All Seasons"
    case spring = "Spring"
    case summer = "Summer"
    case fall = "Fall"
    case winter = "Winter"

    var apiValue: String {
        switch self {
        case .all: return "all"
        case .spring: return "spring"
        case .summer: return "summer"
        case .fall: return "fall"
        case .winter: return "winter"
        }
    }
}

enum Style: String, CaseIterable {
    case modern = "Modern"
    case classic = "Classic"
    case trendy = "Trendy"
    case minimalist = "Minimalist"
    case bold = "Bold"

    var apiValue: String {
        switch self {
        case .modern: return "modern"
        case .classic: return "classic"
        case .trendy: return "trendy"
        case .minimalist: return "minimalist"
        case .bold: return "bold"
        }
    }
}

