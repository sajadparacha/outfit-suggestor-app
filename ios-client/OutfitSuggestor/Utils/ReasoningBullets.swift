//
//  ReasoningBullets.swift
//  OutfitSuggestor
//

import Foundation

enum ReasoningBullets {
    private static let minBullets = 1
    private static let maxBullets = 5

    /// Split outfit reasoning into bullet-friendly lines (3–5 when possible).
    static func toBullets(_ reasoning: String) -> [String] {
        let trimmed = reasoning.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }

        let byNewline = trimmed
            .components(separatedBy: .newlines)
            .map { $0.replacingOccurrences(of: #"^[-•*]\s*"#, with: "", options: .regularExpression) }
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        if trimmed.contains("\n"), byNewline.count >= minBullets {
            return Array(byNewline.prefix(maxBullets))
        }

        let pattern = #"[^.!?]+[.!?]+"#
        if let regex = try? NSRegularExpression(pattern: pattern) {
            let range = NSRange(trimmed.startIndex..., in: trimmed)
            let matches = regex.matches(in: trimmed, range: range)
            let sentences = matches.compactMap { match -> String? in
                guard let r = Range(match.range, in: trimmed) else { return nil }
                return String(trimmed[r]).trimmingCharacters(in: .whitespacesAndNewlines)
            }.filter { !$0.isEmpty }

            if sentences.count >= minBullets {
                return Array(sentences.prefix(maxBullets))
            }
        }

        return [trimmed]
    }
}
