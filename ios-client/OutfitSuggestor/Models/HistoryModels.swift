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
            model_image: model_image
        )
    }
}
