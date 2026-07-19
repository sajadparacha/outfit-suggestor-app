//
//  WeekPlannerViewModelTests.swift
//  OutfitSuggestorTests
//

import XCTest
@testable import OutfitSuggestor

@MainActor
final class WeekPlannerViewModelTests: XCTestCase {

    private final class MockAPI: WeekPlanAPIClient {
        var plan = WeekPlanResponse.empty(timezone: "UTC")
        var today = WeekPlanTodayResponse(
            day_of_week: 0,
            enabled: false,
            occasion: nil,
            outfit: nil,
            reminder_time: "07:30",
            timezone: "UTC",
            has_plan: false,
            message: "No week plan yet."
        )
        var putBodies: [WeekPlanUpsertRequest] = []
        var generateCalls: [Int?] = []
        var deleteCount = 0
        var getCount = 0
        var shouldFailGenerate = false
        var wardrobeEmptyOnGenerate = false

        func getWeekPlan() async throws -> WeekPlanResponse {
            getCount += 1
            return plan
        }

        func putWeekPlan(_ body: WeekPlanUpsertRequest) async throws -> WeekPlanResponse {
            putBodies.append(body)
            plan.reminder_time = body.reminder_time
            plan.timezone = body.timezone
            plan.shared_style = body.shared_style
            plan.shared_season = body.shared_season
            plan.days = body.days.map { input in
                WeekPlanDayResponse(
                    day_of_week: input.day_of_week,
                    enabled: input.enabled,
                    occasion: input.occasion,
                    style: input.style,
                    use_wardrobe_only: input.use_wardrobe_only,
                    outfit: plan.days.first(where: { $0.day_of_week == input.day_of_week })?.outfit
                )
            }
            return plan
        }

        func generateWeekPlan(dayOfWeek: Int?) async throws -> WeekPlanResponse {
            generateCalls.append(dayOfWeek)
            if shouldFailGenerate {
                throw APIServiceError.serverError("generate failed")
            }
            if wardrobeEmptyOnGenerate {
                plan.wardrobe_empty = true
                plan.message = WeekPlanCopy.emptyWardrobe
                return plan
            }
            let targets: [Int]
            if let dayOfWeek {
                targets = [dayOfWeek]
            } else {
                targets = plan.days.filter(\.enabled).map(\.day_of_week)
            }
            for dow in targets {
                guard let idx = plan.days.firstIndex(where: { $0.day_of_week == dow }) else { continue }
                plan.days[idx].outfit = WeekPlanOutfitResponse(
                    summary: "Look for day \(dow)",
                    shirt: "Shirt \(dow)",
                    trouser: "Trouser \(dow)",
                    blazer: "Blazer",
                    shoes: "Shoes",
                    belt: "Belt",
                    reasoning: "Because"
                )
            }
            return plan
        }

        func getWeekPlanToday() async throws -> WeekPlanTodayResponse {
            today
        }

        func deleteWeekPlan() async throws -> WeekPlanDeleteResponse {
            deleteCount += 1
            plan = .empty(timezone: "UTC")
            return WeekPlanDeleteResponse(deleted: true)
        }
    }

    private final class MockNotifier: WeekPlanNotificationScheduling {
        var rescheduleCount = 0
        var cancelCount = 0
        var lastPlan: WeekPlanResponse?

        func reschedule(plan: WeekPlanResponse) async {
            rescheduleCount += 1
            lastPlan = plan
        }

        func cancelAll() async {
            cancelCount += 1
        }
    }

