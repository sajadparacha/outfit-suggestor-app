//
//  OutfitModels.swift
//  OutfitSuggestor
//
//  Models for outfit suggestion data
//

import Foundation

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
    
    enum CodingKeys: String, CodingKey {
        case shirt, trouser, blazer, shoes, belt, reasoning
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
        self.imageData = nil
    }
    
    init(id: String = UUID().uuidString,
         shirt: String,
         trouser: String,
         blazer: String,
         shoes: String,
         belt: String,
         reasoning: String,
         imageData: Data? = nil) {
        self.id = id
        self.shirt = shirt
        self.trouser = trouser
        self.blazer = blazer
        self.shoes = shoes
        self.belt = belt
        self.reasoning = reasoning
        self.imageData = imageData
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
}

enum Season: String, CaseIterable {
    case all = "All Seasons"
    case spring = "Spring"
    case summer = "Summer"
    case fall = "Fall"
    case winter = "Winter"
}

enum Style: String, CaseIterable {
    case modern = "Modern"
    case classic = "Classic"
    case trendy = "Trendy"
    case minimalist = "Minimalist"
    case bold = "Bold"
}

