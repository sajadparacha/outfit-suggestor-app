//
//  RandomHistorySelection.swift
//  OutfitSuggestor
//
//  Diverse random pick from outfit history — keep in sync with randomHistorySelection.ts
//

import Foundation

struct RandomHistorySelection {
    static let recentPickLimit = 5

    struct PickResult {
        let entry: OutfitHistoryEntry?
        let shouldShowSingleLookToast: Bool
    }

    private(set) var deck: [Int] = []
    private(set) var recentPicks: [Int] = []
    private(set) var hasShownSingleLookToast = false

    private let shuffle: ([Int]) -> [Int]

    init(shuffle: @escaping ([Int]) -> [Int] = { $0.shuffled() }) {
        self.shuffle = shuffle
    }

    mutating func reset() {
        deck = []
        recentPicks = []
        hasShownSingleLookToast = false
    }

    static func outfitFingerprint(for entry: OutfitHistoryEntry) -> String {
        let norm: (String) -> String = {
            $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        }

        var parts: [String] = [
            "shirt:\(norm(entry.shirt))",
            "trouser:\(norm(entry.trouser))",
            "blazer:\(norm(entry.blazer))",
            "shoes:\(norm(entry.shoes))",
            "belt:\(norm(entry.belt))",
        ]

        if let sweater = entry.sweater, !sweater.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            parts.append("sweater:\(norm(sweater))")
        }
        if let outerwear = entry.outerwear, !outerwear.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            parts.append("outerwear:\(norm(outerwear))")
        }
        if let tie = entry.tie, !tie.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            parts.append("tie:\(norm(tie))")
        }

        let wardrobeIds: [(String, Int?)] = [
            ("shirt_id", entry.shirt_id),
            ("trouser_id", entry.trouser_id),
            ("blazer_id", entry.blazer_id),
            ("shoes_id", entry.shoes_id),
            ("belt_id", entry.belt_id),
            ("sweater_id", entry.sweater_id),
            ("outerwear_id", entry.outerwear_id),
            ("tie_id", entry.tie_id),
        ]
        for (key, value) in wardrobeIds where value != nil {
            parts.append("\(key):\(value!)")
        }

        return parts.joined(separator: "|")
    }

    static func deduplicateEntries(_ entries: [OutfitHistoryEntry]) -> [OutfitHistoryEntry] {
        var bestByFingerprint: [String: OutfitHistoryEntry] = [:]
        for entry in entries {
            let fingerprint = outfitFingerprint(for: entry)
            if let existing = bestByFingerprint[fingerprint] {
                if prefers(entry, over: existing) {
                    bestByFingerprint[fingerprint] = entry
                }
            } else {
                bestByFingerprint[fingerprint] = entry
            }
        }
        return Array(bestByFingerprint.values)
    }

    mutating func pick(
        from entries: [OutfitHistoryEntry],
        excludeCurrentId: Int?
    ) -> PickResult {
        let deduped = Self.deduplicateEntries(entries)
        guard !deduped.isEmpty else {
            return PickResult(entry: nil, shouldShowSingleLookToast: false)
        }

        var shouldShowSingleLookToast = false
        if deduped.count == 1, !hasShownSingleLookToast {
            shouldShowSingleLookToast = true
            hasShownSingleLookToast = true
        }

        let entriesById = Dictionary(uniqueKeysWithValues: deduped.map { ($0.id, $0) })
        let allIds = deduped.map(\.id)

        var candidates = eligibleIds(
            from: allIds,
            excludeCurrentId: excludeCurrentId,
            excludeRecent: true
        )
        if candidates.isEmpty {
            candidates = eligibleIds(
                from: allIds,
                excludeCurrentId: excludeCurrentId,
                excludeRecent: false
            )
        }
        if candidates.isEmpty {
            candidates = allIds
        }

        guard let pickedId = popFromDeck(candidates: candidates) else {
            return PickResult(entry: nil, shouldShowSingleLookToast: shouldShowSingleLookToast)
        }

        recordPick(pickedId)
        return PickResult(
            entry: entriesById[pickedId],
            shouldShowSingleLookToast: shouldShowSingleLookToast
        )
    }

    private static func prefers(_ entry: OutfitHistoryEntry, over other: OutfitHistoryEntry) -> Bool {
        if entry.created_at != other.created_at {
            return entry.created_at > other.created_at
        }
        return entry.id > other.id
    }

    private func eligibleIds(
        from allIds: [Int],
        excludeCurrentId: Int?,
        excludeRecent: Bool
    ) -> [Int] {
        let recentSet = excludeRecent ? Set(recentPicks.suffix(Self.recentPickLimit)) : []
        return allIds.filter { id in
            if let excludeCurrentId, id == excludeCurrentId { return false }
            if excludeRecent, recentSet.contains(id) { return false }
            return true
        }
    }

    private mutating func popFromDeck(candidates: [Int]) -> Int? {
        let candidateSet = Set(candidates)
        deck = deck.filter { candidateSet.contains($0) }

        if deck.isEmpty {
            deck = shuffle(candidates)
        }

        while !deck.isEmpty {
            let id = deck.removeFirst()
            if candidateSet.contains(id) {
                return id
            }
        }

        deck = shuffle(candidates)
        guard !deck.isEmpty else { return nil }
        return deck.removeFirst()
    }

    private mutating func recordPick(_ id: Int) {
        recentPicks.append(id)
        if recentPicks.count > Self.recentPickLimit {
            recentPicks.removeFirst(recentPicks.count - Self.recentPickLimit)
        }
    }
}
