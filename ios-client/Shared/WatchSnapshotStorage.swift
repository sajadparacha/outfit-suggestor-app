//
//  WatchSnapshotStorage.swift
//  Shared by OutfitSuggestorWatch and its widget extension (and the iPhone app for unit tests).
//
//  Persists the week snapshot in the App Group so the complication can read what the watch app received.
//

import Foundation

struct WatchSnapshotStorage {
    static let appGroupID = "group.com.sajad.outfitsuggestor"
    static let storageKey = "watch.weekSnapshot"

    let defaults: UserDefaults

    init(defaults: UserDefaults) {
        self.defaults = defaults
    }

    /// App Group suite; falls back to standard defaults if the group isn't available (e.g. unsigned builds).
    static func shared() -> WatchSnapshotStorage {
        WatchSnapshotStorage(defaults: UserDefaults(suiteName: appGroupID) ?? .standard)
    }

    func load() -> WatchWeekSnapshot? {
        defaults.data(forKey: Self.storageKey).flatMap(WatchWeekSnapshot.decode(fileData:))
    }

    func save(_ snapshot: WatchWeekSnapshot) {
        defaults.set(try? snapshot.fileData(), forKey: Self.storageKey)
    }

    /// Moves a snapshot saved by earlier versions (standard defaults) into this storage once.
    @discardableResult
    func migrateIfNeeded(from legacy: UserDefaults) -> Bool {
        guard legacy !== defaults, let data = legacy.data(forKey: Self.storageKey) else { return false }
        legacy.removeObject(forKey: Self.storageKey)
        guard defaults.data(forKey: Self.storageKey) == nil else { return false }
        defaults.set(data, forKey: Self.storageKey)
        return true
    }
}
