//
//  WatchReminderComplicationTests.swift
//  OutfitSuggestorTests
//

import XCTest
@testable import OutfitSuggestor

final class WatchReminderComplicationTests: XCTestCase {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        calendar.locale = Locale(identifier: "en_US")
        return calendar
    }

    /// 2026-10-12 is a Monday; 2026-10-18 is a Sunday.
    private func date(_ day: Int, hour: Int = 9, minute: Int = 0) -> Date {
        calendar.date(from: DateComponents(year: 2026, month: 10, day: day, hour: hour, minute: minute))!
    }

    private let garments = [
        WatchWeekSnapshot.Item(label: "Blazer", name: "Navy blazer"),
        WatchWeekSnapshot.Item(label: "Trousers", name: "Charcoal trousers"),
        WatchWeekSnapshot.Item(label: "Shoes", name: "Brown leather loafers"),
    ]

    /// Monday outfit, Tuesday enabled without outfit, every other day disabled.
    private func snapshot(
        mondayItems: [WatchWeekSnapshot.Item]? = nil,
        mondaySummary: String = "Office look",
        morningRefreshMinutes: Int? = nil
    ) -> WatchWeekSnapshot {
        let days = (0..<7).map { dayOfWeek in
            WatchWeekSnapshot.Day(
                dayOfWeek: dayOfWeek,
                enabled: dayOfWeek <= 1,
                occasion: "business-casual",
                style: "classic",
                summary: dayOfWeek == 0 ? mondaySummary : "",
                items: dayOfWeek == 0 ? (mondayItems ?? garments) : []
            )
        }
        return WatchWeekSnapshot(
            isSignedIn: true,
            days: days,
            updatedAt: date(12),
            morningRefreshMinutes: morningRefreshMinutes
        )
    }

    private func monday(_ snapshot: WatchWeekSnapshot) -> WatchWeekSnapshot.Day {
        snapshot.day(dayOfWeek: 0)!
    }

    // MARK: - Timeline

    func testTimelineStartsNowAndHasSevenMidnights() {
        let now = date(12, hour: 7, minute: 30)

        let entries = WatchComplicationTimeline.entries(snapshot: snapshot(), now: now, calendar: calendar)

        XCTAssertEqual(entries.first?.date, now)
        XCTAssertEqual(entries.map(\.date), entries.map(\.date).sorted())
        XCTAssertEqual(Set(entries.map(\.date)).count, entries.count)
        let midnights = entries.map(\.date).filter { $0 != now && $0 == calendar.startOfDay(for: $0) }
        XCTAssertEqual(midnights, (13...19).map { date($0, hour: 0) })
        XCTAssertEqual(entries.last?.date, date(19, hour: 0))
        // now + today's window end + 6 days × (start, end) + 7 midnights
        XCTAssertEqual(entries.count, 1 + 1 + 12 + 7)
    }

    func testTimelineSkipsMorningEntriesAlreadyPast() {
        let now = date(12, hour: 10)

        let entries = WatchComplicationTimeline.entries(snapshot: snapshot(), now: now, calendar: calendar)

        XCTAssertEqual(entries.filter { calendar.isDate($0.date, inSameDayAs: now) }.map(\.date), [now])
    }

    func testTimelineStatePerDayWithSundayAndMondayMapping() {
        let sundayEvening = date(18, hour: 20)
        let snapshot = snapshot()

        let entries = WatchComplicationTimeline.entries(snapshot: snapshot, now: sundayEvening, calendar: calendar)
        func entry(at date: Date) -> WatchComplicationTimeline.Entry? { entries.first { $0.date == date } }

        XCTAssertEqual(entry(at: sundayEvening)?.dayOfWeek, 6)
        XCTAssertEqual(entry(at: sundayEvening)?.state, .nothingPlanned)
        XCTAssertEqual(entry(at: date(19, hour: 0))?.dayOfWeek, 0)
        XCTAssertEqual(entry(at: date(19, hour: 0))?.state, .outfit(monday(snapshot)))
        XCTAssertEqual(entry(at: date(20, hour: 0))?.state, .notGenerated(snapshot.day(dayOfWeek: 1)!))
        XCTAssertEqual(entry(at: date(21, hour: 0))?.state, .nothingPlanned)
    }

    func testTimelineSignedOutAndWaitingApplyToEveryEntry() {
        let now = date(12)

        let signedOut = WatchComplicationTimeline.entries(snapshot: .signedOut(), now: now, calendar: calendar)
        let waiting = WatchComplicationTimeline.entries(snapshot: nil, now: now, calendar: calendar)

        XCTAssertFalse(signedOut.isEmpty)
        XCTAssertTrue(signedOut.allSatisfy { $0.state == .signedOut })
        XCTAssertTrue(waiting.allSatisfy { $0.state == .waitingForPhone })
    }

    // MARK: - Relevance

    func testRelevanceIsHighOnlyDuringMorningOnOutfitDays() {
        let entries = WatchComplicationTimeline.entries(
            snapshot: snapshot(), now: date(12, hour: 0, minute: 30), calendar: calendar
        )
        func relevance(_ date: Date) -> Double? { entries.first { $0.date == date }?.relevance }

        XCTAssertEqual(relevance(date(12, hour: 0, minute: 30)), WatchComplicationTimeline.lowRelevance)
        XCTAssertEqual(relevance(date(12, hour: 5)), WatchComplicationTimeline.highRelevance)
        XCTAssertEqual(relevance(date(12, hour: 9)), WatchComplicationTimeline.lowRelevance)
        XCTAssertEqual(relevance(date(13, hour: 5)), WatchComplicationTimeline.lowRelevance, "Not generated → low")
        XCTAssertEqual(relevance(date(14, hour: 5)), WatchComplicationTimeline.lowRelevance, "Not planned → low")
    }

    func testRelevanceFollowsCustomMorningRefreshTime() {
        let snapshot = snapshot(morningRefreshMinutes: 6 * 60 + 30)

        let entries = WatchComplicationTimeline.entries(snapshot: snapshot, now: date(12, hour: 1), calendar: calendar)
        func relevance(_ date: Date) -> Double? { entries.first { $0.date == date }?.relevance }

        XCTAssertEqual(relevance(date(12, hour: 6, minute: 30)), WatchComplicationTimeline.highRelevance)
        XCTAssertEqual(relevance(date(12, hour: 10, minute: 30)), WatchComplicationTimeline.lowRelevance)
        XCTAssertNil(relevance(date(12, hour: 5)))
        XCTAssertEqual(
            WatchComplicationTimeline.relevance(
                state: .outfit(monday(snapshot)), at: date(12, hour: 1), morningStartMinutes: 22 * 60, calendar: calendar
            ),
            WatchComplicationTimeline.highRelevance,
            "Window that starts late in the evening carries past midnight"
        )
    }

    // MARK: - Complication text

    func testOutfitTextPerFamily() {
        let state = WatchTodayState.outfit(monday(snapshot()))

        XCTAssertEqual(
            WatchComplicationText.rectangular(state: state, dayOfWeek: 0, calendar: calendar),
            .init(title: "Monday", lines: ["Navy blazer", "Charcoal trousers"])
        )
        XCTAssertEqual(WatchComplicationText.inline(state: state), "Today: Navy blazer · Charcoal trousers")
        XCTAssertEqual(WatchComplicationText.symbol(state: state), "hanger")
        XCTAssertEqual(WatchComplicationText.corner(state: state), "Navy blazer")
    }

    func testLongGarmentNamesAreTruncated() {
        let items = [
            WatchWeekSnapshot.Item(label: "Shirt", name: "Light blue oxford shirt with buttons"),
            WatchWeekSnapshot.Item(label: "Shoes", name: "Brown leather shoe"),
        ]
        let state = WatchTodayState.outfit(monday(snapshot(mondayItems: items)))

        XCTAssertEqual(WatchComplicationText.inline(state: state), "Today: Light blue oxford… · Brown leather shoe")
        XCTAssertEqual(
            WatchComplicationText.rectangular(state: state, dayOfWeek: 0, calendar: calendar).lines,
            ["Light blue oxford…", "Brown leather shoe"]
        )
        XCTAssertEqual(WatchComplicationText.corner(state: state), "Light blue…")
        XCTAssertEqual(WatchComplicationText.truncate("Brown leather shoe", limit: 18), "Brown leather shoe")
    }

    func testRectangularThumbnailsUsePicturesWhenAvailable() {
        let picture = Data([0xFF, 0xD8])
        let items = ["Shirt", "Trousers", "Sweater", "Blazer", "Shoes", "Belt"].enumerated().map { index, label in
            WatchWeekSnapshot.Item(label: label, name: label, imageData: index == 1 ? nil : picture)
        }

        let withPictures = WatchComplicationText.thumbnailItems(state: .outfit(monday(snapshot(mondayItems: items))))
        let textOnly = WatchComplicationText.thumbnailItems(state: .outfit(monday(snapshot())))

        XCTAssertEqual(withPictures.map(\.label), ["Shirt", "Sweater", "Blazer", "Shoes"], "Pictures only, wearing order, max 4")
        XCTAssertTrue(textOnly.isEmpty, "No pictures → text lines")
        XCTAssertTrue(WatchComplicationText.thumbnailItems(state: .nothingPlanned).isEmpty)
        XCTAssertTrue(WatchComplicationText.thumbnailItems(state: .notGenerated(snapshot().day(dayOfWeek: 1)!)).isEmpty)
    }

    func testSummaryOnlyOutfitFallsBackToSummary() {
        let state = WatchTodayState.outfit(monday(snapshot(mondayItems: [], mondaySummary: "Smart office look")))

        XCTAssertEqual(
            WatchComplicationText.rectangular(state: state, dayOfWeek: 0, calendar: calendar).lines,
            ["Smart office look"]
        )
        XCTAssertEqual(WatchComplicationText.inline(state: state), "Today: Smart office look")
        XCTAssertEqual(WatchComplicationText.corner(state: state), "Smart offic…")
    }

    func testStateTextReusesWatchCopy() {
        let tuesday = snapshot().day(dayOfWeek: 1)!
        let cases: [(WatchTodayState, Int, WatchComplicationText.Rectangular, String, String, String)] = [
            (.notGenerated(tuesday), 1, .init(title: "Tuesday", lines: [WatchCopy.notGeneratedTitle]),
             "Today: Generate", "Generate", "sparkles"),
            (.nothingPlanned, 2, .init(title: "Wednesday", lines: [WatchCopy.nothingPlannedTitle]),
             "Today: No plan", "No plan", "calendar"),
            (.signedOut, 2, .init(title: WatchCopy.todayTitle, lines: [WatchCopy.signedOutTitle]),
             "Today: Signed out", "Signed out", "person.crop.circle"),
            (.waitingForPhone, 2, .init(title: WatchCopy.todayTitle, lines: [WatchCopy.waitingTitle]),
             "Today: Open iPhone", "Open iPhone", "iphone"),
        ]

        for (state, dayOfWeek, rectangular, inline, corner, symbol) in cases {
            XCTAssertEqual(WatchComplicationText.rectangular(state: state, dayOfWeek: dayOfWeek, calendar: calendar), rectangular)
            XCTAssertEqual(WatchComplicationText.inline(state: state), inline)
            XCTAssertEqual(WatchComplicationText.corner(state: state), corner)
            XCTAssertEqual(WatchComplicationText.symbol(state: state), symbol)
        }
    }

    // MARK: - Reminder on the watch

    func testReminderDayLookup() {
        let key = WatchReminder.dayOfWeekUserInfoKey

        XCTAssertEqual(WatchReminder.dayOfWeek(userInfo: [key: 4]), 4)
        XCTAssertEqual(WatchReminder.dayOfWeek(userInfo: [key: NSNumber(value: 6)]), 6, "APNs JSON numbers")
        XCTAssertEqual(WatchReminder.dayOfWeek(userInfo: [:], identifier: "week-plan.day.3"), 3)
        XCTAssertNil(WatchReminder.dayOfWeek(userInfo: [key: 9]))
        XCTAssertNil(WatchReminder.dayOfWeek(userInfo: [:], identifier: "other.2"))
    }

    func testReminderShowsUpToFourGarmentsForThatDay() {
        let five = garments + [
            WatchWeekSnapshot.Item(label: "Shirt", name: "White shirt"),
            WatchWeekSnapshot.Item(label: "Belt", name: "Tan belt"),
        ]

        let content = WatchReminder.content(
            snapshot: snapshot(mondayItems: five), dayOfWeek: 0, title: "Today’s outfit", body: "Office look", calendar: calendar
        )

        XCTAssertEqual(
            content,
            .outfit(dayName: "Monday", context: "Business Casual · Classic", items: Array(five.prefix(4)), summary: "Office look")
        )
    }

    func testReminderFallsBackToTitleAndBody() {
        let plain = WatchReminder.Content.plain(title: "Today’s outfit", body: "Office look")
        func content(_ snapshot: WatchWeekSnapshot?, _ day: Int?) -> WatchReminder.Content {
            WatchReminder.content(snapshot: snapshot, dayOfWeek: day, title: "Today’s outfit", body: "Office look", calendar: calendar)
        }

        XCTAssertEqual(content(nil, 0), plain)
        XCTAssertEqual(content(snapshot(), nil), plain)
        XCTAssertEqual(content(snapshot(), 1), plain, "Not generated on the watch yet")
        XCTAssertEqual(content(snapshot(), 3), plain, "Day not in plan")
        XCTAssertEqual(content(.signedOut(), 0), plain)
    }

    // MARK: - App Group storage

    private func freshDefaults() -> UserDefaults {
        let name = "WatchReminderComplicationTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: name)!
        addTeardownBlock { defaults.removePersistentDomain(forName: name) }
        return defaults
    }

    func testStorageMigratesLegacySnapshotOnce() throws {
        let legacy = freshDefaults()
        let storage = WatchSnapshotStorage(defaults: freshDefaults())
        let snapshot = snapshot()
        legacy.set(try snapshot.fileData(), forKey: WatchSnapshotStorage.storageKey)

        XCTAssertTrue(storage.migrateIfNeeded(from: legacy))
        XCTAssertEqual(storage.load(), snapshot)
        XCTAssertNil(legacy.data(forKey: WatchSnapshotStorage.storageKey))
        XCTAssertFalse(storage.migrateIfNeeded(from: legacy))
    }

    func testStorageKeepsNewerSharedSnapshotOverLegacy() throws {
        let legacy = freshDefaults()
        let storage = WatchSnapshotStorage(defaults: freshDefaults())
        storage.save(snapshot())
        legacy.set(try WatchWeekSnapshot.signedOut().fileData(), forKey: WatchSnapshotStorage.storageKey)

        XCTAssertFalse(storage.migrateIfNeeded(from: legacy))
        XCTAssertEqual(storage.load(), snapshot())
        XCTAssertNil(legacy.data(forKey: WatchSnapshotStorage.storageKey))
    }

    // MARK: - Widget images

    private func cgImage(width: Int, height: Int) -> CGImage {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: CGSize(width: width, height: height), format: format).image { context in
            UIColor.red.setFill()
            context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        }.cgImage!
    }

    func testWidgetImageMatchesOnScreenPixelsAt2x() throws {
        let image = try XCTUnwrap(WidgetImage.fitted(cgImage(width: 128, height: 128), points: 33, fill: false))
        XCTAssertEqual(image.scale, 2)
        XCTAssertEqual(image.size, CGSize(width: 33, height: 33))
        XCTAssertEqual(image.cgImage?.width, 66)
        XCTAssertEqual(image.cgImage?.height, 66)
        XCTAssertEqual(image.cgImage?.colorSpace?.name, CGColorSpace.sRGB)
    }

    func testWidgetImageFillCropsNonSquarePictureToSquare() throws {
        let image = try XCTUnwrap(WidgetImage.fitted(cgImage(width: 72, height: 40), points: 30, fill: true))
        XCTAssertEqual(image.cgImage?.width, 60)
        XCTAssertEqual(image.cgImage?.height, 60)
    }

    func testWidgetImageRejectsEmptySize() {
        XCTAssertNil(WidgetImage.fitted(cgImage(width: 10, height: 10), points: 0, fill: true))
    }
}
