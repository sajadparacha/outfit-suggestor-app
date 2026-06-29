//
//  WardrobeRandomSession.swift
//  OutfitSuggestor
//
//  Session variety for Random from Wardrobe — keep in sync with wardrobeRandomSession.ts
//

import Foundation

struct WardrobeRandomSession {
    static let recentWardrobeRandomCount = 5
    static let wardrobeRandomMaxRetries = 3

    private(set) var recentFingerprints: [String] = []
    private(set) var recentOutfitTexts: [String] = []

    mutating func reset() {
        recentFingerprints = []
        recentOutfitTexts = []
    }

    static func suggestionFingerprint(for suggestion: OutfitSuggestion) -> String {
        let norm: (String) -> String = {
            $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        }

        var parts: [String] = [
            "shirt:\(norm(suggestion.shirt))",
            "trouser:\(norm(suggestion.trouser))",
            "blazer:\(norm(suggestion.blazer))",
            "shoes:\(norm(suggestion.shoes))",
            "belt:\(norm(suggestion.belt))",
        ]

        if let sweater = suggestion.sweater, !sweater.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            parts.append("sweater:\(norm(sweater))")
        }
        if let outerwear = suggestion.outerwear, !outerwear.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            parts.append("outerwear:\(norm(outerwear))")
        }
        if let tie = suggestion.tie, !tie.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            parts.append("tie:\(norm(tie))")
        }

        let wardrobeIds: [(String, Int?)] = [
            ("shirt_id", suggestion.shirt_id),
            ("trouser_id", suggestion.trouser_id),
            ("blazer_id", suggestion.blazer_id),
            ("shoes_id", suggestion.shoes_id),
            ("belt_id", suggestion.belt_id),
            ("sweater_id", suggestion.sweater_id),
            ("outerwear_id", suggestion.outerwear_id),
            ("tie_id", suggestion.tie_id),
        ]
        for (key, value) in wardrobeIds where value != nil {
            parts.append("\(key):\(value!)")
        }

        return parts.joined(separator: "|")
    }

    func isDuplicate(_ fingerprint: String) -> Bool {
        recentFingerprints.contains(fingerprint)
    }

    func avoidOutfitTexts(excludingPrevious previousOutfitText: String? = nil) -> [String] {
        guard let previousOutfitText, !previousOutfitText.isEmpty else {
            return recentOutfitTexts
        }
        return recentOutfitTexts.filter { $0 != previousOutfitText }
    }

    mutating func record(_ suggestion: OutfitSuggestion) {
        let fingerprint = Self.suggestionFingerprint(for: suggestion)
        recentFingerprints.append(fingerprint)
        if recentFingerprints.count > Self.recentWardrobeRandomCount {
            recentFingerprints.removeFirst(recentFingerprints.count - Self.recentWardrobeRandomCount)
        }

        let text = OutfitPromptUtils.formatPreviousOutfitForPrompt(suggestion)
        recentOutfitTexts.append(text)
        if recentOutfitTexts.count > Self.recentWardrobeRandomCount {
            recentOutfitTexts.removeFirst(recentOutfitTexts.count - Self.recentWardrobeRandomCount)
        }
    }
}
