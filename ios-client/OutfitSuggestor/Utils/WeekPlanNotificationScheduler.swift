//
//  WeekPlanNotificationScheduler.swift
//  OutfitSuggestor
//
//  Schedules local notifications for upcoming week-plan days at reminder_time.
//

import Foundation
import UserNotifications

struct WeekPlanScheduledNotification: Equatable {
    let identifier: String
    let title: String
    let body: String
    /// Seconds from reference `now` until fire (for tests); absolute date for production.
    let fireDate: Date
    let dayOfWeek: Int
}

protocol WeekPlanNotificationCenterProtocol {
    func requestAuthorization(options: UNAuthorizationOptions) async throws -> Bool
    func pendingNotificationRequests() async -> [UNNotificationRequest]
    func add(_ request: UNNotificationRequest) async throws
    func removePendingNotificationRequests(withIdentifiers identifiers: [String])
    func removeAllPendingWeekPlanNotifications()
}

extension UNUserNotificationCenter: WeekPlanNotificationCenterProtocol {
    func pendingNotificationRequests() async -> [UNNotificationRequest] {
        await withCheckedContinuation { continuation in
            getPendingNotificationRequests { requests in
                continuation.resume(returning: requests)
            }
        }
    }

    func add(_ request: UNNotificationRequest) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            add(request) { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    func removeAllPendingWeekPlanNotifications() {
        getPendingNotificationRequests { requests in
            let ids = requests
                .map(\.identifier)
                .filter { $0.hasPrefix(WeekPlanNotificationScheduler.idPrefix) }
            self.removePendingNotificationRequests(withIdentifiers: ids)
        }
    }
}

/// Device-local “Today’s outfit” reminder preferences (notifications only fire on this device).
struct WeekPlanReminderSettings {
    static let enabledKey = "weekPlanReminder.enabled"
    static let timeKey = "weekPlanReminder.time"

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    var isEnabled: Bool {
        get { defaults.object(forKey: Self.enabledKey) as? Bool ?? true }
        nonmutating set { defaults.set(newValue, forKey: Self.enabledKey) }
    }

    /// `HH:mm`; falls back to the default when unset or malformed.
    var time: String {
        get {
            if let stored = defaults.string(forKey: Self.timeKey),
               WeekPlanNotificationScheduler.parseReminderTime(stored) != nil {
                return stored
            }
            return WeekPlanConstants.defaultReminderTime
        }
        nonmutating set {
            guard WeekPlanNotificationScheduler.parseReminderTime(newValue) != nil else { return }
            defaults.set(newValue, forKey: Self.timeKey)
        }
    }

    static func date(fromTime time: String, calendar: Calendar = .current, reference: Date = Date()) -> Date {
        let parsed = WeekPlanNotificationScheduler.parseReminderTime(time)
            ?? WeekPlanNotificationScheduler.parseReminderTime(WeekPlanConstants.defaultReminderTime)!
        return calendar.date(
            bySettingHour: parsed.hour,
            minute: parsed.minute,
            second: 0,
            of: reference
        ) ?? reference
    }

    static func timeString(from date: Date, calendar: Calendar = .current) -> String {
        let comps = calendar.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", comps.hour ?? 0, comps.minute ?? 0)
    }
}

enum WeekPlanNotificationScheduler {
    static let idPrefix = "week-plan.day."
    static let title = "Today’s outfit"
    static let dayOfWeekUserInfoKey = "week_plan_day_of_week"

    static func identifier(for dayOfWeek: Int) -> String {
        "\(idPrefix)\(dayOfWeek)"
    }

    /// Backend day (0=Mon … 6=Sun) for a tapped reminder, or nil if it isn’t a week-plan reminder.
    static func dayOfWeek(fromUserInfo userInfo: [AnyHashable: Any], identifier: String? = nil) -> Int? {
        if let day = userInfo[dayOfWeekUserInfoKey] as? Int, (0...6).contains(day) {
            return day
        }
        if let identifier, identifier.hasPrefix(idPrefix),
           let day = Int(identifier.dropFirst(idPrefix.count)), (0...6).contains(day) {
            return day
        }
        return nil
    }