    func testLoadPopulatesPlanAndToday() async {
        let api = MockAPI()
        api.plan.days[0].enabled = true
        api.plan.days[0].occasion = "work"
        api.today = WeekPlanTodayResponse(
            day_of_week: 0,
            enabled: true,
            occasion: "work",
            outfit: WeekPlanOutfitResponse(summary: "Navy look"),
            reminder_time: "07:30",
            timezone: "UTC",
            has_plan: true,
            message: nil
        )
        let notifier = MockNotifier()
        let vm = WeekPlannerViewModel(api: api, notifier: notifier, timezoneProvider: { "UTC" })

        await vm.load()

        XCTAssertEqual(api.getCount, 1)
        XCTAssertTrue(vm.plan.days[0].enabled)
        XCTAssertEqual(vm.plan.days[0].occasion, "work")
        XCTAssertEqual(vm.today?.outfit?.summary, "Navy look")
        XCTAssertEqual(notifier.cancelCount, 1) // no outfit summaries yet → cancel
    }

    func testSavePersistsUpsertBody() async throws {
        let api = MockAPI()
        let notifier = MockNotifier()
        let vm = WeekPlannerViewModel(api: api, notifier: notifier, timezoneProvider: { "America/New_York" })
        await vm.load()

        vm.setDayEnabled(1, enabled: true)
        vm.setDayOccasion(1, occasion: "date-night")
        vm.setDayStyle(1, style: "minimal")
        vm.setSharedSeason("summer")
        vm.setReminderTime("08:15")
        await vm.save()

        XCTAssertEqual(api.putBodies.count, 1)
        let body = try XCTUnwrap(api.putBodies.first)
        XCTAssertEqual(body.timezone, "America/New_York")
        XCTAssertEqual(body.reminder_time, "08:15")
        XCTAssertEqual(body.shared_season, "summer")
        XCTAssertEqual(body.days.first(where: { $0.day_of_week == 1 })?.enabled, true)
        XCTAssertEqual(body.days.first(where: { $0.day_of_week == 1 })?.occasion, "date-night")
        XCTAssertEqual(body.days.first(where: { $0.day_of_week == 1 })?.style, "minimal")
        XCTAssertEqual(vm.infoMessage, "Plan saved.")
    }

    func testGenerateWeekSavesThenGeneratesAndReschedulesNotifications() async {
        let api = MockAPI()
        let notifier = MockNotifier()
        let vm = WeekPlannerViewModel(api: api, notifier: notifier, timezoneProvider: { "UTC" })
        await vm.load()

        vm.setDayEnabled(0, enabled: true)
        vm.setDayEnabled(2, enabled: true)
        await vm.generateWeek()

        XCTAssertEqual(api.putBodies.count, 1)
        XCTAssertEqual(api.generateCalls, [nil])
        XCTAssertEqual(vm.plan.days[0].outfit?.summary, "Look for day 0")
        XCTAssertEqual(vm.plan.days[2].outfit?.summary, "Look for day 2")
        XCTAssertEqual(notifier.rescheduleCount, 1)
        XCTAssertEqual(notifier.lastPlan?.days[0].outfit?.summary, "Look for day 0")
    }

    func testRegenerateSingleDay() async {
        let api = MockAPI()
        api.plan.days[0].enabled = true
        api.plan.days[0].outfit = WeekPlanOutfitResponse(summary: "Old")
        api.plan.days[1].enabled = true
        api.plan.days[1].outfit = WeekPlanOutfitResponse(summary: "Keep")
        let notifier = MockNotifier()
        let vm = WeekPlannerViewModel(api: api, notifier: notifier, timezoneProvider: { "UTC" })
        await vm.load()

        await vm.regenerateDay(0)

        XCTAssertEqual(api.generateCalls, [0])
        XCTAssertEqual(vm.plan.days[0].outfit?.summary, "Look for day 0")
        XCTAssertEqual(vm.plan.days[1].outfit?.summary, "Keep")
    }

