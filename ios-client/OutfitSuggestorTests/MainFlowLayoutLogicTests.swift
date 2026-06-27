import XCTest
@testable import OutfitSuggestor

/// Documents side-by-side main flow layout contract (iPad regular width reference for web md+).
final class MainFlowLayoutLogicTests: XCTestCase {
    // MARK: - Side-by-side shell constants (web parity)

    func testSideBySideLayoutConstantsMatchWebContract() {
        XCTAssertEqual(MainFlowLayoutLogic.maxContentWidth, 980)
        XCTAssertEqual(MainFlowLayoutLogic.sideBySideColumnSpacing, 20)
    }

    // MARK: - Regular vs compact width branching

    func testUsesSideBySideColumnsOnlyOnRegularWidth() {
        XCTAssertTrue(MainFlowLayoutLogic.usesSideBySideColumns(isRegularHorizontalSizeClass: true))
        XCTAssertFalse(MainFlowLayoutLogic.usesSideBySideColumns(isRegularHorizontalSizeClass: false))
    }

    func testCompactWidthUsesStackedFlowNotSideBySide() {
        // iPhone (compact) must not use the two-column shell — stacked creation/result only.
        XCTAssertFalse(MainFlowLayoutLogic.usesSideBySideColumns(isRegularHorizontalSizeClass: false))
    }

    // MARK: - Sticky result actions (all widths when in result state)

    func testShowsStickyResultActionsWhenCompactResultAndNotGuestGated() {
        XCTAssertTrue(
            MainFlowLayoutLogic.showsStickyResultActions(
                showsCompactResultLayout: true,
                showsGuestLimitGate: false
            )
        )
    }

    func testHidesStickyResultActionsDuringCreation() {
        XCTAssertFalse(
            MainFlowLayoutLogic.showsStickyResultActions(
                showsCompactResultLayout: false,
                showsGuestLimitGate: false
            )
        )
    }

    func testHidesStickyResultActionsWhenGuestLimitGateActive() {
        XCTAssertFalse(
            MainFlowLayoutLogic.showsStickyResultActions(
                showsCompactResultLayout: true,
                showsGuestLimitGate: true
            )
        )
    }

    // MARK: - Creation vs compact result (showsCompactResultLayout)

    func testShowsCreationLayoutWhenNoSuggestion() {
        XCTAssertFalse(
            MainFlowLayoutLogic.showsCompactResultLayout(
                hasSuggestion: false,
                sourceWardrobeItemId: nil,
                highlightGenerateButton: false
            )
        )
    }

    func testShowsCompactLayoutWhenResultReady() {
        XCTAssertTrue(
            MainFlowLayoutLogic.showsCompactResultLayout(
                hasSuggestion: true,
                sourceWardrobeItemId: nil,
                highlightGenerateButton: false
            )
        )
    }

    func testShowsCreationLayoutWhenWardrobeStylePendingWithHighlightDespiteSuggestion() {
        XCTAssertFalse(
            MainFlowLayoutLogic.showsCompactResultLayout(
                hasSuggestion: true,
                sourceWardrobeItemId: 42,
                highlightGenerateButton: true
            )
        )
    }

    func testShowsCreationLayoutWhenWardrobeItemLoadedWithoutSuggestion() {
        XCTAssertTrue(
            MainFlowLayoutLogic.isWardrobeStylePending(
                sourceWardrobeItemId: 42,
                hasSuggestion: false,
                highlightGenerateButton: false
            )
        )
        XCTAssertFalse(
            MainFlowLayoutLogic.showsCompactResultLayout(
                hasSuggestion: false,
                sourceWardrobeItemId: 42,
                highlightGenerateButton: false
            )
        )
    }
}
