//
//  ShoppingListStorage.swift
//  OutfitSuggestor
//
//  UserDefaults persistence for shopping-list checklist state.
//

import Foundation

struct ShoppingListChecklistEntry: Codable, Equatable {
    var isBought: Bool
    var notes: String

    static let empty = ShoppingListChecklistEntry(isBought: false, notes: "")
}

enum ShoppingListStorage {
    static let keyPrefix = "shopping-list-checklist:"

    static func storageKey(context: WardrobeInsightContext, itemIds: [String]) -> String {
        let contextPart = [
            context.occasion.lowercased(),
            context.season.lowercased(),
            context.style.lowercased(),
        ].joined(separator: "|")
        let sortedIds = itemIds.sorted().joined(separator: ",")
        return "\(keyPrefix)\(contextPart):\(sortedIds)"
    }

    static func load(forKey key: String, defaults: UserDefaults = .standard) -> [String: ShoppingListChecklistEntry] {
        guard let data = defaults.data(forKey: key),
              let decoded = try? JSONDecoder().decode([String: ShoppingListChecklistEntry].self, from: data) else {
            return [:]
        }
        return decoded
    }

    static func save(
        _ entries: [String: ShoppingListChecklistEntry],
        forKey key: String,
        defaults: UserDefaults = .standard
    ) {
        guard let data = try? JSONEncoder().encode(entries) else { return }
        defaults.set(data, forKey: key)
    }
}
