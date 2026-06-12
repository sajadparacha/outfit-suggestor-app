//
//  OutfitContextLine.swift
//  OutfitSuggestor
//

import Foundation

enum OutfitContextLine {
    private static let occasionDisplay: [String: String] = [
        "casual": "Casual",
        "business": "Business",
        "formal": "Formal",
        "party": "Party",
        "date": "Date Night",
        "sports": "Sports/Active",
    ]

    private static let seasonDisplay: [String: String] = [
        "all": "All Seasons",
        "spring": "Spring",
        "summer": "Summer",
        "fall": "Fall",
        "winter": "Winter",
    ]

    private static let styleDisplay: [String: String] = [
        "modern": "Modern",
        "classic": "Classic",
        "trendy": "Trendy",
        "minimalist": "Minimalist",
        "bold": "Bold",
        "vintage": "Vintage",
        "casual": "Casual",
        "business casual": "Business Casual",
    ]

    static func format(occasion: String, season: String, style: String) -> String {
        let styleLabel = styleDisplay[style] ?? style
        let seasonLabel = season != "all" ? (seasonDisplay[season] ?? season) : ""
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
