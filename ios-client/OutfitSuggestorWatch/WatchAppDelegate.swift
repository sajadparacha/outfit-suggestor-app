//
//  WatchAppDelegate.swift
//  OutfitSuggestorWatch
//
//  Registers the reminder category and opens the tapped reminder's day.
//

import UserNotifications
import WatchKit

final class WatchAppDelegate: NSObject, WKApplicationDelegate, UNUserNotificationCenterDelegate {
    func applicationDidFinishLaunching() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.setNotificationCategories([WatchReminder.category])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let request = response.notification.request
        guard let day = WatchReminder.dayOfWeek(userInfo: request.content.userInfo, identifier: request.identifier)
        else { return }
        await MainActor.run { WatchSnapshotStore.shared.focus(dayOfWeek: day) }
    }
}
