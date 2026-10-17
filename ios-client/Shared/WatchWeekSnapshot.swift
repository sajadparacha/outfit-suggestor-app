//
//  WatchWeekSnapshot.swift
//  Shared by OutfitSuggestor (iPhone) and OutfitSuggestorWatch.
//
//  Week plan snapshot the iPhone sends to Apple Watch via WatchConnectivity.
//

import Foundation

struct WatchWeekSnapshot: Codable, Equatable {
    struct Item: Codable, Equatable {
        let label: String
        let name: String
        /// Small JPEG; only sent for today's outfit to stay within the application-context size limit.
        var imageData: Data? = nil
    }

    struct Day: Codable, Equatable {
        /// 0 = Monday … 6 = Sunday (backend week-plan convention).
        let dayOfWeek: Int
        let enabled: Bool
        let occasion: String
        let style: String
        let summary: String
        let items: [Item]

        var hasOutfit: Bool {
            !items.isEmpty || !summary.isEmpty
        }
    }

    let isSignedIn: Bool
    let days: [Day]
    let updatedAt: Date
    /// Minutes after midnight of the iPhone's morning background refresh (the iPhone owns this setting).
    var morningRefreshMinutes: Int? = nil

    static let contextKey = "weekSnapshot"
    /// Watch → iPhone message asking for a freshly fetched plan.
    static let refreshRequestKey = "refreshWeekSnapshot"
    /// Watch → iPhone message/user info carrying a new morning refresh time (minutes after midnight).
    static let setMorningRefreshKey = "setMorningRefreshMinutes"

    func withMorningRefresh(minutes: Int) -> WatchWeekSnapshot {
        var copy = self
        copy.morningRefreshMinutes = minutes
        return copy
    }

    static func signedOut(at date: Date = Date()) -> WatchWeekSnapshot {
        WatchWeekSnapshot(isSignedIn: false, days: [], updatedAt: date)
    }

    /// Calendar weekday (1 = Sunday … 7 = Saturday) → backend day (0 = Monday … 6 = Sunday).
    static func dayOfWeek(for date: Date, calendar: Calendar = .current) -> Int {
        (calendar.component(.weekday, from: date) + 5) % 7
    }

    func day(for date: Date, calendar: Calendar = .current) -> Day? {
        let target = Self.dayOfWeek(for: date, calendar: calendar)
        return days.first { $0.dayOfWeek == target }
    }

    func day(dayOfWeek: Int) -> Day? {
        days.first { $0.dayOfWeek == dayOfWeek }
    }

    /// Text only — pictures travel separately as a file transfer (application context has a small size limit).
    func applicationContext() throws -> [String: Any] {
        [Self.contextKey: try JSONEncoder().encode(withoutImages())]
    }

    static func decode(applicationContext context: [String: Any]) -> WatchWeekSnapshot? {
        guard let data = context[contextKey] as? Data else { return nil }
        return decode(fileData: data)
    }

    func fileData() throws -> Data {
        try JSONEncoder().encode(self)
    }

    static func decode(fileData data: Data) -> WatchWeekSnapshot? {
        try? JSONDecoder().decode(WatchWeekSnapshot.self, from: data)
    }

    func withoutImages() -> WatchWeekSnapshot {
        mapItems { _, item in
            var copy = item
            copy.imageData = nil
            return copy
        }
    }

    /// Keeps pictures from `older` for items that are unchanged (same day, label and name) but arrived without one.
    func mergingImages(from older: WatchWeekSnapshot?) -> WatchWeekSnapshot {
        guard let older else { return self }
        return mapItems { dayOfWeek, item in
            guard item.imageData == nil,
                  let match = older.day(dayOfWeek: dayOfWeek)?.items.first(where: {
                      $0.label == item.label && $0.name == item.name
                  })
            else { return item }
            var copy = item
            copy.imageData = match.imageData
            return copy
        }
    }

    private func mapItems(_ transform: (Int, Item) -> Item) -> WatchWeekSnapshot {
        WatchWeekSnapshot(
            isSignedIn: isSignedIn,
            days: days.map { day in
                Day(
                    dayOfWeek: day.dayOfWeek,
                    enabled: day.enabled,
                    occasion: day.occasion,
                    style: day.style,
                    summary: day.summary,
                    items: day.items.map { transform(day.dayOfWeek, $0) }
                )
            },
            updatedAt: updatedAt,
            morningRefreshMinutes: morningRefreshMinutes
        )
    }
}

