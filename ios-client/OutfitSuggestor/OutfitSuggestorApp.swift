//
//  OutfitSuggestorApp.swift
//  OutfitSuggestor
//
//  Main app entry point. RootView shows Login/Register when not authenticated,
//  then MainTabView (Suggest, History, Wardrobe, Settings, About) when logged in.
//

import GoogleSignIn
import SwiftUI
import UserNotifications

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let request = response.notification.request
        guard let day = WeekPlanNotificationScheduler.dayOfWeek(
            fromUserInfo: request.content.userInfo,
            identifier: request.identifier
        ) else { return }
        await MainActor.run {
            RouteCoordinator.shared.openWeekPlanReminder(dayOfWeek: day)
        }
    }
}

@main
struct OutfitSuggestorApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            RootView()
                .onOpenURL { url in
                    if GIDSignIn.sharedInstance.handle(url) {
                        return
                    }
                    RouteCoordinator.shared.handleOpenURL(url)
                }
        }
    }
}
