//
//  AppRouteTabMappingTests.swift
//  OutfitSuggestorTests
//
//  Tab labels and route → tab mapping for Week Planner + Insights main nav.
//

import XCTest
@testable import OutfitSuggestor

final class AppRouteTabMappingTests: XCTestCase {

    func testWeekPlannerTabLabelUsesNavTitle() {
        XCTAssertEqual(WeekPlanCopy.navTitle, "Week Planner")
    }

    func testInsightsTabUsesShortLabelAndPageTitle() {
        XCTAssertEqual(InsightsCopy.pageTitle, "Wardrobe Insights")
        XCTAssertEqual(AppRoute.TabIndex.insights.rawValue, 3)
    }

    func testTabOrderIncludesInsightsBetweenWeekAndLooks() {
        XCTAssertEqual(AppRoute.TabIndex.suggest.rawValue, 0)
        XCTAssertEqual(AppRoute.TabIndex.wardrobe.rawValue, 1)
        XCTAssertEqual(AppRoute.TabIndex.week.rawValue, 2)
        XCTAssertEqual(AppRoute.TabIndex.insights.rawValue, 3)
        XCTAssertEqual(AppRoute.TabIndex.history.rawValue, 4)
        XCTAssertEqual(AppRoute.TabIndex.profile.rawValue, 5)
        XCTAssertEqual(AppRoute.TabIndex.allCases.count, 6)
    }

    func testWeekPathMapsToWeekPlannerTab() {
        XCTAssertEqual(AppRoute.tabIndex(for: AppRoute.week), .week)
        XCTAssertNil(AppRoute.profileDestination(for: AppRoute.week))
    }

    func testInsightsPathMapsToInsightsTabNotProfileStack() {
        XCTAssertEqual(AppRoute.tabIndex(for: AppRoute.insights), .insights)
        XCTAssertNil(AppRoute.profileDestination(for: AppRoute.insights))
    }

    func testInsightsAuthPromptContextExists() {
        let copy = AuthPromptCopy.content(for: .insights)
        XCTAssertFalse(copy.headline.isEmpty)
        XCTAssertEqual(AuthPromptContext.insights.rawValue, "insights")
    }
}