/// What the watch "Today" screen shows for a snapshot at a given moment.
enum WatchTodayState: Equatable {
    case waitingForPhone
    case signedOut
    case nothingPlanned
    case notGenerated(WatchWeekSnapshot.Day)
    case outfit(WatchWeekSnapshot.Day)

    static func resolve(
        snapshot: WatchWeekSnapshot?,
        now: Date,
        calendar: Calendar = .current
    ) -> WatchTodayState {
        resolve(snapshot: snapshot, dayOfWeek: WatchWeekSnapshot.dayOfWeek(for: now, calendar: calendar))
    }

    static func resolve(snapshot: WatchWeekSnapshot?, dayOfWeek: Int) -> WatchTodayState {
        guard let snapshot else { return .waitingForPhone }
        guard snapshot.isSignedIn else { return .signedOut }
        guard let day = snapshot.day(dayOfWeek: dayOfWeek), day.enabled else {
            return .nothingPlanned
        }
        return day.hasOutfit ? .outfit(day) : .notGenerated(day)
    }
}

/// Morning refresh time choices, stored as minutes after midnight.
enum MorningRefreshTime {
    static let defaultMinutes = 5 * 60
    static let stepMinutes = 30
    static let options: [Int] = Array(stride(from: 0, to: 24 * 60, by: stepMinutes))

    static func isValid(_ minutes: Int) -> Bool {
        (0..<(24 * 60)).contains(minutes)
    }

    /// `390` → "6:30 AM" (or "06:30" in 24-hour locales).
    static func label(_ minutes: Int, locale: Locale = .current) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let date = calendar.date(from: DateComponents(year: 2001, month: 1, day: 1, hour: minutes / 60, minute: minutes % 60))!
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.locale = locale
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

enum WatchCopy {
    static let todayTitle = "Today"
    static let settingsTitle = "Settings"
    static let morningRefreshTitle = "Morning refresh"
    static let morningRefreshFooter =
        "Your iPhone fetches the week plan around this time each day so it's ready on your watch. iOS may run it a little later."
    static let waitingTitle = "Open your iPhone"
    static let waitingBody = "Open Week Planner in Outfit Suggestor on your iPhone to send your outfits here."
    static let signedOutTitle = "Signed out"
    static let signedOutBody = "Sign in on your iPhone to see today's outfit."
    static let nothingPlannedTitle = "No outfit planned"
    static let nothingPlannedBody = "Today isn't in your Week Planner. Add it on your iPhone."
    static let notGeneratedTitle = "Not generated yet"
    static let notGeneratedBody = "Generate today's outfit in Week Planner on your iPhone."
    /// Short state labels for small complications (inline, corner).
    static let shortNotGenerated = "Generate"
    static let shortNothingPlanned = "No plan"
    static let shortWaiting = "Open iPhone"

    /// Backend day (0 = Monday … 6 = Sunday) → localized weekday name.
    static func dayName(for dayOfWeek: Int, calendar: Calendar = .current) -> String {
        calendar.weekdaySymbols[(dayOfWeek + 1) % 7]
    }

    static func dayTitle(for dayOfWeek: Int, isToday: Bool, calendar: Calendar = .current) -> String {
        isToday ? todayTitle : String(dayName(for: dayOfWeek, calendar: calendar).prefix(3))
    }

    static func nothingPlannedBody(dayName: String, isToday: Bool) -> String {
        isToday ? nothingPlannedBody : "\(dayName) isn't in your Week Planner. Add it on your iPhone."
    }

    static func notGeneratedBody(dayName: String, isToday: Bool) -> String {
        isToday ? notGeneratedBody : "Generate \(dayName)'s outfit in Week Planner on your iPhone."
    }

    /// `business-casual` / `smart_casual` → `Business Casual`.
    static func displayLabel(_ raw: String) -> String {
        raw.replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: "-", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .capitalized
    }

    static func contextLine(for day: WatchWeekSnapshot.Day) -> String {
        [day.occasion, day.style]
            .map(displayLabel)
            .filter { !$0.isEmpty }
            .joined(separator: " · ")
    }
}
