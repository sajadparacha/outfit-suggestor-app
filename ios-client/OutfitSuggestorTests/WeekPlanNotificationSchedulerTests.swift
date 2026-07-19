//
//  WeekPlanNotificationSchedulerTests.swift
//  OutfitSuggestorTests
//

import XCTest
import UserNotifications
@testable import OutfitSuggestor

final class WeekPlanNotificationSchedulerTests: XCTestCase {

    private final class MockCenter: WeekPlanNotificationCenterProtocol {
        var authorizationGranted = true
        var authorizationThrows = false
        var authorizationCallCount = 0
        var addedRequests: [UNNotificationRequest] = []
        var removedIdentifiers: [[String]] = []
        var removeAllWeekPlanCallCount = 0
        var pending: [UNNotificationRequest] = []

        func requestAuthorization(options: UNAuthorizationOptions) async throws -> Bool {
            authorizationCallCount += 1
            if authorizationThrows {
                throw NSError(domain: "test", code: 1)
            }
            return authorizationGranted
        }

        func pendingNotificationRequests() async -> [UNNotificationRequest] {
            pending
        }

        func add(_ request: UNNotificationRequest) async throws {
            addedRequests.append(request)
            pending.append(request)
        }

        func removePendingNotificationRequests(withIdentifiers identifiers: [String]) {
            removedIdentifiers.append(identifiers)
            pending.removeAll { identifiers.contains($0.identifier) }
        }

        func removeAllPendingWeekPlanNotifications() {
            removeAllWeekPlanCallCount += 1
            pending.removeAll { $0.identifier.hasPrefix(WeekPlanNotificationScheduler.idPrefix) }
        }
    }

    func testBuildSchedulesUsesOutfitSummaryAndReminderTime() {
        var plan = WeekPlanResponse.empty(timezone: "UTC")
        plan.reminder_time = "07:30"
        plan.days[0].enabled = true
        plan.days[0].outfit = WeekPlanOutfitResponse(summary: "Blue shirt and grey trousers")
        plan.days[1].enabled = true
        // enabled but no outfit → skipped
        plan.days[2].enabled = false
        plan.days[2].outfit = WeekPlanOutfitResponse(summary: "Should skip")

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let now = calendar.date(from: DateComponents(year: 2026, month: 7, day: 20, hour: 9, minute: 0))! // Monday

        let schedules = WeekPlanNotificationScheduler.buildSchedules(for: plan, now: now, calendar: calendar)

        XCTAssertEqual(schedules.count, 1)
        XCTAssertEqual(schedules[0].identifier, "week-plan.day.0")
        XCTAssertEqual(schedules[0].title, WeekPlanNotificationScheduler.title)
        XCTAssertEqual(schedules[0].body, "Blue shirt and grey trousers")
        XCTAssertEqual(schedules[0].dayOfWeek, 0)

        let fireComps = calendar.dateComponents([.weekday, .hour, .minute], from: schedules[0].fireDate)
        XCTAssertEqual(fireComps.weekday, 2) // Monday
        XCTAssertEqual(fireComps.hour, 7)
        XCTAssertEqual(fireComps.minute, 30)
        // Monday 07:30 already passed → next Monday
        XCTAssertGreaterThan(schedules[0].fireDate, now)
    }

    func testReschedulePermissionDeniedDoesNotAddAndDoesNotThrow() async {
        let center = MockCenter()
        center.authorizationGranted = false
        var plan = WeekPlanResponse.empty()
        plan.days[0].enabled = true
        plan.days[0].outfit = WeekPlanOutfitResponse(summary: "Any")

        let result = await WeekPlanNotificationScheduler.reschedule(plan: plan, center: center)

        XCTAssertTrue(result.isEmpty)
        XCTAssertTrue(center.addedRequests.isEmpty)
        XCTAssertEqual(center.authorizationCallCount, 1)
        XCTAssertGreaterThanOrEqual(center.removeAllWeekPlanCallCount, 1)
    }

    func testReschedulePermissionGrantedAddsExpectedContent() async throws {
        let center = MockCenter()
        center.authorizationGranted = true
        var plan = WeekPlanResponse.empty(timezone: "UTC")
        plan.reminder_time = "08:00"
        plan.days[3].enabled = true
        plan.days[3].outfit = WeekPlanOutfitResponse(summary: "Thursday look")

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let now = calendar.date(from: DateComponents(year: 2026, month: 7, day: 20, hour: 9, minute: 0))!

        let result = await WeekPlanNotificationScheduler.reschedule(
            plan: plan,
            center: center,
            now: now,
            calendar: calendar
        )

        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(center.addedRequests.count, 1)
        let request = try XCTUnwrap(center.addedRequests.first)
        XCTAssertEqual(request.identifier, "week-plan.day.3")
        XCTAssertEqual(request.content.title, WeekPlanNotificationScheduler.title)
        XCTAssertEqual(request.content.body, "Thursday look")
    }

    func testAuthorizationErrorIsSwallowed() async {
        let center = MockCenter()
        center.authorizationThrows = true
        var plan = WeekPlanResponse.empty()
        plan.days[0].enabled = true
        plan.days[0].outfit = WeekPlanOutfitResponse(summary: "X")

        let result = await WeekPlanNotificationScheduler.reschedule(plan: plan, center: center)
        XCTAssertTrue(result.isEmpty)
        XCTAssertTrue(center.addedRequests.isEmpty)
    }

    func testBackendDayToCalendarWeekdayMapping() {
        XCTAssertEqual(WeekPlanNotificationScheduler.calendarWeekday(fromBackendDay: 0), 2) // Mon
        XCTAssertEqual(WeekPlanNotificationScheduler.calendarWeekday(fromBackendDay: 5), 7) // Sat
        XCTAssertEqual(WeekPlanNotificationScheduler.calendarWeekday(fromBackendDay: 6), 1) // Sun
        XCTAssertEqual(WeekPlanNotificationScheduler.backendDayOfWeek(from: 1), 6)
        XCTAssertEqual(WeekPlanNotificationScheduler.backendDayOfWeek(from: 2), 0)
    }

    func testParseReminderTime() {
        XCTAssertEqual(WeekPlanNotificationScheduler.parseReminderTime("07:30")?.hour, 7)
        XCTAssertEqual(WeekPlanNotificationScheduler.parseReminderTime("07:30")?.minute, 30)
        XCTAssertNil(WeekPlanNotificationScheduler.parseReminderTime("7:30"))
        XCTAssertNil(WeekPlanNotificationScheduler.parseReminderTime("25:00"))
    }
}
