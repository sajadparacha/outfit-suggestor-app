import XCTest
@testable import OutfitSuggestor

/// Integration: Add-to-completion from a card enters selection mode then toggles slots.
final class WardrobeCompleteOutfitCardIntegrationTests: XCTestCase {
    func testFirstCardTapEntersSelectionThenSelectsItem() {
        var isCompletionSelectionMode = false
        var completionSelection = WardrobeMultiSelectState()
        var completionSelectionMessage: String?
        let shirt = WardrobeItem(id: 1, category: "shirt", description: "Oxford", color: "Blue")

        // Mirrors WardrobeListView.toggleCompletionSelection
        if WardrobeCompleteOutfitCardAction.shouldEnterSelectionMode(isCurrentlyInMode: isCompletionSelectionMode) {
            isCompletionSelectionMode = true
            completionSelection.clear()
            completionSelectionMessage = nil
        }
        let result = completionSelection.toggle(shirt)
        completionSelectionMessage = result.message

        XCTAssertTrue(isCompletionSelectionMode)
        XCTAssertEqual(result, .selected)
        XCTAssertEqual(completionSelection.selectedItemIds, [1])
        XCTAssertTrue(completionSelection.canCompleteOutfit)
        XCTAssertEqual(
            WardrobeCompleteOutfitCardAction.resolve(
                isEligible: completionSelection.isEligible(shirt),
                isSelected: completionSelection.isSelected(shirt)
            ),
            .remove
        )
        XCTAssertNil(completionSelectionMessage)
    }

    func testSecondTapOnSameItemRemovesFromCompletion() {
        var isCompletionSelectionMode = true
        var completionSelection = WardrobeMultiSelectState()
        let shirt = WardrobeItem(id: 1, category: "shirt", description: "Oxford", color: "Blue")
        XCTAssertEqual(completionSelection.toggle(shirt), .selected)

        if WardrobeCompleteOutfitCardAction.shouldEnterSelectionMode(isCurrentlyInMode: isCompletionSelectionMode) {
            isCompletionSelectionMode = true
            completionSelection.clear()
        }
        let result = completionSelection.toggle(shirt)

        XCTAssertTrue(isCompletionSelectionMode)
        XCTAssertEqual(result, .deselected)
        XCTAssertTrue(completionSelection.selectedItemIds.isEmpty)
        XCTAssertEqual(
            WardrobeCompleteOutfitCardAction.resolve(
                isEligible: true,
                isSelected: completionSelection.isSelected(shirt)
            ),
            .add
        )
    }

    func testWeekPlanPickModeHidesCompleteOutfitButton() {
        XCTAssertFalse(
            WardrobeCompleteOutfitCardAction.shouldShowCompleteOutfitButton(
                hasCompletionHandler: true,
                isWeekPlanPickMode: true
            )
        )
    }

    func testIneligibleCategoryShowsUnavailableAction() {
        let hat = WardrobeItem(id: 9, category: "hat")
        var state = WardrobeMultiSelectState()
        XCTAssertFalse(state.isEligible(hat))
        XCTAssertEqual(
            WardrobeCompleteOutfitCardAction.resolve(isEligible: state.isEligible(hat), isSelected: false),
            .unavailable
        )
    }

    func testEnteringSelectionClearsPriorSelectionBeforeNewToggle() {
        var isCompletionSelectionMode = false
        var completionSelection = WardrobeMultiSelectState()
        let shirt = WardrobeItem(id: 1, category: "shirt")
        let trouser = WardrobeItem(id: 2, category: "trouser")
        _ = completionSelection.toggle(shirt)
        XCTAssertEqual(completionSelection.selectedItemIds, [1])

        // Simulate leaving mode then tapping Add on a different card
        isCompletionSelectionMode = false
        if WardrobeCompleteOutfitCardAction.shouldEnterSelectionMode(isCurrentlyInMode: isCompletionSelectionMode) {
            isCompletionSelectionMode = true
            completionSelection.clear()
        }
        XCTAssertTrue(completionSelection.selectedItemIds.isEmpty)
        XCTAssertEqual(completionSelection.toggle(trouser), .selected)
        XCTAssertEqual(completionSelection.selectedItemIds, [2])
    }
}
