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