    /// Builds notification payloads for enabled days that have an outfit summary.
    /// Does not touch the notification center — used by tests and `reschedule`.
    static func buildSchedules(
        for plan: WeekPlanResponse,
        reminderTime: String? = nil,
        now: Date = Date(),
        calendar: Calendar = .current
    ) -> [WeekPlanScheduledNotification] {
        guard let hourMinute = parseReminderTime(reminderTime ?? plan.reminder_time) else { return [] }

        var results: [WeekPlanScheduledNotification] = []
        for day in plan.days where day.enabled {
            let summary = day.outfit?.summary.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            guard !summary.isEmpty else { continue }
            guard let fireDate = nextFireDate(
                dayOfWeek: day.day_of_week,
                hour: hourMinute.hour,
                minute: hourMinute.minute,
                after: now,
                calendar: calendar
            ) else { continue }

            results.append(
                WeekPlanScheduledNotification(
                    identifier: identifier(for: day.day_of_week),
                    title: title,
                    body: summary,
                    fireDate: fireDate,
                    dayOfWeek: day.day_of_week
                )
            )
        }
        return results
    }

    /// Requests permission (if needed), cancels prior week-plan notifications, then schedules.
    /// Permission denied: cancels pending week-plan notifications and returns without throwing.
    @discardableResult
    static func reschedule(
        plan: WeekPlanResponse,
        reminderTime: String? = nil,
        center: WeekPlanNotificationCenterProtocol = UNUserNotificationCenter.current(),
        now: Date = Date(),
        calendar: Calendar = .current
    ) async -> [WeekPlanScheduledNotification] {
        await cancelAll(center: center)

        let granted: Bool
        do {
            granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return []
        }
        guard granted else { return [] }

        let schedules = buildSchedules(for: plan, reminderTime: reminderTime, now: now, calendar: calendar)
        for item in schedules {
            let content = UNMutableNotificationContent()
            content.title = item.title
            content.body = item.body
            content.sound = .default
            content.userInfo = [dayOfWeekUserInfoKey: item.dayOfWeek]

            let comps = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: item.fireDate)
            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            let request = UNNotificationRequest(identifier: item.identifier, content: content, trigger: trigger)
            do {
                try await center.add(request)
            } catch {
                // Keep UI working; skip failed individual schedules.
                continue
            }
        }
        return schedules
    }

    static func cancelAll(center: WeekPlanNotificationCenterProtocol = UNUserNotificationCenter.current()) async {
        let pending = await center.pendingNotificationRequests()
        let ids = pending
            .map(\.identifier)
            .filter { $0.hasPrefix(idPrefix) }
        if !ids.isEmpty {
            center.removePendingNotificationRequests(withIdentifiers: ids)
        }
        // Also clear via helper in case pending fetch races
        center.removeAllPendingWeekPlanNotifications()
    }

    static func parseReminderTime(_ value: String) -> (hour: Int, minute: Int)? {
        let parts = value.split(separator: ":")
        guard parts.count == 2,
              parts[0].count == 2,
              parts[1].count == 2,
              let hour = Int(parts[0]),
              let minute = Int(parts[1]),
              (0...23).contains(hour),
              (0...59).contains(minute) else { return nil }
        return (hour, minute)
    }

    /// Backend day_of_week: 0=Monday … 6=Sunday.
    /// Calendar weekday: 1=Sunday … 7=Saturday.
    static func calendarWeekday(fromBackendDay dayOfWeek: Int) -> Int {
        // Mon=0 → 2, … Sat=5 → 7, Sun=6 → 1
        (dayOfWeek + 2) % 7 == 0 ? 7 : (dayOfWeek + 2) % 7
    }

    static func backendDayOfWeek(from calendarWeekday: Int) -> Int {
        // Sun=1 → 6, Mon=2 → 0, … Sat=7 → 5
        (calendarWeekday + 5) % 7
    }

    static func nextFireDate(
        dayOfWeek: Int,
        hour: Int,
        minute: Int,
        after now: Date,
        calendar: Calendar = .current
    ) -> Date? {
        let targetWeekday = calendarWeekday(fromBackendDay: dayOfWeek)
        var comps = calendar.dateComponents([.year, .month, .day, .hour, .minute, .weekday], from: now)
        comps.hour = hour
        comps.minute = minute
        comps.second = 0

        guard let todayAtTime = calendar.date(from: comps) else { return nil }
        let currentWeekday = calendar.component(.weekday, from: now)

        if currentWeekday == targetWeekday, todayAtTime > now {
            return todayAtTime
        }

        var daysAhead = targetWeekday - currentWeekday
        if daysAhead <= 0 { daysAhead += 7 }
        guard let candidateDay = calendar.date(byAdding: .day, value: daysAhead, to: calendar.startOfDay(for: now)) else {
            return nil
        }
        var fireComps = calendar.dateComponents([.year, .month, .day], from: candidateDay)
        fireComps.hour = hour
        fireComps.minute = minute
        fireComps.second = 0
        return calendar.date(from: fireComps)
    }
}
