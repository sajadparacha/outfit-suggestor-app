//
//  WatchComplication.swift
//  Shared by the watch widget extension (and the iPhone app for unit tests). No WidgetKit types here.
//
//  Builds the complication / Smart Stack timeline and text from the synced week snapshot.
//

import Foundation

enum WatchComplicationTimeline {
    struct Entry: Equatable {
        let date: Date
        /// 0 = Monday … 6 = Sunday.
        let dayOfWeek: Int
        let state: WatchTodayState
        let relevance: Double
    }

    static let dayCount = 7
    static let morningWindowMinutes = 4 * 60
    static let highRelevance = 1.0
    static let lowRelevance = 0.1

    /// An entry now, at the start and end of each morning window, and at each of the next 7 midnights.
    /// The plan repeats weekly by weekday, so one snapshot covers the whole timeline without network.
    static func entries(
        snapshot: WatchWeekSnapshot?,
        now: Date,
        calendar: Calendar = .current
    ) -> [Entry] {
        let morningStart = snapshot?.morningRefreshMinutes ?? MorningRefreshTime.defaultMinutes
        let today = calendar.startOfDay(for: now)
        var dates: Set<Date> = [now]
        for offset in 0...dayCount {
            guard let day = calendar.date(byAdding: .day, value: offset, to: today) else { continue }
            if offset > 0 { dates.insert(day) }
            guard offset < dayCount,
                  let start = calendar.date(
                      bySettingHour: morningStart / 60, minute: morningStart % 60, second: 0, of: day
                  )
            else { continue }
            let end = start.addingTimeInterval(TimeInterval(morningWindowMinutes * 60))
            for date in [start, end] where date > now {
                dates.insert(date)
            }
        }
        return dates.sorted().map { date in
            let dayOfWeek = WatchWeekSnapshot.dayOfWeek(for: date, calendar: calendar)
            let state = WatchTodayState.resolve(snapshot: snapshot, dayOfWeek: dayOfWeek)
            return Entry(
                date: date,
                dayOfWeek: dayOfWeek,
                state: state,
                relevance: relevance(state: state, at: date, morningStartMinutes: morningStart, calendar: calendar)
            )
        }
    }

    /// High while getting dressed (morning window) on days with an outfit; low otherwise.
    static func relevance(
        state: WatchTodayState,
        at date: Date,
        morningStartMinutes: Int,
        calendar: Calendar = .current
    ) -> Double {
        guard case .outfit = state else { return lowRelevance }
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        let minutes = (parts.hour ?? 0) * 60 + (parts.minute ?? 0)
        let sinceStart = (minutes - morningStartMinutes + 24 * 60) % (24 * 60)
        return sinceStart < morningWindowMinutes ? highRelevance : lowRelevance
    }
}

enum WatchComplicationText {
    static let nameLimit = 18
    static let cornerLimit = 12
    static let thumbnailLimit = 4

    struct Rectangular: Equatable {
        let title: String
        let lines: [String]
    }

    static func truncate(_ text: String, limit: Int) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count > limit else { return trimmed }
        return String(trimmed.prefix(limit - 1)).trimmingCharacters(in: .whitespaces) + "…"
    }

    static func rectangular(state: WatchTodayState, dayOfWeek: Int, calendar: Calendar = .current) -> Rectangular {
        let dayName = WatchCopy.dayName(for: dayOfWeek, calendar: calendar)
        switch state {
        case .outfit(let day):
            let lines = day.items.isEmpty
                ? [day.summary]
                : day.items.prefix(2).map { truncate($0.name, limit: nameLimit) }
            return Rectangular(title: dayName, lines: lines)
        case .notGenerated:
            return Rectangular(title: dayName, lines: [WatchCopy.notGeneratedTitle])
        case .nothingPlanned:
            return Rectangular(title: dayName, lines: [WatchCopy.nothingPlannedTitle])
        case .signedOut:
            return Rectangular(title: WatchCopy.todayTitle, lines: [WatchCopy.signedOutTitle])
        case .waitingForPhone:
            return Rectangular(title: WatchCopy.todayTitle, lines: [WatchCopy.waitingTitle])
        }
    }

    /// Items with a picture, in wearing order, for the rectangular widget. Empty → show text lines instead.
    static func thumbnailItems(state: WatchTodayState) -> [WatchWeekSnapshot.Item] {
        guard case .outfit(let day) = state else { return [] }
        return Array(day.items.filter { $0.imageData != nil }.prefix(thumbnailLimit))
    }

    /// "Today: Navy blazer · Charcoal trousers".
    static func inline(state: WatchTodayState) -> String {
        "\(WatchCopy.todayTitle): " + inlineDetail(state: state)
    }

    static func corner(state: WatchTodayState) -> String {
        switch state {
        case .outfit(let day):
            return truncate(day.items.first?.name ?? day.summary, limit: cornerLimit)
        default:
            return truncate(shortLabel(state: state), limit: cornerLimit)
        }
    }

    static func symbol(state: WatchTodayState) -> String {
        switch state {
        case .outfit: return "hanger"
        case .notGenerated: return "sparkles"
        case .nothingPlanned: return "calendar"
        case .signedOut: return "person.crop.circle"
        case .waitingForPhone: return "iphone"
        }
    }

    private static func inlineDetail(state: WatchTodayState) -> String {
        guard case .outfit(let day) = state else { return shortLabel(state: state) }
        guard !day.items.isEmpty else { return truncate(day.summary, limit: nameLimit) }
        return day.items.prefix(2).map { truncate($0.name, limit: nameLimit) }.joined(separator: " · ")
    }

    private static func shortLabel(state: WatchTodayState) -> String {
        switch state {
        case .outfit: return ""
        case .notGenerated: return WatchCopy.shortNotGenerated
        case .nothingPlanned: return WatchCopy.shortNothingPlanned
        case .signedOut: return WatchCopy.signedOutTitle
        case .waitingForPhone: return WatchCopy.shortWaiting
        }
    }
}
