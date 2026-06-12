//
//  OutfitItemCardText.swift
//  OutfitSuggestor
//

import Foundation

struct OutfitItemCardText {
    let shortName: String
    let oneLineReason: String?
}

enum OutfitItemCardTextParser {
    static func parse(_ description: String) -> OutfitItemCardText {
        let trimmed = description.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return OutfitItemCardText(shortName: "", oneLineReason: nil)
        }

        let separators = [" — ", " - ", ", ", ". "]
        for sep in separators {
            if let range = trimmed.range(of: sep) {
                let idx = trimmed.distance(from: trimmed.startIndex, to: range.lowerBound)
                if idx > 0, idx < 60 {
                    let shortName = String(trimmed[..<range.lowerBound]).trimmingCharacters(in: .whitespacesAndNewlines)
                    let rest = String(trimmed[range.upperBound...]).trimmingCharacters(in: .whitespacesAndNewlines)
                    let reason = rest.isEmpty ? nil : String(rest.prefix(80))
                    return OutfitItemCardText(shortName: shortName, oneLineReason: reason)
                }
            }
        }

        if trimmed.count > 48 {
            let prefix = String(trimmed.prefix(45)).trimmingCharacters(in: .whitespacesAndNewlines)
            return OutfitItemCardText(shortName: "\(prefix)…", oneLineReason: nil)
        }

        return OutfitItemCardText(shortName: trimmed, oneLineReason: nil)
    }
}
