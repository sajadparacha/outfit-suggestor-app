//
//  WatchSnapshotStore.swift
//  OutfitSuggestorWatch
//
//  Receives the week-plan snapshot from the iPhone and keeps the last one for offline use.
//

import Foundation
import SwiftUI
import WatchConnectivity
import WidgetKit

@MainActor
final class WatchSnapshotStore: NSObject, ObservableObject {
    static let shared = WatchSnapshotStore()
    static let pendingRefreshKey = "watch.pendingMorningRefreshMinutes"

    @Published private(set) var snapshot: WatchWeekSnapshot?
    /// Chosen on the watch but not yet confirmed by a snapshot from the iPhone.
    @Published private(set) var pendingMorningRefreshMinutes: Int?
    /// Day to show once, set when the user taps a "Today's outfit" reminder.
    @Published private(set) var focusDay: Int?

    private let defaults: UserDefaults
    private let storage: WatchSnapshotStorage
    private var isActivated = false

    init(defaults: UserDefaults = .standard, storage: WatchSnapshotStorage = .shared()) {
        self.defaults = defaults
        self.storage = storage
        storage.migrateIfNeeded(from: defaults)
        snapshot = storage.load()
        pendingMorningRefreshMinutes = defaults.object(forKey: Self.pendingRefreshKey) as? Int
        super.init()
    }

    var morningRefreshMinutes: Int {
        pendingMorningRefreshMinutes ?? snapshot?.morningRefreshMinutes ?? MorningRefreshTime.defaultMinutes
    }

    func focus(dayOfWeek: Int) {
        guard (0...6).contains(dayOfWeek) else { return }
        focusDay = dayOfWeek
    }

    func consumeFocusDay() -> Int? {
        defer { focusDay = nil }
        return focusDay
    }

    /// Sends the new time to the iPhone now if reachable, otherwise queues it for delivery later.
    func setMorningRefresh(minutes: Int) {
        guard MorningRefreshTime.isValid(minutes) else { return }
        pendingMorningRefreshMinutes = minutes
        defaults.set(minutes, forKey: Self.pendingRefreshKey)
        guard isActivated, WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        let payload: [String: Any] = [WatchWeekSnapshot.setMorningRefreshKey: minutes]
        guard session.isReachable else {
            session.transferUserInfo(payload)
            return
        }
        session.sendMessage(
            payload,
            replyHandler: { [weak self] reply in
                guard let next = WatchWeekSnapshot.decode(applicationContext: reply) else { return }
                Task { @MainActor in self?.receive(next) }
            },
            errorHandler: { _ in session.transferUserInfo(payload) }
        )
    }

    func activate() {
        guard !isActivated, WCSession.isSupported() else { return }
        isActivated = true
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Asks the iPhone to fetch the latest plan from the server (iOS wakes the app in the background).
    /// Without a reachable iPhone the last saved snapshot stays on screen.
    func requestRefresh() {
        guard isActivated, WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable else { return }
        session.sendMessage(
            [WatchWeekSnapshot.refreshRequestKey: true],
            replyHandler: { [weak self] reply in
                guard let next = WatchWeekSnapshot.decode(applicationContext: reply) else { return }
                Task { @MainActor in self?.receive(next) }
            },
            errorHandler: nil
        )
    }

    /// Text (application context) and pictures (file transfer) arrive separately and in any order.
    func receive(_ next: WatchWeekSnapshot) {
        let merged: WatchWeekSnapshot
        if let current = snapshot, current.updatedAt > next.updatedAt {
            merged = current.mergingImages(from: next)
        } else {
            merged = next.mergingImages(from: snapshot)
        }
        if let pending = pendingMorningRefreshMinutes, merged.morningRefreshMinutes == pending {
            pendingMorningRefreshMinutes = nil
            defaults.removeObject(forKey: Self.pendingRefreshKey)
        }
        guard merged != snapshot else { return }
        snapshot = merged
        storage.save(merged)
        WidgetCenter.shared.reloadAllTimelines()
    }
}

extension WatchSnapshotStore: WCSessionDelegate {
    nonisolated func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        let next = WatchWeekSnapshot.decode(applicationContext: session.receivedApplicationContext)
        Task { @MainActor in
            if let next { self.receive(next) }
            if let pending = self.pendingMorningRefreshMinutes {
                self.setMorningRefresh(minutes: pending)
            }
            self.requestRefresh()
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        guard session.isReachable else { return }
        Task { @MainActor in self.requestRefresh() }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard let next = WatchWeekSnapshot.decode(applicationContext: applicationContext) else { return }
        Task { @MainActor in self.receive(next) }
    }

    nonisolated func session(_ session: WCSession, didReceive file: WCSessionFile) {
        // The file is deleted when this method returns, so read it synchronously.
        guard file.metadata?[WatchWeekSnapshot.contextKey] != nil,
              let data = try? Data(contentsOf: file.fileURL),
              let next = WatchWeekSnapshot.decode(fileData: data)
        else { return }
        Task { @MainActor in self.receive(next) }
    }
}

#if DEBUG
extension WatchSnapshotStore {
    static let seedSampleArgument = "-WatchSeedSampleSnapshot"

    /// Simulator aid: `simctl launch <watch> com.sajad.outfitsuggestor.watchkitapp -WatchSeedSampleSnapshot`.
    func seedSampleIfRequested(arguments: [String] = ProcessInfo.processInfo.arguments) {
        guard arguments.contains(Self.seedSampleArgument) else { return }
        receive(Self.sampleSnapshot(now: Date()))
    }

    static func sampleSnapshot(now: Date) -> WatchWeekSnapshot {
        let today = WatchWeekSnapshot.dayOfWeek(for: now)
        let garments: [(String, String, (Double, Double, Double))] = [
            ("Shirt", "White oxford shirt", (0.95, 0.95, 0.95)),
            ("Trousers", "Charcoal trousers", (0.3, 0.3, 0.33)),
            ("Blazer", "Navy blazer", (0.1, 0.15, 0.35)),
            ("Shoes", "Brown leather loafers", (0.45, 0.28, 0.15)),
            ("Belt", "Tan leather belt", (0.7, 0.5, 0.3)),
        ]
        let items = garments.map { label, name, rgb in
            WatchWeekSnapshot.Item(label: label, name: name, imageData: swatch(red: rgb.0, green: rgb.1, blue: rgb.2))
        }
        let days = (0..<7).map { dayOfWeek -> WatchWeekSnapshot.Day in
            let notGenerated = dayOfWeek == (today + 1) % 7
            let disabled = dayOfWeek == (today + 2) % 7
            return WatchWeekSnapshot.Day(
                dayOfWeek: dayOfWeek,
                enabled: !disabled,
                occasion: "business-casual",
                style: "classic",
                summary: notGenerated || disabled ? "" : "Sample office look",
                items: notGenerated || disabled ? [] : items
            )
        }
        return WatchWeekSnapshot(isSignedIn: true, days: days, updatedAt: now, morningRefreshMinutes: MorningRefreshTime.defaultMinutes)
    }

    private static func swatch(red: Double, green: Double, blue: Double) -> Data? {
        let renderer = ImageRenderer(content: Color(red: red, green: green, blue: blue).frame(width: 80, height: 80))
        return renderer.uiImage?.jpegData(compressionQuality: 0.7)
    }
}
#endif
