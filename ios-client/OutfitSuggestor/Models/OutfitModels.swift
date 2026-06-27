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

// MARK: - Matching items by category (core five + optional layers)
struct MatchingWardrobeItems: Codable {
    let shirt: [MatchingWardrobeItem]?
    let trouser: [MatchingWardrobeItem]?
    let blazer: [MatchingWardrobeItem]?
    let shoes: [MatchingWardrobeItem]?
    let belt: [MatchingWardrobeItem]?
    let sweater: [MatchingWardrobeItem]?
    let outerwear: [MatchingWardrobeItem]?
    let tie: [MatchingWardrobeItem]?
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
    var sweater: String?
    var outerwear: String?
    var tie: String?
    var shirt_id: Int?
    var trouser_id: Int?
    var blazer_id: Int?
    var shoes_id: Int?
    var belt_id: Int?
    var sweater_id: Int?
    var outerwear_id: Int?
    var tie_id: Int?
    var source_wardrobe_item_id: Int?
    var source_slot: String?
    
    enum CodingKeys: String, CodingKey {
        case shirt, trouser, blazer, shoes, belt, reasoning, model_image, matching_wardrobe_items, upload_matched_category, ai_prompt, ai_raw_response, cost
        case sweater, outerwear, tie
        case shirt_id, trouser_id, blazer_id, shoes_id, belt_id
        case sweater_id, outerwear_id, tie_id
        case source_wardrobe_item_id, source_slot
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
        self.sweater = try container.decodeIfPresent(String.self, forKey: .sweater)
        self.outerwear = try container.decodeIfPresent(String.self, forKey: .outerwear)
        self.tie = try container.decodeIfPresent(String.self, forKey: .tie)
        self.shirt_id = try container.decodeIfPresent(Int.self, forKey: .shirt_id)
        self.trouser_id = try container.decodeIfPresent(Int.self, forKey: .trouser_id)
        self.blazer_id = try container.decodeIfPresent(Int.self, forKey: .blazer_id)
        self.shoes_id = try container.decodeIfPresent(Int.self, forKey: .shoes_id)
        self.belt_id = try container.decodeIfPresent(Int.self, forKey: .belt_id)
        self.sweater_id = try container.decodeIfPresent(Int.self, forKey: .sweater_id)
        self.outerwear_id = try container.decodeIfPresent(Int.self, forKey: .outerwear_id)
        self.tie_id = try container.decodeIfPresent(Int.self, forKey: .tie_id)
        self.source_wardrobe_item_id = try container.decodeIfPresent(Int.self, forKey: .source_wardrobe_item_id)
        self.source_slot = try container.decodeIfPresent(String.self, forKey: .source_slot)
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
        try container.encodeIfPresent(sweater, forKey: .sweater)
        try container.encodeIfPresent(outerwear, forKey: .outerwear)
        try container.encodeIfPresent(tie, forKey: .tie)
        try container.encodeIfPresent(shirt_id, forKey: .shirt_id)
        try container.encodeIfPresent(trouser_id, forKey: .trouser_id)
        try container.encodeIfPresent(blazer_id, forKey: .blazer_id)
        try container.encodeIfPresent(shoes_id, forKey: .shoes_id)
        try container.encodeIfPresent(belt_id, forKey: .belt_id)
        try container.encodeIfPresent(sweater_id, forKey: .sweater_id)
        try container.encodeIfPresent(outerwear_id, forKey: .outerwear_id)
        try container.encodeIfPresent(tie_id, forKey: .tie_id)
        try container.encodeIfPresent(source_wardrobe_item_id, forKey: .source_wardrobe_item_id)
        try container.encodeIfPresent(source_slot, forKey: .source_slot)
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
         cost: OutfitCost? = nil,
         sweater: String? = nil,
         outerwear: String? = nil,
         tie: String? = nil,
         shirt_id: Int? = nil,
         trouser_id: Int? = nil,
         blazer_id: Int? = nil,
         shoes_id: Int? = nil,
         belt_id: Int? = nil,
         sweater_id: Int? = nil,
         outerwear_id: Int? = nil,
         tie_id: Int? = nil,
         source_wardrobe_item_id: Int? = nil,
         source_slot: String? = nil) {
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
        self.sweater = sweater
        self.outerwear = outerwear
        self.tie = tie
        self.shirt_id = shirt_id
        self.trouser_id = trouser_id
        self.blazer_id = blazer_id
        self.shoes_id = shoes_id
        self.belt_id = belt_id
        self.sweater_id = sweater_id
        self.outerwear_id = outerwear_id
        self.tie_id = tie_id
        self.source_wardrobe_item_id = source_wardrobe_item_id
        self.source_slot = source_slot
    }
}

