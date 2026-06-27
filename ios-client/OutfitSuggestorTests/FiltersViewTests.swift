import XCTest
@testable import OutfitSuggestor

final class FiltersViewTests: XCTestCase {
    func testPreferenceEnumsMatchSpecLabelsAndAPIValuesInOrder() {
        XCTAssertEqual(
            Occasion.allCases.map { "\($0.rawValue)|\($0.apiValue)" },
            [
                "Everyday|everyday",
                "Work|work",
                "Date Night|date-night",
                "Dinner / Night Out|dinner-night-out",
                "Party|party",
                "Wedding Guest|wedding-guest",
                "Formal Event|formal-event",
                "Travel|travel",
                "Workout|workout",
                "Errands|errands",
                "Lounge|lounge",
                "Outdoor|outdoor"
            ]
        )
        XCTAssertEqual(
            Season.allCases.map { "\($0.rawValue)|\($0.apiValue)" },
            [
                "Spring|spring",
                "Summer|summer",
                "Fall|fall",
                "Winter|winter",
                "Transitional|transitional",
                "All Season|all-season"
            ]
        )
        XCTAssertEqual(
            Style.allCases.map { "\($0.rawValue)|\($0.apiValue)" },
            [
                "Classic|classic",
                "Minimal|minimal",
                "Smart Casual|smart-casual",
                "Streetwear|streetwear",
                "Sporty|sporty",
                "Preppy|preppy",
                "Boho|boho",
                "Edgy|edgy",
                "Romantic|romantic",
                "Trendy|trendy",
                "Vintage|vintage",
                "Elegant|elegant"
            ]
        )
    }

    func testOutfitFiltersDefaultsMatchSpecAPIValues() {
        let filters = OutfitFilters()

        XCTAssertEqual(filters.occasion, "everyday")
        XCTAssertEqual(filters.season, "all-season")
        XCTAssertEqual(filters.style, "classic")
        XCTAssertEqual(
            filters.description,
            "Occasion: everyday, Season: all-season, Style: classic"
        )
    }

    func testOldPreferenceValuesAreRemoved() {
        let occasionLabels = Set(Occasion.allCases.map(\.rawValue))
        let occasionAPIValues = Set(Occasion.allCases.map(\.apiValue))
        let seasonLabels = Set(Season.allCases.map(\.rawValue))
        let seasonAPIValues = Set(Season.allCases.map(\.apiValue))
        let styleLabels = Set(Style.allCases.map(\.rawValue))
        let styleAPIValues = Set(Style.allCases.map(\.apiValue))

        XCTAssertTrue(occasionLabels.isDisjoint(with: ["Casual", "Business", "Formal", "Sports/Active"]))
        XCTAssertTrue(occasionAPIValues.isDisjoint(with: ["casual", "business", "formal", "date", "sports"]))
        XCTAssertFalse(seasonLabels.contains("All Seasons"))
        XCTAssertFalse(seasonAPIValues.contains("all"))
        XCTAssertTrue(styleLabels.isDisjoint(with: ["Businees Casual", "Business Casual", "Casual", "Modern", "Minimalist", "Bold"]))
        XCTAssertTrue(styleAPIValues.isDisjoint(with: ["business casual", "casual", "modern", "minimalist", "bold"]))
    }

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

    func testNotesDisplaySummaryUsesHasNotesLabelWhenNonEmpty() {
        XCTAssertEqual(FiltersView.notesDisplaySummary(for: ""), "Add notes")
        XCTAssertEqual(FiltersView.notesDisplaySummary(for: "   "), "Add notes")
        XCTAssertEqual(FiltersView.notesDisplaySummary(for: "no sneakers"), "Has notes")
    }

    func testWardrobeCompletionFilterAccessibilityPrefix() {
        XCTAssertEqual(
            FiltersView.GridContract.filterAccessibilityId(for: "Season", prefix: "wardrobe.completion"),
            "wardrobe.completion.filter.season"
        )
    }
}
