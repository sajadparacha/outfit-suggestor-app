//
//  HistoryModels.swift
//  OutfitSuggestor
//
//  Models for outfit history API (matches backend)
//

import Foundation

struct OutfitHistoryEntry: Codable, Identifiable {
    let id: Int
    let created_at: String
    let text_input: String?
    let image_data: String?
    let model_image: String?
    let shirt: String
    let trouser: String
    let blazer: String
    let shoes: String
    let belt: String
    let reasoning: String
    let occasion: String?
    let season: String?
    let style: String?
    let source_wardrobe_item_id: Int?
    let shirt_id: Int?
    let trouser_id: Int?
    let blazer_id: Int?
    let shoes_id: Int?
    let belt_id: Int?
    let sweater: String?
    let outerwear: String?
    let tie: String?
    let sweater_id: Int?
    let outerwear_id: Int?
    let tie_id: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case created_at
        case text_input
        case image_data
        case model_image
        case shirt
        case trouser
        case blazer
        case shoes
        case belt
        case reasoning
        case occasion
        case season
        case style
        case source_wardrobe_item_id
        case shirt_id
        case trouser_id
        case blazer_id
        case shoes_id
        case belt_id
        case sweater
        case outerwear
        case tie
        case sweater_id
        case outerwear_id
        case tie_id
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        created_at = try c.decodeIfPresent(String.self, forKey: .created_at) ?? ""
        text_input = try c.decodeIfPresent(String.self, forKey: .text_input)
        image_data = try c.decodeIfPresent(String.self, forKey: .image_data)
        model_image = try c.decodeIfPresent(String.self, forKey: .model_image)
        shirt = try c.decodeIfPresent(String.self, forKey: .shirt) ?? ""
        trouser = try c.decodeIfPresent(String.self, forKey: .trouser) ?? ""
        blazer = try c.decodeIfPresent(String.self, forKey: .blazer) ?? ""
        shoes = try c.decodeIfPresent(String.self, forKey: .shoes) ?? ""
        belt = try c.decodeIfPresent(String.self, forKey: .belt) ?? ""
        reasoning = try c.decodeIfPresent(String.self, forKey: .reasoning) ?? ""
        occasion = try c.decodeIfPresent(String.self, forKey: .occasion)
        season = try c.decodeIfPresent(String.self, forKey: .season)
        style = try c.decodeIfPresent(String.self, forKey: .style)
        source_wardrobe_item_id = try c.decodeIfPresent(Int.self, forKey: .source_wardrobe_item_id)
        shirt_id = try c.decodeIfPresent(Int.self, forKey: .shirt_id)
        trouser_id = try c.decodeIfPresent(Int.self, forKey: .trouser_id)
        blazer_id = try c.decodeIfPresent(Int.self, forKey: .blazer_id)
        shoes_id = try c.decodeIfPresent(Int.self, forKey: .shoes_id)
        belt_id = try c.decodeIfPresent(Int.self, forKey: .belt_id)
        sweater = try c.decodeIfPresent(String.self, forKey: .sweater)
        outerwear = try c.decodeIfPresent(String.self, forKey: .outerwear)
        tie = try c.decodeIfPresent(String.self, forKey: .tie)
        sweater_id = try c.decodeIfPresent(Int.self, forKey: .sweater_id)
        outerwear_id = try c.decodeIfPresent(Int.self, forKey: .outerwear_id)
        tie_id = try c.decodeIfPresent(Int.self, forKey: .tie_id)
    }

    init(
        id: Int,
        created_at: String,
        text_input: String?,
        image_data: String?,
        model_image: String?,
        shirt: String,
        trouser: String,
        blazer: String,
        shoes: String,
        belt: String,
        reasoning: String,
        occasion: String? = nil,
        season: String? = nil,
        style: String? = nil,
        source_wardrobe_item_id: Int? = nil,
        shirt_id: Int? = nil,
        trouser_id: Int? = nil,
        blazer_id: Int? = nil,
        shoes_id: Int? = nil,
        belt_id: Int? = nil,
        sweater: String? = nil,
        outerwear: String? = nil,
        tie: String? = nil,
        sweater_id: Int? = nil,
        outerwear_id: Int? = nil,
        tie_id: Int? = nil
    ) {
        self.id = id
        self.created_at = created_at
        self.text_input = text_input
        self.image_data = image_data
        self.model_image = model_image
        self.shirt = shirt
        self.trouser = trouser
        self.blazer = blazer
        self.shoes = shoes
        self.belt = belt
        self.reasoning = reasoning
        self.occasion = occasion
        self.season = season
        self.style = style
        self.source_wardrobe_item_id = source_wardrobe_item_id
        self.shirt_id = shirt_id
        self.trouser_id = trouser_id
        self.blazer_id = blazer_id
        self.shoes_id = shoes_id
        self.belt_id = belt_id
        self.sweater = sweater
        self.outerwear = outerwear
        self.tie = tie
        self.sweater_id = sweater_id
        self.outerwear_id = outerwear_id
        self.tie_id = tie_id
    }
}

extension OutfitHistoryEntry {
    /// Map to OutfitSuggestion for display in main suggestion view
    func toOutfitSuggestion() -> OutfitSuggestion {
        OutfitSuggestion(
            id: String(id),
            shirt: shirt,
            trouser: trouser,
            blazer: blazer,
            shoes: shoes,
            belt: belt,
            reasoning: reasoning,
            imageData: image_data.flatMap { Data(base64Encoded: $0) },
            model_image: model_image,
            sweater: sweater,
            outerwear: outerwear,
            tie: tie,
            shirt_id: shirt_id,
            trouser_id: trouser_id,
            blazer_id: blazer_id,
            shoes_id: shoes_id,
            belt_id: belt_id,
            sweater_id: sweater_id,
            outerwear_id: outerwear_id,
            tie_id: tie_id,
            source_wardrobe_item_id: source_wardrobe_item_id
        )
    }
}