// MARK: - Filters

enum ColorPreference: String, CaseIterable {
    case noPreference = "No Preference"
    case neutral = "Neutral"
    case black = "Black"
    case white = "White"
    case navy = "Navy"
    case earthTones = "Earth Tones"
    case bold = "Bold Colors"
}

struct OutfitFilters {
    var occasion: String = "everyday"
    var season: String = "all-season"
    var style: String = "classic"
    var colorPreference: String = ColorPreference.noPreference.rawValue

    var description: String {
        var parts = ["Occasion: \(occasion)", "Season: \(season)", "Style: \(style)"]
        if colorPreference != ColorPreference.noPreference.rawValue {
            parts.append("Colors: \(colorPreference)")
        }
        return parts.joined(separator: ", ")
    }
}

// MARK: - API Error
struct APIError: Codable {
    let detail: String
    let code: String?
}

// MARK: - Guest Usage
struct GuestUsageResponse: Codable {
    let limit: Int
    let used: Int
    let remaining: Int
    let requires_signup: Bool
}

// MARK: - Filter Options
enum Occasion: String, CaseIterable {
    case everyday = "Everyday"
    case work = "Work"
    case dateNight = "Date Night"
    case dinnerNightOut = "Dinner / Night Out"
    case party = "Party"
    case weddingGuest = "Wedding Guest"
    case formalEvent = "Formal Event"
    case travel = "Travel"
    case workout = "Workout"
    case errands = "Errands"
    case lounge = "Lounge"
    case outdoor = "Outdoor"

    var apiValue: String {
        switch self {
        case .everyday: return "everyday"
        case .work: return "work"
        case .dateNight: return "date-night"
        case .dinnerNightOut: return "dinner-night-out"
        case .party: return "party"
        case .weddingGuest: return "wedding-guest"
        case .formalEvent: return "formal-event"
        case .travel: return "travel"
        case .workout: return "workout"
        case .errands: return "errands"
        case .lounge: return "lounge"
        case .outdoor: return "outdoor"
        }
    }
}

enum Season: String, CaseIterable {
    case spring = "Spring"
    case summer = "Summer"
    case fall = "Fall"
    case winter = "Winter"
    case transitional = "Transitional"
    case allSeason = "All Season"

    var apiValue: String {
        switch self {
        case .spring: return "spring"
        case .summer: return "summer"
        case .fall: return "fall"
        case .winter: return "winter"
        case .transitional: return "transitional"
        case .allSeason: return "all-season"
        }
    }
}

enum Style: String, CaseIterable {
    case classic = "Classic"
    case minimal = "Minimal"
    case smartCasual = "Smart Casual"
    case streetwear = "Streetwear"
    case sporty = "Sporty"
    case preppy = "Preppy"
    case boho = "Boho"
    case edgy = "Edgy"
    case romantic = "Romantic"
    case trendy = "Trendy"
    case vintage = "Vintage"
    case elegant = "Elegant"

    var apiValue: String {
        switch self {
        case .classic: return "classic"
        case .minimal: return "minimal"
        case .smartCasual: return "smart-casual"
        case .streetwear: return "streetwear"
        case .sporty: return "sporty"
        case .preppy: return "preppy"
        case .boho: return "boho"
        case .edgy: return "edgy"
        case .romantic: return "romantic"
        case .trendy: return "trendy"
        case .vintage: return "vintage"
        case .elegant: return "elegant"
        }
    }
}

