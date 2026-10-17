//
//  WatchReminder.swift
//  Shared by OutfitSuggestor (iPhone) and OutfitSuggestorWatch.
//
//  "Today's outfit" reminder: notification category, day lookup and the watch's custom notification content.
//

import Foundation
import UserNotifications

enum WatchReminder {
    static let categoryIdentifier = "WEEK_PLAN_TODAY"
    static let dayOfWeekUserInfoKey = "week_plan_day_of_week"
    static let identifierPrefix = "week-plan.day."
    static let maxItems = 4

    static var category: UNNotificationCategory {
        UNNotificationCategory(identifier: categoryIdentifier, actions: [], intentIdentifiers: [], options: [])
    }

    /// Backend day (0 = Monday … 6 = Sunday) from the reminder's user info, else from its identifier.
    static func dayOfWeek(userInfo: [AnyHashable: Any], identifier: String? = nil) -> Int? {
        if let day = userInfo[dayOfWeekUserInfoKey] as? Int, (0...6).contains(day) {
            return day
        }
        if let identifier, identifier.hasPrefix(identifierPrefix),
           let day = Int(identifier.dropFirst(identifierPrefix.count)), (0...6).contains(day) {
            return day
        }
        return nil
    }

    enum Content: Equatable {
        case outfit(dayName: String, context: String, items: [WatchWeekSnapshot.Item], summary: String)
        /// The notification's own title and body, when the snapshot has no outfit for that day.
        case plain(title: String, body: String)
    }

    static func content(
        snapshot: WatchWeekSnapshot?,
        dayOfWeek: Int?,
        title: String,
        body: String,
        calendar: Calendar = .current
    ) -> Content {
        guard let dayOfWeek,
              case .outfit(let day) = WatchTodayState.resolve(snapshot: snapshot, dayOfWeek: dayOfWeek)
        else { return .plain(title: title, body: body) }
        return .outfit(
            dayName: WatchCopy.dayName(for: dayOfWeek, calendar: calendar),
            context: WatchCopy.contextLine(for: day),
            items: Array(day.items.prefix(maxItems)),
            summary: day.summary
        )
    }
}
