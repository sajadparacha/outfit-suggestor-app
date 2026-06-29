//
//  OutfitPromptUtils.swift
//  OutfitSuggestor
//
//  Serialize outfits for API variety prompts — keep in sync with outfitPromptUtils.ts
//

import Foundation

enum OutfitPromptUtils {
    private static let maxPreviousOutfitChars = 6000

    static func formatPreviousOutfitForPrompt(_ suggestion: OutfitSuggestion) -> String {
        let lines = [
            "Shirt: \(suggestion.shirt)",
            "Trousers: \(suggestion.trouser)",
            "Blazer: \(suggestion.blazer)",
            "Shoes: \(suggestion.shoes)",
            "Belt: \(suggestion.belt)",
            "Reasoning: \(suggestion.reasoning)",
        ]
        let text = lines.joined(separator: "\n")
        if text.count <= maxPreviousOutfitChars {
            return text
        }
        let prefix = String(text.prefix(maxPreviousOutfitChars))
        return "\(prefix)\n[truncated]"
    }
}
