//
//  WatchWeekSnapshotTests.swift
//  OutfitSuggestorTests
//

import UIKit
import XCTest
@testable import OutfitSuggestor

final class WatchWeekSnapshotTests: XCTestCase {
    private var utcCalendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar
    }

    /// 2026-10-12 is a Monday.
    private func date(_ day: Int, hour: Int = 9) -> Date {
        utcCalendar.date(from: DateComponents(year: 2026, month: 10, day: day, hour: hour))!
    }

    private func planWithMonday(outfit: WeekPlanOutfitResponse?, enabled: Bool = true) -> WeekPlanResponse {
        var plan = WeekPlanResponse.empty(timezone: "UTC")
        plan.days[0].enabled = enabled
        plan.days[0].occasion = "business-casual"
        plan.days[0].style = "classic"
        plan.days[0].outfit = outfit
        return plan
    }

    // MARK: - Builder

    func testBuilderUsesShortNamesInWearingOrderAndSkipsEmptySlots() {
        let outfit = WeekPlanOutfitResponse(
            summary: "Smart office look",
            shirt: "Light blue oxford shirt — breathable cotton",
            trouser: "Charcoal chinos, slim fit",
            blazer: "none",
            shoes: "Brown leather loafers",
            belt: "",
            outerwear: "Navy wool coat"
        )

        let items = WatchWeekSnapshotBuilder.items(from: outfit)

        XCTAssertEqual(items.map(\.label), ["Shirt", "Trousers", MainFlowUxCopy.outerwearLabel, "Shoes"])
        XCTAssertEqual(
            items.map(\.name),
            ["Light blue oxford shirt", "Charcoal chinos", "Navy wool coat", "Brown leather loafers"]
        )
    }

    func testBuilderSortsDaysAndMarksSignedIn() {
        var plan = planWithMonday(outfit: nil)
        plan.days.reverse()

        let snapshot = WatchWeekSnapshotBuilder.make(plan: plan, now: date(12))

        XCTAssertTrue(snapshot.isSignedIn)
        XCTAssertEqual(snapshot.days.map(\.dayOfWeek), Array(0...6))
        XCTAssertEqual(snapshot.updatedAt, date(12))
    }

    // MARK: - Today state

    func testTodayShowsOutfitForMatchingWeekday() {
        let snapshot = WatchWeekSnapshotBuilder.make(
            plan: planWithMonday(outfit: WeekPlanOutfitResponse(summary: "Look", shirt: "White shirt"))
        )

        let state = WatchTodayState.resolve(snapshot: snapshot, now: date(12), calendar: utcCalendar)

        guard case .outfit(let day) = state else {
            return XCTFail("Expected outfit, got \(state)")
        }
        XCTAssertEqual(day.dayOfWeek, 0)
        XCTAssertEqual(WatchCopy.contextLine(for: day), "Business Casual · Classic")
    }

    func testTodayIsNothingPlannedOnOtherDaysOrWhenDisabled() {
        let planned = WatchWeekSnapshotBuilder.make(
            plan: planWithMonday(outfit: WeekPlanOutfitResponse(summary: "Look", shirt: "White shirt"))
        )
        let disabled = WatchWeekSnapshotBuilder.make(
            plan: planWithMonday(outfit: WeekPlanOutfitResponse(summary: "Look"), enabled: false)
        )

        XCTAssertEqual(WatchTodayState.resolve(snapshot: planned, now: date(13), calendar: utcCalendar), .nothingPlanned)
        XCTAssertEqual(WatchTodayState.resolve(snapshot: disabled, now: date(12), calendar: utcCalendar), .nothingPlanned)
    }

    func testTodayIsNotGeneratedWhenEnabledWithoutOutfit() {
        let snapshot = WatchWeekSnapshotBuilder.make(plan: planWithMonday(outfit: nil))

        let state = WatchTodayState.resolve(snapshot: snapshot, now: date(12), calendar: utcCalendar)

        guard case .notGenerated = state else {
            return XCTFail("Expected notGenerated, got \(state)")
        }
    }

    func testTodayHandlesMissingSnapshotAndSignedOut() {
        XCTAssertEqual(WatchTodayState.resolve(snapshot: nil, now: date(12)), .waitingForPhone)
        XCTAssertEqual(WatchTodayState.resolve(snapshot: .signedOut(), now: date(12)), .signedOut)
    }

    func testSundayMapsToBackendDaySix() {
        XCTAssertEqual(WatchWeekSnapshot.dayOfWeek(for: date(18), calendar: utcCalendar), 6)
        XCTAssertEqual(WatchWeekSnapshot.dayOfWeek(for: date(12), calendar: utcCalendar), 0)
    }

    // MARK: - Pictures

    private func base64JPEG(size: CGFloat = 800, color: UIColor = .systemBlue) -> String {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let image = UIGraphicsImageRenderer(size: CGSize(width: size, height: size), format: format).image { ctx in
            color.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))
        }
        return image.jpegData(compressionQuality: 0.9)!.base64EncodedString()
    }

    private func outfitWithWardrobeShirt() -> WeekPlanOutfitResponse {
        WeekPlanOutfitResponse(
            summary: "Look",
            shirt: "White shirt",
            trouser: "Grey chinos",
            shirt_id: 7,
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: [MatchingWardrobeItem(id: 7, category: "shirt", color: "white", description: nil, image_data: base64JPEG())],
                trouser: nil, blazer: nil, shoes: nil, belt: nil, sweater: nil, outerwear: nil, tie: nil
            )
        )
    }

    func testPicturesAreSentForEveryPlannedDay() {
        var plan = planWithMonday(outfit: outfitWithWardrobeShirt())
        plan.days[1].enabled = true
        plan.days[1].outfit = outfitWithWardrobeShirt()

        let snapshot = WatchWeekSnapshotBuilder.make(plan: plan, now: date(12))

        for day in snapshot.days.prefix(2) {
            XCTAssertNotNil(day.items.first { $0.label == "Shirt" }?.imageData)
            XCTAssertNil(day.items.first { $0.label == "Trousers" }?.imageData, "No wardrobe photo → no picture")
        }
    }

    func testApplicationContextIsTextOnlyButFileKeepsPictures() throws {
        let snapshot = WatchWeekSnapshotBuilder.make(plan: planWithMonday(outfit: outfitWithWardrobeShirt()), now: date(12))

        let fromContext = try XCTUnwrap(WatchWeekSnapshot.decode(applicationContext: try snapshot.applicationContext()))
        let fromFile = try XCTUnwrap(WatchWeekSnapshot.decode(fileData: try snapshot.fileData()))

        XCTAssertTrue(fromContext.days.allSatisfy { $0.items.allSatisfy { $0.imageData == nil } })
        XCTAssertEqual(fromFile, snapshot)
        XCTAssertEqual(fromContext, snapshot.withoutImages())
    }

    func testMergeKeepsPicturesOnlyForUnchangedItems() {
        let withPictures = WatchWeekSnapshotBuilder.make(plan: planWithMonday(outfit: outfitWithWardrobeShirt()), now: date(12))
        var changed = outfitWithWardrobeShirt()
        changed.shirt = "Black polo"
        let newerText = WatchWeekSnapshotBuilder.make(
            plan: planWithMonday(outfit: changed), now: date(13), includeImages: false
        )
        let sameText = withPictures.withoutImages()

        XCTAssertEqual(sameText.mergingImages(from: withPictures), withPictures)
        XCTAssertNil(newerText.mergingImages(from: withPictures).days[0].items.first { $0.label == "Shirt" }?.imageData)
    }

    // MARK: - Day navigation

    func testResolveByDayOfWeekShowsThatDay() {
        var plan = planWithMonday(outfit: WeekPlanOutfitResponse(summary: "Look", shirt: "White shirt"))
        plan.days[2].enabled = true
        let snapshot = WatchWeekSnapshotBuilder.make(plan: plan)

        guard case .outfit(let monday) = WatchTodayState.resolve(snapshot: snapshot, dayOfWeek: 0) else {
            return XCTFail("Expected Monday outfit")
        }
        XCTAssertEqual(monday.dayOfWeek, 0)
        XCTAssertEqual(WatchTodayState.resolve(snapshot: snapshot, dayOfWeek: 1), .nothingPlanned)
        guard case .notGenerated = WatchTodayState.resolve(snapshot: snapshot, dayOfWeek: 2) else {
            return XCTFail("Expected Wednesday not generated")
        }
    }

    func testDayTitlesAndCopyNameOtherDays() {
        var english = Calendar(identifier: .gregorian)
        english.locale = Locale(identifier: "en_US")

        XCTAssertEqual(WatchCopy.dayName(for: 0, calendar: english), "Monday")
        XCTAssertEqual(WatchCopy.dayName(for: 6, calendar: english), "Sunday")
        XCTAssertEqual(WatchCopy.dayTitle(for: 2, isToday: false, calendar: english), "Wed")
        XCTAssertEqual(WatchCopy.dayTitle(for: 2, isToday: true, calendar: english), WatchCopy.todayTitle)
        XCTAssertEqual(
            WatchCopy.nothingPlannedBody(dayName: "Friday", isToday: false),
            "Friday isn't in your Week Planner. Add it on your iPhone."
        )
        XCTAssertEqual(WatchCopy.notGeneratedBody(dayName: "Friday", isToday: true), WatchCopy.notGeneratedBody)
    }

    func testPicturesAreDownscaledWithinBudget() throws {
        let items = WatchWeekSnapshotBuilder.items(from: outfitWithWardrobeShirt(), includeImages: true)

        let data = try XCTUnwrap(items.first?.imageData)
        let image = try XCTUnwrap(UIImage(data: data))
        XCTAssertLessThanOrEqual(max(image.size.width, image.size.height) * image.scale, 320)
        XCTAssertLessThanOrEqual(data.count, WatchWeekSnapshotBuilder.imageBudgetBytes)
    }

    // MARK: - Refresh without opening the iPhone app

    private struct FetchFailed: Error {}

    func testRefreshFetchReturnsSignedOutWithoutToken() async {
        var fetched = false
        let snapshot = await WatchPlanRefresher.fetchSnapshot(
            token: { nil },
            fetchPlan: { fetched = true; return WeekPlanResponse.empty(timezone: "UTC") },
            now: date(12)
        )

        XCTAssertEqual(snapshot, .signedOut(at: date(12)))
        XCTAssertFalse(fetched, "No network call when signed out")
    }

    func testRefreshFetchReturnsNilWhenServerFails() async {
        let snapshot = await WatchPlanRefresher.fetchSnapshot(
            token: { "token" },
            fetchPlan: { throw FetchFailed() }
        )

        XCTAssertNil(snapshot, "Keep the watch's last snapshot instead of wiping it")
    }

    func testRefreshFetchBuildsSnapshotFromServerPlan() async {
        let plan = planWithMonday(outfit: WeekPlanOutfitResponse(summary: "Look", shirt: "White shirt"))

        let snapshot = await WatchPlanRefresher.fetchSnapshot(token: { "token" }, fetchPlan: { plan }, now: date(12))

        XCTAssertEqual(snapshot, WatchWeekSnapshotBuilder.make(plan: plan, now: date(12)))
    }

    func testBackgroundRefreshIsScheduledForNextMorning() {
        let five = MorningRefreshTime.defaultMinutes
        XCTAssertEqual(
            WatchPlanRefresher.nextRefreshDate(after: date(12, hour: 3), minutes: five, calendar: utcCalendar),
            date(12, hour: 5)
        )
        XCTAssertEqual(
            WatchPlanRefresher.nextRefreshDate(after: date(12, hour: 9), minutes: five, calendar: utcCalendar),
            date(13, hour: 5)
        )
    }

    // MARK: - Morning refresh setting (chosen on the watch)

    private func freshDefaults() -> UserDefaults {
        let name = "WatchWeekSnapshotTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: name)!
        addTeardownBlock { defaults.removePersistentDomain(forName: name) }
        return defaults
    }

    func testCustomRefreshTimeSchedulesAtThatTime() {
        let sixThirty = 6 * 60 + 30
        let expected = utcCalendar.date(from: DateComponents(year: 2026, month: 10, day: 13, hour: 6, minute: 30))!

        XCTAssertEqual(
            WatchPlanRefresher.nextRefreshDate(after: date(12, hour: 7), minutes: sixThirty, calendar: utcCalendar),
            expected
        )
    }

    func testRefreshMinutesDefaultsToFiveAndRejectsInvalidValues() {
        let defaults = freshDefaults()

        XCTAssertEqual(WatchPlanRefresher.refreshMinutes(defaults: defaults), 5 * 60)
        XCTAssertTrue(WatchPlanRefresher.setRefreshMinutes(7 * 60, defaults: defaults))
        XCTAssertEqual(WatchPlanRefresher.refreshMinutes(defaults: defaults), 7 * 60)
        XCTAssertFalse(WatchPlanRefresher.setRefreshMinutes(24 * 60, defaults: defaults))
        XCTAssertFalse(WatchPlanRefresher.setRefreshMinutes(-1, defaults: defaults))
        XCTAssertEqual(WatchPlanRefresher.refreshMinutes(defaults: defaults), 7 * 60)
    }

    func testRefreshTimeOptionsAndLabels() {
        XCTAssertEqual(MorningRefreshTime.options.count, 48)
        XCTAssertTrue(MorningRefreshTime.options.contains(MorningRefreshTime.defaultMinutes))

        let us = MorningRefreshTime.label(6 * 60 + 30, locale: Locale(identifier: "en_US"))
        XCTAssertTrue(us.hasPrefix("6:30"), us)
        XCTAssertTrue(us.hasSuffix("AM"), us)
        XCTAssertEqual(MorningRefreshTime.label(18 * 60, locale: Locale(identifier: "en_GB")), "18:00")
    }

    func testWatchSettingChangeIsSavedAndEchoedInSnapshot() throws {
        let defaults = freshDefaults()
        let sync = PhoneWatchSync()
        sync.send(WatchWeekSnapshotBuilder.make(
            plan: planWithMonday(outfit: WeekPlanOutfitResponse(summary: "Look", shirt: "White shirt")),
            now: date(12),
            morningRefreshMinutes: 5 * 60
        ))

        let reply = sync.applyMorningRefresh(minutes: 6 * 60 + 30, defaults: defaults)

        XCTAssertEqual(WatchPlanRefresher.refreshMinutes(defaults: defaults), 6 * 60 + 30)
        XCTAssertEqual(try XCTUnwrap(WatchWeekSnapshot.decode(applicationContext: reply)).morningRefreshMinutes, 6 * 60 + 30)
    }

    func testInvalidWatchSettingIsIgnored() throws {
        let defaults = freshDefaults()
        let sync = PhoneWatchSync()
        sync.send(WatchWeekSnapshotBuilder.make(plan: planWithMonday(outfit: nil), now: date(12), morningRefreshMinutes: 5 * 60))

        let reply = sync.applyMorningRefresh(minutes: 9_999, defaults: defaults)

        XCTAssertEqual(WatchPlanRefresher.refreshMinutes(defaults: defaults), 5 * 60)
        XCTAssertEqual(try XCTUnwrap(WatchWeekSnapshot.decode(applicationContext: reply)).morningRefreshMinutes, 5 * 60)
    }

    func testMorningRefreshSurvivesTextOnlyContext() throws {
        let snapshot = WatchWeekSnapshotBuilder.make(plan: planWithMonday(outfit: nil), now: date(12), morningRefreshMinutes: 420)

        let decoded = try XCTUnwrap(WatchWeekSnapshot.decode(applicationContext: try snapshot.applicationContext()))

        XCTAssertEqual(decoded.morningRefreshMinutes, 420)
    }

    func testWatchRefreshRequestRepliesWithFreshTextOnlySnapshot() async throws {
        let sync = PhoneWatchSync()
        let fresh = WatchWeekSnapshotBuilder.make(plan: planWithMonday(outfit: outfitWithWardrobeShirt()), now: date(12))
        sync.fetchSnapshot = { fresh }

        let reply = await sync.handleRefreshRequest()

        let decoded = try XCTUnwrap(WatchWeekSnapshot.decode(applicationContext: reply))
        XCTAssertEqual(decoded, fresh.withoutImages())
    }

    func testWatchRefreshRequestRepliesEmptyWhenNothingKnown() async {
        let sync = PhoneWatchSync()
        sync.fetchSnapshot = { nil }

        let reply = await sync.handleRefreshRequest()

        XCTAssertTrue(reply.isEmpty)
    }

    // MARK: - Transport

    func testApplicationContextRoundTrip() throws {
        let snapshot = WatchWeekSnapshotBuilder.make(
            plan: planWithMonday(outfit: WeekPlanOutfitResponse(summary: "Look", shirt: "White shirt")),
            now: date(12)
        )

        let decoded = WatchWeekSnapshot.decode(applicationContext: try snapshot.applicationContext())

        XCTAssertEqual(decoded, snapshot)
        XCTAssertNil(WatchWeekSnapshot.decode(applicationContext: [:]))
    }
}
