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
        var historyGetCount = 0
        var restoreIds: [Int] = []
        var historyItems: [WeekPlanHistoryItem] = []
        var shouldFailGenerate = false
        var wardrobeEmptyOnGenerate = false
        var restorePlan: WeekPlanResponse?

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

        func getWeekPlanHistory() async throws -> WeekPlanHistoryListResponse {
            historyGetCount += 1
            return WeekPlanHistoryListResponse(items: historyItems)
        }

        func restoreWeekPlanHistory(id: Int) async throws -> WeekPlanResponse {
            restoreIds.append(id)
            if let restorePlan {
                plan = restorePlan
                return restorePlan
            }
            plan.days[0].enabled = true
            plan.days[0].occasion = "work"
            plan.days[0].outfit = WeekPlanOutfitResponse(summary: "Restored look")
            return plan
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
        XCTAssertEqual(vm.infoMessage, WeekPlanCopy.planSaved)
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

    func testOutfitDisplayAdminDiagnosticsDetection() {
        XCTAssertFalse(WeekPlanOutfitDisplay.hasAdminDiagnostics(WeekPlanOutfitResponse(summary: "Look")))
        let withMeta = WeekPlanOutfitResponse(
            summary: "Look",
            ai_prompt: "prompt",
            cost: OutfitCost(
                gpt4_cost: 0.01,
                model_image_cost: nil,
                total_cost: 0.01,
                input_tokens: nil,
                output_tokens: nil
            )
        )
        XCTAssertTrue(WeekPlanOutfitDisplay.hasAdminDiagnostics(withMeta))
    }

    func testLoadPopulatesHistory() async {
        let api = MockAPI()
        api.historyItems = [
            WeekPlanHistoryItem(
                id: 11,
                label: "Mon–Fri work week",
                created_at: "2026-07-18T10:00:00Z",
                enabled_day_count: 5
            ),
        ]
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })

        await vm.load()

        XCTAssertEqual(api.historyGetCount, 1)
        XCTAssertEqual(vm.history.count, 1)
        XCTAssertEqual(vm.history.first?.id, 11)
        XCTAssertEqual(vm.history.first?.label, "Mon–Fri work week")
        XCTAssertEqual(vm.history.first?.enabled_day_count, 5)
    }

    func testRestoreHistoryUpdatesPlanAndRefreshesHistory() async {
        let api = MockAPI()
        api.historyItems = [
            WeekPlanHistoryItem(
                id: 7,
                label: "Weekend casual",
                created_at: "2026-07-17T08:00:00Z",
                enabled_day_count: 2
            ),
        ]
        var restored = WeekPlanResponse.empty(timezone: "UTC")
        restored.days[5].enabled = true
        restored.days[5].occasion = "casual"
        restored.days[5].outfit = WeekPlanOutfitResponse(summary: "Saturday look")
        api.restorePlan = restored
        api.today = WeekPlanTodayResponse(
            day_of_week: 5,
            enabled: true,
            occasion: "casual",
            outfit: WeekPlanOutfitResponse(summary: "Saturday look"),
            reminder_time: "07:30",
            timezone: "UTC",
            has_plan: true,
            message: nil
        )
        let notifier = MockNotifier()
        let vm = WeekPlannerViewModel(api: api, notifier: notifier, timezoneProvider: { "UTC" })
        await vm.load()
        let historyFetchesBeforeRestore = api.historyGetCount

        await vm.restoreHistory(id: 7)

        XCTAssertEqual(api.restoreIds, [7])
        XCTAssertEqual(vm.plan.days[5].outfit?.summary, "Saturday look")
        XCTAssertEqual(vm.today?.outfit?.summary, "Saturday look")
        XCTAssertEqual(vm.infoMessage, WeekPlanCopy.planRestored)
        XCTAssertEqual(api.historyGetCount, historyFetchesBeforeRestore + 1)
        XCTAssertEqual(notifier.rescheduleCount, 1)
    }

    func testClearPlanRefreshesHistory() async {
        let api = MockAPI()
        api.historyItems = [
            WeekPlanHistoryItem(
                id: 3,
                label: "Cleared week",
                created_at: "2026-07-19T12:00:00Z",
                enabled_day_count: 3
            ),
        ]
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()
        let before = api.historyGetCount

        await vm.clearPlan()

        XCTAssertEqual(api.deleteCount, 1)
        XCTAssertEqual(api.historyGetCount, before + 1)
        XCTAssertEqual(vm.history.first?.id, 3)
    }

    // MARK: - Responsive redesign: selection / missing / save / actions

    func testSelectDayUpdatesSelectedDayWithoutReload() async {
        let api = MockAPI()
        api.plan.days[0].enabled = true
        api.plan.days[0].outfit = WeekPlanOutfitResponse(
            summary: "Mon look",
            shirt: "Shirt",
            trouser: "Trouser",
            shoes: "Shoes",
            belt: "Belt"
        )
        api.plan.days[2].enabled = true
        api.plan.days[2].outfit = WeekPlanOutfitResponse(
            summary: "Wed look",
            shirt: "W Shirt",
            trouser: "W Trouser",
            shoes: "W Shoes",
            belt: "W Belt"
        )
        api.today = WeekPlanTodayResponse(
            day_of_week: 0,
            enabled: true,
            occasion: "work",
            outfit: api.plan.days[0].outfit,
            reminder_time: "07:30",
            timezone: "UTC",
            has_plan: true
        )
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()
        let getsBefore = api.getCount

        XCTAssertEqual(vm.selectedDayOfWeek, 0)
        XCTAssertEqual(vm.selectedDay?.outfit?.summary, "Mon look")

        vm.selectDay(2)

        XCTAssertEqual(vm.selectedDayOfWeek, 2)
        XCTAssertEqual(vm.selectedDay?.outfit?.summary, "Wed look")
        XCTAssertEqual(api.getCount, getsBefore, "Day selection must not reload the plan")
    }

    func testMissingSlotsDetectedFromEmptyOutfitStrings() async throws {
        let api = MockAPI()
        api.plan.days[0].enabled = true
        api.plan.days[0].outfit = WeekPlanOutfitResponse(
            summary: "Incomplete",
            shirt: "White oxford",
            trouser: "",
            shoes: "Loafers",
            belt: ""
        )
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()

        let day = try XCTUnwrap(vm.plan.days.first)
        XCTAssertEqual(vm.dayStatus(for: day), .missing)
        let missing = vm.missingSlots(for: day)
        XCTAssertEqual(missing.map(\.category), ["trouser", "belt"])
        XCTAssertTrue(vm.showsMissingActions(for: day))
    }

    func testDayStatusReadyRestAndNotGenerated() {
        let rest = WeekPlanDayResponse(
            day_of_week: 0,
            enabled: false,
            occasion: "everyday"
        )
        XCTAssertEqual(WeekPlanMissingSlots.status(for: rest), .restDay)

        let notGen = WeekPlanDayResponse(
            day_of_week: 1,
            enabled: true,
            occasion: "work"
        )
        XCTAssertEqual(WeekPlanMissingSlots.status(for: notGen), .notGenerated)

        let ready = WeekPlanDayResponse(
            day_of_week: 2,
            enabled: true,
            occasion: "work",
            outfit: WeekPlanOutfitResponse(
                summary: "Ready look",
                shirt: "Shirt",
                trouser: "Trouser",
                shoes: "Shoes",
                belt: "Belt"
            )
        )
        XCTAssertEqual(WeekPlanMissingSlots.status(for: ready), .ready)
    }

    func testSaveDisabledWhileSavingOrGenerating() async {
        let api = MockAPI()
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()

        XCTAssertFalse(vm.isSaveDisabled)

        vm.isSaving = true
        XCTAssertTrue(vm.isSaveDisabled)
        vm.isSaving = false

        vm.isGenerating = true
        XCTAssertTrue(vm.isSaveDisabled)
        vm.isGenerating = false

        vm.isRestoring = true
        XCTAssertTrue(vm.isSaveDisabled)
        vm.isRestoring = false

        XCTAssertFalse(vm.isSaveDisabled)
    }

    func testMissingActionsChooseFindContinue() async throws {
        let api = MockAPI()
        api.plan.days[1].enabled = true
        api.plan.days[1].outfit = WeekPlanOutfitResponse(
            summary: "Gap look",
            shirt: "Shirt",
            trouser: "",
            shoes: "Shoes",
            belt: "Belt"
        )
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()
        vm.selectDay(1)

        let day = try XCTUnwrap(vm.selectedDay)
        XCTAssertTrue(vm.showsMissingActions(for: day))

        vm.chooseFromWardrobe(dayOfWeek: 1)
        XCTAssertEqual(vm.lastMissingAction, .chooseFromWardrobe(dayOfWeek: 1))

        vm.continueWithoutMissing(dayOfWeek: 1)
        XCTAssertEqual(vm.lastMissingAction, .continueWithout(dayOfWeek: 1))
        XCTAssertTrue(vm.dismissedMissingDays.contains(1))
        XCTAssertFalse(vm.showsMissingActions(for: day))

        await vm.findAlternative(dayOfWeek: 1)
        XCTAssertEqual(vm.lastMissingAction, .findAlternative(dayOfWeek: 1))
        XCTAssertEqual(api.generateCalls, [1])
        // After regenerate, dismissal cleared so missing UI can reappear if still incomplete.
        XCTAssertFalse(vm.dismissedMissingDays.contains(1))
    }
}
