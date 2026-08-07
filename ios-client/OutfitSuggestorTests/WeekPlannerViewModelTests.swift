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
        var presetList = WeekPlanPresetListResponse(items: [], count: 0, limit: 4, limit_source: "default")
        var createPresetBodies: [WeekPlanPresetCreateRequest] = []
        var updatePresetBodies: [(id: Int, body: WeekPlanPresetUpdateRequest)] = []
        var deletePresetIds: [Int] = []
        var applyPresetIds: [Int] = []
        var nextPresetId = 1

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

        func getWeekPlanPresets() async throws -> WeekPlanPresetListResponse {
            presetList
        }

        func createWeekPlanPreset(_ body: WeekPlanPresetCreateRequest) async throws -> WeekPlanPresetItem {
            createPresetBodies.append(body)
            if presetList.count >= presetList.limit {
                throw APIServiceError.serverError("Preset limit reached")
            }
            let item = WeekPlanPresetItem(
                id: nextPresetId,
                name: body.name,
                config: body.config,
                created_at: "2026-07-25T10:00:00Z",
                updated_at: "2026-07-25T10:00:00Z"
            )
            nextPresetId += 1
            presetList.items.append(item)
            presetList.count = presetList.items.count
            return item
        }

        func updateWeekPlanPreset(id: Int, body: WeekPlanPresetUpdateRequest) async throws -> WeekPlanPresetItem {
            updatePresetBodies.append((id, body))
            guard let idx = presetList.items.firstIndex(where: { $0.id == id }) else {
                throw APIServiceError.serverError("Not found")
            }
            var item = presetList.items[idx]
            if let name = body.name { item.name = name }
            if let config = body.config { item.config = config }
            item.updated_at = "2026-07-25T11:00:00Z"
            presetList.items[idx] = item
            return item
        }

        func deleteWeekPlanPreset(id: Int) async throws -> WeekPlanDeleteResponse {
            deletePresetIds.append(id)
            presetList.items.removeAll { $0.id == id }
            presetList.count = presetList.items.count
            return WeekPlanDeleteResponse(deleted: true)
        }

        func applyWeekPlanPreset(id: Int) async throws -> WeekPlanResponse {
            applyPresetIds.append(id)
            guard let preset = presetList.items.first(where: { $0.id == id }) else {
                throw APIServiceError.serverError("Not found")
            }
            var applied = WeekPlanResponse.empty(timezone: plan.timezone)
            applied.reminder_time = preset.config.reminder_time
            applied.shared_season = preset.config.shared_season
            applied.days = preset.config.days.map {
                WeekPlanDayResponse(
                    day_of_week: $0.day_of_week,
                    enabled: $0.enabled,
                    occasion: $0.occasion,
                    style: $0.style,
                    use_wardrobe_only: $0.use_wardrobe_only,
                    outfit: nil
                )
            }
            plan = applied
            return applied
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
        XCTAssertEqual(missing.map(\.category), ["trouser"])
        XCTAssertTrue(vm.showsMissingActions(for: day))
    }

    func testEmptyAccessoryDoesNotCountAsMissing() {
        let readyWithoutBelt = WeekPlanDayResponse(
            day_of_week: 0,
            enabled: true,
            occasion: "work",
            outfit: WeekPlanOutfitResponse(
                summary: "No accessory needed",
                shirt: "Shirt",
                trouser: "Trouser",
                shoes: "Shoes",
                belt: ""
            )
        )
        XCTAssertEqual(WeekPlanMissingSlots.status(for: readyWithoutBelt), .ready)
        XCTAssertTrue(WeekPlanMissingSlots.missing(for: readyWithoutBelt.outfit!).isEmpty)
        XCTAssertEqual(WeekPlanCopy.includeDay, "Include day")
        XCTAssertEqual(WeekPlanCopy.changeItem, "Change")
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

    // MARK: - Saved configurations (presets)

    private func samplePresetConfig() -> WeekPlanPresetConfig {
        WeekPlanPresetConfig(
            reminder_time: "08:00",
            shared_season: "summer",
            days: (0..<7).map {
                WeekPlanPresetConfigDay(
                    day_of_week: $0,
                    enabled: $0 < 5,
                    occasion: "work",
                    style: "classic",
                    use_wardrobe_only: true
                )
            }
        )
    }

    func testLoadUsesPresetCountAndLimitFromAPI() async {
        let api = MockAPI()
        api.presetList = WeekPlanPresetListResponse(
            items: [
                WeekPlanPresetItem(
                    id: 1,
                    name: "Work week",
                    config: samplePresetConfig(),
                    created_at: "2026-07-25T10:00:00Z",
                    updated_at: "2026-07-25T10:00:00Z"
                ),
            ],
            count: 1,
            limit: 8,
            limit_source: "tier"
        )
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })

        await vm.load()

        XCTAssertEqual(vm.presetCount, 1)
        XCTAssertEqual(vm.presetLimit, 8)
        XCTAssertEqual(vm.presetLimitSource, "tier")
        XCTAssertEqual(vm.presetUsageText, "1 of 8 saved")
        XCTAssertFalse(vm.isPresetAtLimit)
        XCTAssertFalse(vm.isPresetSaveDisabled)
    }

    func testPresetAtLimitDisablesSaveAs() async {
        let api = MockAPI()
        api.presetList = WeekPlanPresetListResponse(
            items: (1...4).map { id in
                WeekPlanPresetItem(
                    id: id,
                    name: "Preset \(id)",
                    config: samplePresetConfig(),
                    created_at: "2026-07-25T10:00:00Z",
                    updated_at: "2026-07-25T10:00:00Z"
                )
            },
            count: 4,
            limit: 4,
            limit_source: "default"
        )
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()

        XCTAssertTrue(vm.isPresetAtLimit)
        XCTAssertTrue(vm.isPresetSaveDisabled)
        XCTAssertEqual(vm.presetAtLimitMessage, WeekPlanCopy.configurationAtLimit(limit: 4))
        XCTAssertEqual(vm.presetUsageText, "4 of 4 saved")
    }

    func testSaveLoadAndDeletePreset() async throws {
        let api = MockAPI()
        api.presetList.limit = 6
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()

        vm.setDayEnabled(0, enabled: true)
        vm.setDayOccasion(0, occasion: "work")
        vm.setSharedSeason("winter")
        vm.setReminderTime("09:15")
        await vm.saveAsPreset(name: "  Winter work  ")

        XCTAssertEqual(api.createPresetBodies.count, 1)
        XCTAssertEqual(api.createPresetBodies.first?.name, "Winter work")
        XCTAssertEqual(api.createPresetBodies.first?.config.shared_season, "winter")
        XCTAssertEqual(vm.presetCount, 1)
        XCTAssertEqual(vm.infoMessage, WeekPlanCopy.configurationSaved)

        await vm.applyPreset(id: 1)
        XCTAssertEqual(api.applyPresetIds, [1])
        XCTAssertTrue(vm.plan.days[0].enabled)
        XCTAssertEqual(vm.plan.shared_season, "winter")
        XCTAssertNil(vm.plan.days[0].outfit)
        XCTAssertEqual(vm.infoMessage, WeekPlanCopy.configurationLoaded)

        await vm.deletePreset(id: 1)
        XCTAssertEqual(api.deletePresetIds, [1])
        XCTAssertEqual(vm.presetCount, 0)
        XCTAssertEqual(vm.infoMessage, WeekPlanCopy.configurationDeleted)
    }

    func testUpdateAndRenamePreset() async {
        let api = MockAPI()
        api.presetList = WeekPlanPresetListResponse(
            items: [
                WeekPlanPresetItem(
                    id: 3,
                    name: "Old name",
                    config: samplePresetConfig(),
                    created_at: "2026-07-25T10:00:00Z",
                    updated_at: "2026-07-25T10:00:00Z"
                ),
            ],
            count: 1,
            limit: 4,
            limit_source: "default"
        )
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()

        vm.setSharedSeason("fall")
        await vm.updatePreset(id: 3)
        XCTAssertEqual(api.updatePresetBodies.count, 1)
        XCTAssertEqual(api.updatePresetBodies.first?.body.config?.shared_season, "fall")
        XCTAssertEqual(vm.infoMessage, WeekPlanCopy.configurationUpdated)

        await vm.renamePreset(id: 3, name: "Fall week")
        XCTAssertEqual(api.updatePresetBodies.last?.body.name, "Fall week")
        XCTAssertEqual(vm.infoMessage, WeekPlanCopy.configurationRenamed)
    }

    func testHasGeneratedOutfitsDetectsAppliedWipeNeed() async {
        let api = MockAPI()
        api.plan.days[0].enabled = true
        api.plan.days[0].outfit = WeekPlanOutfitResponse(
            summary: "Existing",
            shirt: "Shirt",
            trouser: "Trouser",
            shoes: "Shoes",
            belt: "Belt"
        )
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()

        XCTAssertTrue(vm.hasGeneratedOutfits)
    }

    // MARK: - UX hierarchy: primary CTA / dirty / exceptional status / naming

    func testPrimaryCTAIsGenerateBeforeOutfitsAndSaveWhenDirty() async {
        let api = MockAPI()
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()

        XCTAssertEqual(vm.primaryCTA, .generate)
        XCTAssertEqual(vm.primaryCTA.title, WeekPlanCopy.generateOutfits)
        XCTAssertFalse(vm.isDirty)

        vm.setDayEnabled(0, enabled: true)
        XCTAssertTrue(vm.isDirty)
        XCTAssertEqual(vm.primaryCTA, .generate, "Without outfits, primary stays Generate even when dirty")

        await vm.generateWeek()
        XCTAssertTrue(vm.hasGeneratedOutfits)
        XCTAssertFalse(vm.isDirty)
        XCTAssertEqual(vm.primaryCTA, .generate)

        vm.setSharedSeason("summer")
        XCTAssertTrue(vm.isDirty)
        XCTAssertEqual(vm.primaryCTA, .save)
        XCTAssertEqual(vm.primaryCTA.title, WeekPlanCopy.savePlan)
        XCTAssertEqual(vm.documentState, .unsaved)

        await vm.save()
        XCTAssertFalse(vm.isDirty)
        XCTAssertEqual(vm.toastMessage, WeekPlanCopy.planSaved)
        XCTAssertEqual(vm.primaryCTA, .generate)
    }

    func testExceptionalStatusOmitsReadyOnCompleteDays() {
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
        XCTAssertNil(ready.dayStatusExceptionalLabel)

        let missing = WeekPlanDayResponse(
            day_of_week: 1,
            enabled: true,
            occasion: "work",
            outfit: WeekPlanOutfitResponse(summary: "Gap", shirt: "Shirt", trouser: "", shoes: "Shoes", belt: "")
        )
        XCTAssertEqual(WeekPlanMissingSlots.status(for: missing).exceptionalLabel, WeekPlanCopy.statusNeedsOutfit)

        let rest = WeekPlanDayResponse(day_of_week: 0, enabled: false, occasion: "everyday")
        XCTAssertEqual(WeekPlanMissingSlots.status(for: rest).exceptionalLabel, WeekPlanCopy.statusNotPlanned)
    }

    func testPlanningTemplatesAndPlanHistoryNaming() {
        XCTAssertEqual(WeekPlanCopy.planningTemplates, "Planning templates")
        XCTAssertEqual(WeekPlanCopy.planHistory, "Plan history")
        XCTAssertEqual(WeekPlanCopy.savedConfigurations, "Planning templates")
        XCTAssertEqual(WeekPlanCopy.previousPlans, "Plan history")
        XCTAssertEqual(WeekPlanCopy.generateOutfits, "Generate outfits")
        XCTAssertEqual(WeekPlanCopy.savePlan, "Save plan")
    }

    func testNoOutfitsTipCopy() {
        XCTAssertEqual(
            WeekPlanCopy.noOutfitsTip,
            "Generate outfits for your week. Add wardrobe items first for closer matches."
        )
    }

    func testHumanReadableHistoryDateHelper() {
        let formatted = WeekPlanDateFormatting.humanReadable("2026-07-18T10:00:00Z")
        XCTAssertFalse(formatted.isEmpty)
        XCTAssertNotEqual(formatted, "2026-07-18T10:00:00Z")
        XCTAssertFalse(WeekPlanDateFormatting.weekRangeLabel().isEmpty)
    }

    func testToastForLoadedPlanIsTransientNotPermanentBanner() async {
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
        restored.days[5].outfit = WeekPlanOutfitResponse(summary: "Saturday look")
        api.restorePlan = restored
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()
        await vm.restoreHistory(id: 7)

        XCTAssertEqual(vm.toastMessage, WeekPlanCopy.planRestored)
        XCTAssertEqual(vm.infoMessage, WeekPlanCopy.planRestored)
    }

    // MARK: - Wardrobe slot pick (Change / Add)

    func testApplyWardrobeItemUpdatesSlotSelectsDayAndMarksDirty() async {
        let api = MockAPI()
        api.plan.days[2].enabled = true
        api.plan.days[2].outfit = WeekPlanOutfitResponse(
            summary: "Wednesday look",
            shirt: "Old shirt",
            trouser: "Trousers",
            shoes: "Shoes",
            belt: "Belt"
        )
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()
        vm.selectDay(0)
        XCTAssertFalse(vm.isDirty)

        let coordinator = RouteCoordinator.shared
        coordinator.clearWardrobePickSession()
        coordinator.startWardrobePick(dayOfWeek: 2, slotKey: "shirt", category: "shirt")
        XCTAssertEqual(coordinator.wardrobePickSession?.dayOfWeek, 2)
        XCTAssertEqual(coordinator.wardrobePickSession?.slotKey, "shirt")
        XCTAssertEqual(coordinator.selectedTab, .wardrobe)

        let item = WardrobeItem(
            id: 42,
            category: "shirt",
            name: "Blue Oxford",
            description: "Light blue oxford shirt",
            color: "blue",
            brand: nil,
            size: nil,
            image_data: "abc123",
            tags: nil,
            condition: nil,
            wear_count: 0,
            created_at: "2026-01-01",
            updated_at: "2026-01-01"
        )

        let applied = vm.applyWardrobeItem(item, dayOfWeek: 2, slotKey: "shirt")
        XCTAssertTrue(applied)
        XCTAssertEqual(vm.selectedDayOfWeek, 2)
        XCTAssertEqual(vm.plan.days[2].outfit?.shirt, "Light blue oxford shirt")
        XCTAssertEqual(vm.plan.days[2].outfit?.shirt_id, 42)
        XCTAssertEqual(vm.plan.days[2].outfit?.matching_wardrobe_items?.shirt?.first?.id, 42)
        XCTAssertTrue(vm.plan.days[2].outfit?.wardrobe_item_ids.contains(42) ?? false)
        XCTAssertTrue(vm.isDirty)
        XCTAssertEqual(vm.lastMissingAction, .chooseFromWardrobe(dayOfWeek: 2))

        // Simulate return to Week + clear session after pick (T1).
        vm.selectDay(2)
        coordinator.clearWardrobePickSession()
        coordinator.selectedTab = .week
        XCTAssertNil(coordinator.wardrobePickSession)
        XCTAssertNil(coordinator.wardrobeCategoryFilter)
        XCTAssertEqual(vm.selectedDayOfWeek, 2)
        XCTAssertEqual(coordinator.selectedTab, .week)
    }

    func testCancelWardrobePickLeavesPlanUnchangedAndClearsSession() async {
        let api = MockAPI()
        api.plan.days[1].enabled = true
        api.plan.days[1].outfit = WeekPlanOutfitResponse(
            summary: "Tuesday look",
            shirt: "Keep me",
            trouser: "Trousers",
            shoes: "Shoes",
            belt: ""
        )
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()
        vm.selectDay(1)
        let shirtBefore = vm.plan.days[1].outfit?.shirt
        XCTAssertFalse(vm.isDirty)

        let coordinator = RouteCoordinator.shared
        coordinator.clearWardrobePickSession()
        coordinator.startWardrobePick(dayOfWeek: 1, slotKey: "shirt", category: "shirt")
        XCTAssertNotNil(coordinator.wardrobePickSession)
        XCTAssertEqual(
            coordinator.wardrobePickSession?.bannerText,
            "Choose Top for Tuesday"
        )

        // Cancel / Back without pick (T2).
        coordinator.clearWardrobePickSession()
        XCTAssertNil(coordinator.wardrobePickSession)
        XCTAssertNil(coordinator.wardrobeCategoryFilter)
        XCTAssertEqual(vm.plan.days[1].outfit?.shirt, shirtBefore)
        XCTAssertFalse(vm.isDirty)
        XCTAssertEqual(vm.selectedDayOfWeek, 1)
    }
}

private extension WeekPlanDayResponse {
    var dayStatusExceptionalLabel: String? {
        WeekPlanMissingSlots.status(for: self).exceptionalLabel
    }
}
