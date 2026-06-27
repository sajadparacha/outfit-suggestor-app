//
//  OutfitContextLine.swift
//  OutfitSuggestor
//

import Foundation

enum OutfitContextLine {
    private static let occasionDisplay: [String: String] = [
        "everyday": "Everyday",
        "work": "Work",
        "date-night": "Date Night",
        "dinner-night-out": "Dinner / Night Out",
        "party": "Party",
        "wedding-guest": "Wedding Guest",
        "formal-event": "Formal Event",
        "travel": "Travel",
        "workout": "Workout",
        "errands": "Errands",
        "lounge": "Lounge",
        "outdoor": "Outdoor",
    ]

    private static let seasonDisplay: [String: String] = [
        "spring": "Spring",
        "summer": "Summer",
        "fall": "Fall",
        "winter": "Winter",
        "transitional": "Transitional",
        "all-season": "All Season",
    ]

    private static let styleDisplay: [String: String] = [
        "classic": "Classic",
        "minimal": "Minimal",
        "smart-casual": "Smart Casual",
        "streetwear": "Streetwear",
        "sporty": "Sporty",
        "preppy": "Preppy",
        "boho": "Boho",
        "edgy": "Edgy",
        "romantic": "Romantic",
        "trendy": "Trendy",
        "vintage": "Vintage",
        "elegant": "Elegant",
    ]

    static func format(occasion: String, season: String, style: String) -> String {
        let styleLabel = styleDisplay[style] ?? style
        let seasonLabel = season != "all-season" ? (seasonDisplay[season] ?? season) : ""
        let occasionLabel = occasionDisplay[occasion] ?? occasion

        if !styleLabel.isEmpty, !seasonLabel.isEmpty {
            return "\(styleLabel) · \(seasonLabel)"
        }
        if !styleLabel.isEmpty { return styleLabel }
        if !seasonLabel.isEmpty { return seasonLabel }
        if !occasionLabel.isEmpty { return occasionLabel }
        return "Styled for you"
    }
}
