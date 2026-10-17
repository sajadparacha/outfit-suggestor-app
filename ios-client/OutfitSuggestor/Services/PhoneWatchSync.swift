//
//  PhoneWatchSync.swift
//  OutfitSuggestor
//
//  Sends the week-plan snapshot to the paired Apple Watch (WatchConnectivity application context),
//  answers refresh requests from the watch, and refreshes it in the background each morning.
//

import BackgroundTasks
import Foundation
import UIKit
import WatchConnectivity

protocol WatchSnapshotSending {
    func send(_ snapshot: WatchWeekSnapshot)
}

final class PhoneWatchSync: NSObject, WatchSnapshotSending {
    static let shared = PhoneWatchSync()

    /// Fetches a fresh snapshot without UI (watch request or background refresh).
    var fetchSnapshot: () async -> WatchWeekSnapshot? = { await WatchPlanRefresher.fetchSnapshot() }

    /// Latest snapshot; resent when the session activates or the watch app gets installed.
    private var latest: WatchWeekSnapshot?
    /// Days (with pictures) of the last file transfer; `updatedAt` alone changing must not resend pictures.
    private var lastTransferredDays: [WatchWeekSnapshot.Day]?
    private var lastTransferURL: URL?

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.delegate == nil else { return }
        session.delegate = self
        session.activate()
    }

    /// Call on the main thread.
    func send(_ snapshot: WatchWeekSnapshot) {
        latest = snapshot
        activate()
        flush()
    }

    private func flush() {
        guard WCSession.isSupported(), let latest else { return }
        let session = WCSession.default
        guard session.activationState == .activated,
              session.isPaired,
              session.isWatchAppInstalled,
              let context = try? latest.applicationContext() else { return }
        try? session.updateApplicationContext(context)
        transferPictures(of: latest, session: session)
    }

    private func transferPictures(of snapshot: WatchWeekSnapshot, session: WCSession) {
        guard snapshot.days.contains(where: { $0.items.contains { $0.imageData != nil } }),
              snapshot.days != lastTransferredDays,
              let data = try? snapshot.fileData() else { return }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("watch-week-\(UUID().uuidString).json")
        guard (try? data.write(to: url)) != nil else { return }
        session.outstandingFileTransfers.forEach { $0.cancel() }
        session.transferFile(url, metadata: [WatchWeekSnapshot.contextKey: true])
        lastTransferredDays = snapshot.days
        lastTransferURL = url
    }

    /// Saves the watch's chosen refresh time, reschedules, and returns the updated text-only snapshot.
    /// Call on the main thread.
    func applyMorningRefresh(minutes: Int, defaults: UserDefaults = .standard) -> [String: Any] {
        if WatchPlanRefresher.setRefreshMinutes(minutes, defaults: defaults) {
            WatchPlanRefresher.schedule()
            if let latest { send(latest.withMorningRefresh(minutes: minutes)) }
        }
        return (try? latest?.applicationContext()) ?? [:]
    }

    /// Fetches the plan and returns the text-only reply for the watch; pictures follow via `send`.
    func handleRefreshRequest() async -> [String: Any] {
        let fresh = await fetchSnapshot()
        return await MainActor.run {
            if let fresh { send(fresh) }
            return (try? (fresh ?? latest)?.applicationContext()) ?? [:]
        }
    }
}

