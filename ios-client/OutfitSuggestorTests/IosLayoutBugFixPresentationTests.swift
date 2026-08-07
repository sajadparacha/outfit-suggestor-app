import XCTest
@testable import OutfitSuggestor

final class IosLayoutBugFixPresentationTests: XCTestCase {
    // MARK: - Wardrobe navigation (text overlap)

    func testWardrobeUsesInlineNavigationTitleToAvoidFilterOverlap() {
        XCTAssertEqual(WardrobeNavigationPresentation.title, "Wardrobe")
        XCTAssertTrue(WardrobeNavigationPresentation.usesInlineTitle)
    }

    // MARK: - Week Planner shared controls

    func testSeasonAndReminderShareEqualLayoutContract() {
        XCTAssertEqual(WeekPlanSharedControlsLayout.controlMinHeight, 88)
        XCTAssertEqual(WeekPlanSharedControlsLayout.equalWidthPairCount(), 2)
        XCTAssertEqual(WeekPlanSharedControlsLayout.controlsAccessibilityId, "week.controls")
        XCTAssertEqual(WeekPlanSharedControlsLayout.seasonAccessibilityId, "week.sharedSeason")
        XCTAssertEqual(WeekPlanSharedControlsLayout.reminderAccessibilityId, "week.reminderTime")
        XCTAssertEqual(WeekPlanSharedControlsLayout.timezoneAccessibilityId, "week.timezone")
    }

    // MARK: - Week overview scroll hint

    func testScrollHintShowsWhenOverviewHasDays() {
        XCTAssertFalse(WeekPlanOverviewScrollHint.shouldShowScrollHint(dayCount: 0))
        XCTAssertTrue(WeekPlanOverviewScrollHint.shouldShowScrollHint(dayCount: 1))
        XCTAssertTrue(WeekPlanOverviewScrollHint.shouldShowScrollHint(dayCount: 7))
    }

    func testScrollHintAccessibilityContract() {
        XCTAssertEqual(WeekPlanOverviewScrollHint.overviewAccessibilityId, "week.overview")
        XCTAssertEqual(WeekPlanOverviewScrollHint.scrollHintAccessibilityId, "week.overview.scrollHint")
        XCTAssertEqual(
            WeekPlanOverviewScrollHint.accessibilityHint,
            "Swipe horizontally to see more days"
        )
        XCTAssertEqual(WeekPlanOverviewScrollHint.trailingFadeWidth, 36)
        XCTAssertEqual(WeekPlanOverviewScrollHint.trailingContentPadding, 28)
    }

    // MARK: - Result sticky actions

    func testResultActionsEqualMinHeightAndIds() {
        XCTAssertEqual(MainFlowResultActionsLayout.buttonMinHeight, 44)
        XCTAssertEqual(MainFlowResultActionsLayout.generateAnotherAccessibilityId, "main.generateAnotherButton")
        XCTAssertEqual(MainFlowResultActionsLayout.saveLookAccessibilityId, "main.saveLookButton")
        XCTAssertEqual(MainFlowResultActionsLayout.refineAccessibilityId, "main.refineButton")
    }

    func testResultActionsPreferSingleRowWhenWideEnough() {
        XCTAssertTrue(MainFlowResultActionsLayout.prefersSingleRow(availableWidth: 390))
        XCTAssertTrue(MainFlowResultActionsLayout.prefersSingleRow(availableWidth: 320))
        XCTAssertFalse(MainFlowResultActionsLayout.prefersSingleRow(availableWidth: 280))
        XCTAssertFalse(MainFlowResultActionsLayout.prefersSingleRow(availableWidth: 200))
    }

    // MARK: - Preferences duplicate heading

    func testEmbeddedPreferencesTitleHiddenWhenParentShowsHeading() {
        XCTAssertFalse(
            FiltersView.GridContract.shouldShowEmbeddedSectionTitle(parentShowsPreferencesHeading: true)
        )
        XCTAssertTrue(
            FiltersView.GridContract.shouldShowEmbeddedSectionTitle(parentShowsPreferencesHeading: false)
        )
    }

    // MARK: - Wardrobe card web-parity CTAs

    func testCompleteOutfitCardActionTitles() {
        XCTAssertEqual(
            WardrobeCompleteOutfitCardAction.resolve(isEligible: true, isSelected: false),
            .add
        )
        XCTAssertEqual(
            WardrobeCompleteOutfitCardAction.resolve(isEligible: true, isSelected: true),
            .remove
        )
        XCTAssertEqual(
            WardrobeCompleteOutfitCardAction.resolve(isEligible: false, isSelected: false),
            .unavailable
        )
        XCTAssertEqual(WardrobeCompleteOutfitCardAction.add.title, "Add to outfit completion")
        XCTAssertEqual(WardrobeCompleteOutfitCardAction.remove.title, "Remove from outfit completion")
        XCTAssertEqual(WardrobeCompleteOutfitCardAction.unavailable.title, "Outfit completion unavailable")
    }

    func testCompleteOutfitButtonVisibilityAndSelectionEntry() {
        XCTAssertTrue(
            WardrobeCompleteOutfitCardAction.shouldShowCompleteOutfitButton(
                hasCompletionHandler: true,
                isWeekPlanPickMode: false
            )
        )
        XCTAssertFalse(
            WardrobeCompleteOutfitCardAction.shouldShowCompleteOutfitButton(
                hasCompletionHandler: true,
                isWeekPlanPickMode: true
            )
        )
        XCTAssertFalse(
            WardrobeCompleteOutfitCardAction.shouldShowCompleteOutfitButton(
                hasCompletionHandler: false,
                isWeekPlanPickMode: false
            )
        )
        XCTAssertTrue(WardrobeCompleteOutfitCardAction.shouldEnterSelectionMode(isCurrentlyInMode: false))
        XCTAssertFalse(WardrobeCompleteOutfitCardAction.shouldEnterSelectionMode(isCurrentlyInMode: true))
    }

    func testWardrobeCardWebParityCopyContract() {
        XCTAssertEqual(WardrobeCardUx.styleThisItemSubtitle, "Single-item Suggest flow")
        XCTAssertEqual(WardrobeCardUx.singleItemStylingSection, "Single-item styling")
        XCTAssertEqual(WardrobeCardUx.addToOutfitCompletion, WardrobeCompleteOutfitCardAction.add.title)
        XCTAssertEqual(
            WardrobeCardUx.removeFromOutfitCompletion,
            WardrobeCompleteOutfitCardAction.remove.title
        )
    }
}