    func testGenerateEmptyWardrobeSetsInfoMessage() async {
        let api = MockAPI()
        api.wardrobeEmptyOnGenerate = true
        let notifier = MockNotifier()
        let vm = WeekPlannerViewModel(api: api, notifier: notifier, timezoneProvider: { "UTC" })
        await vm.load()
        vm.setDayEnabled(0, enabled: true)
        await vm.generateWeek()

        XCTAssertTrue(vm.plan.wardrobe_empty)
        XCTAssertEqual(vm.infoMessage, WeekPlanCopy.emptyWardrobe)
        XCTAssertGreaterThanOrEqual(notifier.cancelCount, 2)
    }

    func testClearPlanCancelsNotifications() async {
        let api = MockAPI()
        let notifier = MockNotifier()
        let vm = WeekPlannerViewModel(api: api, notifier: notifier, timezoneProvider: { "UTC" })
        await vm.load()
        await vm.clearPlan()

        XCTAssertEqual(api.deleteCount, 1)
        XCTAssertFalse(vm.hasEnabledDays)
        XCTAssertGreaterThanOrEqual(notifier.cancelCount, 1)
        XCTAssertEqual(vm.infoMessage, "Plan cleared.")
    }

    func testDisablingDayClearsLocalOutfit() async {
        let api = MockAPI()
        api.plan.days[0].enabled = true
        api.plan.days[0].outfit = WeekPlanOutfitResponse(summary: "Gone")
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()
        vm.setDayEnabled(0, enabled: false)
        XCTAssertNil(vm.plan.days[0].outfit)
        XCTAssertFalse(vm.plan.days[0].enabled)
    }

    func testSetDayUseWardrobeOnlyPersistsOnSave() async throws {
        let api = MockAPI()
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()

        XCTAssertTrue(vm.plan.days[0].use_wardrobe_only)
        vm.setDayEnabled(0, enabled: true)
        vm.setDayUseWardrobeOnly(0, useWardrobeOnly: false)
        await vm.save()

        let body = try XCTUnwrap(api.putBodies.first)
        XCTAssertEqual(body.days.first(where: { $0.day_of_week == 0 })?.use_wardrobe_only, false)
        XCTAssertFalse(vm.plan.days[0].use_wardrobe_only)
    }

    func testGenerateIncludesUseWardrobeOnlyInUpsert() async throws {
        let api = MockAPI()
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()
        vm.setDayEnabled(1, enabled: true)
        vm.setDayUseWardrobeOnly(1, useWardrobeOnly: false)
        await vm.generateWeek()

        let body = try XCTUnwrap(api.putBodies.first)
        XCTAssertEqual(body.days.first(where: { $0.day_of_week == 1 })?.use_wardrobe_only, false)
    }

    func testOutfitDisplaySummaryAndSlotRows() {
        let outfit = WeekPlanOutfitResponse(
            summary: "  Navy desk look  ",
            shirt: "White oxford",
            trouser: "Navy chinos",
            blazer: "Navy blazer",
            shoes: "Brown loafers",
            belt: "Brown belt",
            reasoning: "Clean contrast for work."
        )

        XCTAssertEqual(WeekPlanOutfitDisplay.summaryLine(for: outfit), "Navy desk look")
        XCTAssertTrue(WeekPlanOutfitDisplay.hasExpandableDetails(outfit))

        let rows = WeekPlanOutfitDisplay.slotRows(for: outfit)
        XCTAssertEqual(rows.map(\.category), ["shirt", "trouser", "blazer", "shoes", "belt"])
        XCTAssertEqual(rows.first?.description, "White oxford")
        XCTAssertEqual(WeekPlanOutfitDisplay.sourceTag(outfit: outfit, category: "shirt"), MainFlowUxCopy.tagAiSuggested)
    }

    func testOutfitDisplayEmptySummaryWithoutSlotsIsNotExpandable() {
        let outfit = WeekPlanOutfitResponse(summary: "   ", reasoning: "")
        XCTAssertFalse(WeekPlanOutfitDisplay.hasExpandableDetails(outfit))
        XCTAssertTrue(WeekPlanOutfitDisplay.slotRows(for: outfit).isEmpty)
    }
}
