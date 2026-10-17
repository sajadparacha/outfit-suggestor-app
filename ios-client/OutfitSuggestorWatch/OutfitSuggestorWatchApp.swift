//
//  OutfitSuggestorWatchApp.swift
//  OutfitSuggestorWatch
//
//  Apple Watch companion: shows today's Week Planner outfit synced from the iPhone.
//

import SwiftUI

@main
struct OutfitSuggestorWatchApp: App {
    @WKApplicationDelegateAdaptor(WatchAppDelegate.self) private var appDelegate
    @StateObject private var store = WatchSnapshotStore.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            TodayOutfitView(snapshot: store.snapshot)
                .environmentObject(store)
                .onAppear {
                    #if DEBUG
                    store.seedSampleIfRequested()
                    #endif
                    store.activate()
                }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { store.requestRefresh() }
        }

        WKNotificationScene(controller: WatchNotificationController.self, category: WatchReminder.categoryIdentifier)
    }
}
