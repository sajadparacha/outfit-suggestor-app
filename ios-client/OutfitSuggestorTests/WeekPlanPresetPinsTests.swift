//
//  WeekPlanPresetPinsTests.swift
//  OutfitSuggestorTests
//
//  Planning templates persist per-day pinned_items with prefs.
//

import XCTest
@testable import OutfitSuggestor

@MainActor
final class WeekPlanPresetPinsTests: XCTestCase {

    private final class MockAPI: WeekPlanAPIClient {
        var plan = WeekPlanResponse.empty(timezone: "UTC")
        var createPresetBodies: [WeekPlanPresetCreateRequest] = []
        var presetList = WeekPlanPresetListResponse(items: [], count: 0, limit: 4, limit_source: "default")

        func getWeekPlan() async throws -> WeekPlanResponse { plan }
        func putWeekPlan(_ body: WeekPlanUpsertRequest) async throws -> WeekPlanResponse { plan }
        func generateWeekPlan(dayOfWeek: Int?) async throws -> WeekPlanResponse { plan }
        func getWeekPlanToday() async throws -> WeekPlanTodayResponse {
            WeekPlanTodayResponse(
                day_of_week: 0,
                enabled: false,
                reminder_time: "07:30",
                timezone: "UTC",
                has_plan: false
            )
        }
        func deleteWeekPlan() async throws -> WeekPlanDeleteResponse {
            WeekPlanDeleteResponse(deleted: true)
        }
        func getWeekPlanHistory() async throws -> WeekPlanHistoryListResponse {
            WeekPlanHistoryListResponse(items: [])
        }
        func restoreWeekPlanHistory(id: Int) async throws -> WeekPlanResponse { plan }
        func getWeekPlanPresets() async throws -> WeekPlanPresetListResponse { presetList }
        func createWeekPlanPreset(_ body: WeekPlanPresetCreateRequest) async throws -> WeekPlanPresetItem {
            createPresetBodies.append(body)
            let item = WeekPlanPresetItem(
                id: 1,
                name: body.name,
                config: body.config,
                created_at: "2026-07-25T10:00:00Z",
                updated_at: "2026-07-25T10:00:00Z"
            )
            presetList.items.append(item)
            presetList.count = presetList.items.count
            return item
        }
        func updateWeekPlanPreset(id: Int, body: WeekPlanPresetUpdateRequest) async throws -> WeekPlanPresetItem {
            WeekPlanPresetItem(
                id: id,
                name: body.name ?? "x",
                config: body.config ?? WeekPlanPresetConfig(reminder_time: "07:30", shared_season: "all-season", days: []),
                created_at: "2026-07-25T10:00:00Z",
                updated_at: "2026-07-25T10:00:00Z"
            )
        }
        func deleteWeekPlanPreset(id: Int) async throws -> WeekPlanDeleteResponse {
            WeekPlanDeleteResponse(deleted: true)
        }
        func applyWeekPlanPreset(id: Int) async throws -> WeekPlanResponse { plan }
        func getWardrobeItem(id: Int) async throws -> WardrobeItem {
            throw APIServiceError.serverError("not stubbed")
        }
    }

    private final class MockNotifier: WeekPlanNotificationScheduling {
        func reschedule(plan: WeekPlanResponse) async {}
        func cancelAll() async {}
    }

    func testPresetConfigFromPlanIncludesPinnedItems() async throws {
        let api = MockAPI()
        let vm = WeekPlannerViewModel(api: api, notifier: MockNotifier(), timezoneProvider: { "UTC" })
        await vm.load()

        vm.setDayEnabled(1, enabled: true)
        vm.plan.days[1].pinned_items = ["shoes": 12, "shirt": 34]
        await vm.saveAsPreset(name: "Weekly shoes")

        let config = try XCTUnwrap(api.createPresetBodies.first?.config)
        let day = try XCTUnwrap(config.days.first(where: { $0.day_of_week == 1 }))
        XCTAssertEqual(day.pinned_items["shoes"], 12)
        XCTAssertEqual(day.pinned_items["shirt"], 34)
        let emptyDay = try XCTUnwrap(config.days.first(where: { $0.day_of_week == 0 }))
        XCTAssertEqual(emptyDay.pinned_items, [:])
    }

    func testDecodePresetConfigDayWithPinnedItems() throws {
        let json = """
        {
          "day_of_week": 2,
          "enabled": true,
          "occasion": "work",
          "style": "classic",
          "use_wardrobe_only": true,
          "pinned_items": { "shoes": 12, "shirt": 34 }
        }
        """.data(using: .utf8)!

        let day = try JSONDecoder().decode(WeekPlanPresetConfigDay.self, from: json)
        XCTAssertEqual(day.day_of_week, 2)
        XCTAssertEqual(day.pinned_items["shoes"], 12)
        XCTAssertEqual(day.pinned_items["shirt"], 34)
    }

    func testDecodePresetConfigDayWithoutPinnedItemsDefaultsEmpty() throws {
        let json = """
        {
          "day_of_week": 0,
          "enabled": false,
          "occasion": "everyday",
          "style": "classic",
          "use_wardrobe_only": true
        }
        """.data(using: .utf8)!

        let day = try JSONDecoder().decode(WeekPlanPresetConfigDay.self, from: json)
        XCTAssertEqual(day.pinned_items, [:])
    }
}
