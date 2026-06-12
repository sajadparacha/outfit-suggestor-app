import XCTest
@testable import OutfitSuggestor

final class FiltersViewTests: XCTestCase {
    func testGridFieldTitlesExcludeColors() {
        XCTAssertEqual(FiltersView.GridContract.fieldTitles, ["Occasion", "Season", "Style", "Notes"])
        XCTAssertFalse(FiltersView.GridContract.fieldTitles.contains("Colors"))
    }

    func testGridFilterAccessibilityIds() {
        XCTAssertEqual(
            FiltersView.GridContract.filterAccessibilityId(for: "Occasion"),
            "home.filter.occasion"
        )
        XCTAssertEqual(
            FiltersView.GridContract.filterAccessibilityId(for: "Notes"),
            "home.filter.notes"
        )
        XCTAssertNil(FiltersView.GridContract.fieldTitles.first { title in
            FiltersView.GridContract.filterAccessibilityId(for: title).contains("colors")
        })
    }

    func testWardrobeOnlyCheckboxContract() {
        XCTAssertEqual(FiltersView.GridContract.wardrobeOnlyTitle, "Use my wardrobe only")
        XCTAssertEqual(
            FiltersView.GridContract.wardrobeOnlyCheckboxAccessibilityId,
            "main.wardrobeOnlyCheckbox"
        )
        XCTAssertEqual(
            MicroHelpCopy.wardrobeOnly,
            "Only recommend items from your saved wardrobe."
        )
    }

    func testShouldShowWardrobeOnlyCheckboxRequiresAuthAndBinding() {
        XCTAssertTrue(
            FiltersView.GridContract.shouldShowWardrobeOnlyCheckbox(
                showWardrobeOnly: true,
                bindingProvided: true
            )
        )
        XCTAssertFalse(
            FiltersView.GridContract.shouldShowWardrobeOnlyCheckbox(
                showWardrobeOnly: false,
                bindingProvided: true
            )
        )
        XCTAssertFalse(
            FiltersView.GridContract.shouldShowWardrobeOnlyCheckbox(
                showWardrobeOnly: true,
                bindingProvided: false
            )
        )
    }
}