extension PhoneWatchSync: WCSessionDelegate {
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        DispatchQueue.main.async { self.flush() }
    }

    func sessionWatchStateDidChange(_ session: WCSession) {
        DispatchQueue.main.async { self.flush() }
    }

    /// The watch asks for a fresh plan when it opens; iOS wakes this app in the background if needed.
    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        if let minutes = message[WatchWeekSnapshot.setMorningRefreshKey] as? Int {
            DispatchQueue.main.async { replyHandler(self.applyMorningRefresh(minutes: minutes)) }
            return
        }
        guard message[WatchWeekSnapshot.refreshRequestKey] != nil else {
            replyHandler([:])
            return
        }
        Task {
            let backgroundTask = await MainActor.run {
                UIApplication.shared.beginBackgroundTask(withName: "WatchPlanRefresh")
            }
            replyHandler(await handleRefreshRequest())
            await MainActor.run { UIApplication.shared.endBackgroundTask(backgroundTask) }
        }
    }

    /// Queued setting change sent while the iPhone was out of reach.
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        guard let minutes = userInfo[WatchWeekSnapshot.setMorningRefreshKey] as? Int else { return }
        DispatchQueue.main.async { _ = self.applyMorningRefresh(minutes: minutes) }
    }

    func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
        let url = fileTransfer.file.fileURL
        try? FileManager.default.removeItem(at: url)
        guard error != nil else { return }
        DispatchQueue.main.async {
            // Only a failure of the newest transfer should allow a resend; cancelled older ones are expected.
            guard url == self.lastTransferURL else { return }
            self.lastTransferredDays = nil
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        // Switching watches: reactivate so the newly paired watch gets the snapshot.
        session.activate()
    }
}

/// Loads the week plan without any UI so the watch stays current while the iPhone app is closed.
enum WatchPlanRefresher {
    static let taskIdentifier = "com.sajad.outfitsuggestor.watchRefresh"
    /// Morning refresh time (minutes after midnight), chosen on the watch in Settings.
    static let refreshMinutesKey = "watch.morningRefreshMinutes"

    static func refreshMinutes(defaults: UserDefaults = .standard) -> Int {
        guard let stored = defaults.object(forKey: refreshMinutesKey) as? Int,
              MorningRefreshTime.isValid(stored) else { return MorningRefreshTime.defaultMinutes }
        return stored
    }

    @discardableResult
    static func setRefreshMinutes(_ minutes: Int, defaults: UserDefaults = .standard) -> Bool {
        guard MorningRefreshTime.isValid(minutes) else { return false }
        defaults.set(minutes, forKey: refreshMinutesKey)
        return true
    }

    static func fetchSnapshot(
        token: () -> String? = { TokenStorage.load() },
        fetchPlan: () async throws -> WeekPlanResponse = { try await APIService.shared.getWeekPlan() },
        now: Date = Date()
    ) async -> WatchWeekSnapshot? {
        guard let token = token(), !token.isEmpty else { return .signedOut(at: now) }
        guard let plan = try? await fetchPlan() else { return nil }
        return WatchWeekSnapshotBuilder.make(plan: plan, now: now)
    }

    static func nextRefreshDate(
        after now: Date,
        minutes: Int = refreshMinutes(),
        calendar: Calendar = .current
    ) -> Date {
        calendar.nextDate(
            after: now,
            matching: DateComponents(hour: minutes / 60, minute: minutes % 60),
            matchingPolicy: .nextTime
        ) ?? now.addingTimeInterval(12 * 60 * 60)
    }

    /// Must be called before `application(_:didFinishLaunchingWithOptions:)` returns.
    static func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskIdentifier, using: nil) { task in
            guard let task = task as? BGAppRefreshTask else { return }
            handle(task)
        }
    }

    static func schedule(now: Date = Date()) {
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: taskIdentifier)
        let request = BGAppRefreshTaskRequest(identifier: taskIdentifier)
        request.earliestBeginDate = nextRefreshDate(after: now)
        try? BGTaskScheduler.shared.submit(request)
    }

    private static func handle(_ task: BGAppRefreshTask) {
        schedule()
        let work = Task {
            let snapshot = await PhoneWatchSync.shared.fetchSnapshot()
            if let snapshot {
                await MainActor.run { PhoneWatchSync.shared.send(snapshot) }
            }
            task.setTaskCompleted(success: snapshot != nil)
        }
        task.expirationHandler = { work.cancel() }
    }
}
