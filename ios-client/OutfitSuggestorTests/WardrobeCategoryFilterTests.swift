import XCTest
@testable import OutfitSuggestor

final class WardrobeCategoryFilterTests: XCTestCase {
    private var sampleItems: [WardrobeItem] {
        [
            wardrobeItem(category: "shirt"),
            wardrobeItem(category: "shirt"),
            wardrobeItem(category: "polo"),
            wardrobeItem(category: "t_shirt"),
            wardrobeItem(category: "jeans"),
            wardrobeItem(category: "jeans"),
            wardrobeItem(category: "shorts"),
            wardrobeItem(category: "blazer"),
            wardrobeItem(category: "jacket"),
            wardrobeItem(category: "shoes"),
            wardrobeItem(category: "belt"),
            wardrobeItem(category: "sweater"),
            wardrobeItem(category: "tie"),
            wardrobeItem(category: "watch"),
        ]
    }

    func testWardrobeCategoryLabelReturnsHumanReadableLabels() {
        XCTAssertEqual(WardrobeCategoryDisplay.wardrobeCategoryLabel("t_shirt"), "T-shirt")
        XCTAssertEqual(WardrobeCategoryDisplay.wardrobeCategoryLabel("t-shirt"), "T-shirt")
        XCTAssertEqual(WardrobeCategoryDisplay.wardrobeCategoryLabel("polo"), "Polo")
        XCTAssertEqual(WardrobeCategoryDisplay.wardrobeCategoryLabel("jeans"), "Jeans")
        XCTAssertEqual(WardrobeCategoryDisplay.wardrobeCategoryLabel("trouser"), "Trousers")
        XCTAssertEqual(WardrobeCategoryDisplay.wardrobeCategoryLabel("jacket"), "Jacket")
    }

    func testWardrobeCategoryLabelReturnsOtherForUnrecognizedCategories() {
        XCTAssertEqual(WardrobeCategoryDisplay.wardrobeCategoryLabel("watch"), "Other")
    }

    func testMatchesCategoryFilterGroupedCoreShirtCategories() {
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("shirt", filter: "shirt"))
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("polo", filter: "shirt"))
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("t_shirt", filter: "shirt"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("jeans", filter: "shirt"))
    }

    func testMatchesCategoryFilterGroupedCoreTrouserCategories() {
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("jeans", filter: "trouser"))
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("shorts", filter: "trouser"))
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("pants", filter: "trouser"))
    }

    func testMatchesCategoryFilterExactExtendedCategoriesOnly() {
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("polo", filter: "polo"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("shirt", filter: "polo"))
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("t-shirt", filter: "t_shirt"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("shirt", filter: "t_shirt"))
    }

    func testMatchesCategoryFilterOtherBucketForUnrecognizedCategories() {
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("watch", filter: "other"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("polo", filter: "other"))
    }

    func testRebuildCategoryCountsGroupsCoreAndCountsExtendedExactly() {
        let counts = WardrobeCategoryDisplay.rebuildCategoryCounts(from: sampleItems)

        XCTAssertEqual(counts["shirt"], 4)
        XCTAssertEqual(counts["trouser"], 3)
        XCTAssertEqual(counts["blazer"], 1)
        XCTAssertEqual(counts["polo"], 1)
        XCTAssertEqual(counts["t_shirt"], 1)
        XCTAssertEqual(counts["jeans"], 2)
        XCTAssertEqual(counts["shorts"], 1)
        XCTAssertEqual(counts["sweater"], 1)
        XCTAssertEqual(counts["jacket"], 1)
        XCTAssertEqual(counts["tie"], 1)
        XCTAssertEqual(counts["other"], 1)
    }

    func testVisibleFilterChipsAlwaysIncludesCoreAndHidesZeroCountExtended() {
        let counts = WardrobeCategoryDisplay.rebuildCategoryCounts(from: sampleItems)
        let keys = WardrobeCategoryDisplay.visibleFilterChipKeys(from: counts)
        let labels = keys.map { WardrobeCategoryDisplay.filterChipLabel(for: $0) }

        XCTAssertEqual(keys.first, "All")
        XCTAssertTrue(labels.contains("Shirt"))
        XCTAssertTrue(labels.contains("Trousers"))
        XCTAssertTrue(labels.contains("Blazer"))
        XCTAssertTrue(labels.contains("Shoes"))
        XCTAssertTrue(labels.contains("Belt"))
        XCTAssertTrue(labels.contains("Polo"))
        XCTAssertTrue(labels.contains("T-shirt"))
        XCTAssertTrue(labels.contains("Jeans"))
        XCTAssertTrue(labels.contains("Shorts"))
        XCTAssertTrue(labels.contains("Sweater"))
        XCTAssertTrue(labels.contains("Jacket"))
        XCTAssertTrue(labels.contains("Tie"))
        XCTAssertTrue(labels.contains("Other"))
    }

    func testVisibleFilterChipsHidesExtendedWhenCountIsZero() {
        let counts = WardrobeCategoryDisplay.rebuildCategoryCounts(from: [
            wardrobeItem(category: "shirt"),
            wardrobeItem(category: "trouser"),
        ])
        let labels = WardrobeCategoryDisplay.visibleFilterChipKeys(from: counts)
            .map { WardrobeCategoryDisplay.filterChipLabel(for: $0) }

        XCTAssertEqual(labels, ["All", "Shirt", "Trousers", "Blazer", "Shoes", "Belt"])
    }

    func testMatchesCategoryFilterBlazerExcludesJacket() {
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("blazer", filter: "blazer"))
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("suit", filter: "blazer"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("jacket", filter: "blazer"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("jackets", filter: "blazer"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("coat", filter: "blazer"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("jacket", filter: "shirt"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("coat", filter: "shirt"))
    }

    func testMatchesCategoryFilterJacketExtendedChipIncludesJacketOnly() {
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("jacket", filter: "jacket"))
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("jackets", filter: "jacket"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("blazer", filter: "jacket"))
    }

    func testRebuildCategoryCountsSeparatesBlazerAndJacket() {
        let counts = WardrobeCategoryDisplay.rebuildCategoryCounts(from: [
            wardrobeItem(category: "blazer"),
            wardrobeItem(category: "jacket"),
            wardrobeItem(category: "suit"),
        ])

        XCTAssertEqual(counts["blazer"], 2)
        XCTAssertEqual(counts["jacket"], 1)
    }

    func testFilterChipCountFromSummaryMatchesWebGrouping() {
        let summary = WardrobeSummary(
            total_items: 73,
            by_category: [
                "shirt": 20,
                "polo": 5,
                "jeans": 1,
                "blazer": 3,
                "jacket": 4,
                "shoes": 19,
            ],
            by_color: [:],
            categories: []
        )

        XCTAssertEqual(WardrobeCategoryDisplay.filterChipCount(from: summary, filterKey: "All"), 73)
        XCTAssertEqual(WardrobeCategoryDisplay.filterChipCount(from: summary, filterKey: "shirt"), 25)
        XCTAssertEqual(WardrobeCategoryDisplay.filterChipCount(from: summary, filterKey: "trouser"), 1)
        XCTAssertEqual(WardrobeCategoryDisplay.filterChipCount(from: summary, filterKey: "blazer"), 3)
        XCTAssertEqual(WardrobeCategoryDisplay.filterChipCount(from: summary, filterKey: "jacket"), 4)

        let labels = WardrobeCategoryDisplay.visibleFilterChipKeys(from: summary)
            .map { WardrobeCategoryDisplay.filterChipLabel(for: $0) }
        XCTAssertTrue(labels.contains("Jacket"))
        XCTAssertFalse(labels.contains("T-shirt"))
    }

    func testRebuildCategoryCountsFromSummary() {
        let summary = WardrobeSummary(
            total_items: 10,
            by_category: ["jacket": 4, "blazer": 2],
            by_color: [:],
            categories: []
        )
        let counts = WardrobeCategoryDisplay.rebuildCategoryCounts(from: summary)
        XCTAssertEqual(counts["jacket"], 4)
        XCTAssertEqual(counts["blazer"], 2)
    }

    func testCompletionSlotNormalizationMapsJacketCoatAndSweater() {
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "polo"), .shirt)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "t_shirt"), .shirt)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "t-shirt"), .shirt)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "jeans"), .trouser)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "shorts"), .trouser)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "blazer"), .blazer)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "suit"), .blazer)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "jacket"), .outerwear)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "jackets"), .outerwear)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "coat"), .outerwear)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "coats"), .outerwear)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "outerwear"), .outerwear)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "sweater"), .sweater)
        XCTAssertEqual(WardrobeCompletionSlot.normalized(from: "sweaters"), .sweater)
        XCTAssertNil(WardrobeCompletionSlot.normalized(from: "tie"))
    }

    func testMultiSelectUpperBodyExclusivityRejectsBlazerWithOuterwear() {
        var state = WardrobeMultiSelectState()
        let blazer = wardrobeItem(id: 1, category: "blazer")
        let jacket = wardrobeItem(id: 2, category: "jacket")

        XCTAssertEqual(state.toggle(blazer), .selected)
        XCTAssertEqual(state.toggle(jacket), .upperBodySlotConflict)
        XCTAssertEqual(state.selectedCount, 1)
    }

    func testMultiSelectUpperBodyExclusivityRejectsSweaterWithBlazer() {
        var state = WardrobeMultiSelectState()
        let blazer = wardrobeItem(id: 10, category: "blazer")
        let sweater = wardrobeItem(id: 11, category: "sweater")

        XCTAssertEqual(state.toggle(blazer), .selected)
        XCTAssertEqual(state.toggle(sweater), .upperBodySlotConflict)
        XCTAssertEqual(state.selectedCount, 1)
    }

    func testMultiSelectUpperBodyExclusivityAllowsReplacingAfterDeselect() {
        var state = WardrobeMultiSelectState()
        let blazer = wardrobeItem(id: 20, category: "blazer")
        let coat = wardrobeItem(id: 21, category: "coat")

        XCTAssertEqual(state.toggle(blazer), .selected)
        XCTAssertEqual(state.toggle(blazer), .deselected)
        XCTAssertEqual(state.toggle(coat), .selected)
        XCTAssertEqual(state.selectedCount, 1)
    }

    func testMultiSelectUpperBodyConflictMessage() {
        XCTAssertEqual(
            WardrobeMultiSelectToggleResult.upperBodySlotConflict.message,
            "Choose only one of blazer, outerwear, or sweater"
        )
    }

    func testMultiSelectMaximumFiveItemsUnchanged() {
        XCTAssertEqual(WardrobeMultiSelectState.maximumSelectedItems, 5)

        var state = WardrobeMultiSelectState()
        let shirt = wardrobeItem(id: 101, category: "shirt")
        let trouser = wardrobeItem(id: 102, category: "trouser")
        let blazer = wardrobeItem(id: 103, category: "blazer")
        let shoes = wardrobeItem(id: 104, category: "shoes")
        let belt = wardrobeItem(id: 105, category: "belt")
        let jacket = wardrobeItem(id: 106, category: "jacket")

        for item in [shirt, trouser, blazer, shoes, belt] {
            XCTAssertEqual(state.toggle(item), .selected)
        }
        XCTAssertEqual(state.selectedCount, 5)
        XCTAssertEqual(
            WardrobeMultiSelectToggleResult.maximumReached.message,
            "Select up to 5 items"
        )
        XCTAssertEqual(state.toggle(jacket), .upperBodySlotConflict)
        XCTAssertEqual(state.selectedCount, 5)
    }

    func testMatchesCategoryFilterCoatExtendedChip() {
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("coat", filter: "coat"))
        XCTAssertTrue(WardrobeCategoryDisplay.matchesCategoryFilter("coats", filter: "coat"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("blazer", filter: "coat"))
        XCTAssertFalse(WardrobeCategoryDisplay.matchesCategoryFilter("jacket", filter: "coat"))
    }

    func testWardrobeCategoryLabelReturnsCoatLabel() {
        XCTAssertEqual(WardrobeCategoryDisplay.wardrobeCategoryLabel("coat"), "Coat")
        XCTAssertEqual(WardrobeCategoryDisplay.wardrobeCategoryLabel("coats"), "Coat")
    }

    func testCategoryFilterChipTapPreservesSelectionWhenCountPositive() {
        let counts = WardrobeCategoryDisplay.rebuildCategoryCounts(from: sampleItems)
        let total = sampleItems.count

        for chip in ["shirt", "trouser", "polo"] {
            let count = countForCategory(chip, counts: counts, total: total)
            XCTAssertGreaterThan(count, 0, "\(chip) should have a positive count in sample wardrobe")

            let selected = categoryFilterAfterChipTap(tapped: chip, counts: counts, total: total)
            XCTAssertEqual(selected, chip, "Tapping \(chip) with items should keep that filter active")
        }
    }

    func testCategoryFilterChipTapResetsToAllOnlyWhenCountIsZero() {
        let counts = WardrobeCategoryDisplay.rebuildCategoryCounts(from: [
            wardrobeItem(category: "shirt"),
        ])
        let total = 1

        XCTAssertEqual(
            categoryFilterAfterChipTap(tapped: "blazer", counts: counts, total: total),
            "All"
        )
        XCTAssertEqual(
            categoryFilterAfterChipTap(tapped: "shirt", counts: counts, total: total),
            "shirt"
        )
    }

    func testCategoryFilterSurvivesReloadWhenCountPositive() {
        let counts = WardrobeCategoryDisplay.rebuildCategoryCounts(from: sampleItems)
        let total = sampleItems.count

        for chip in ["shirt", "trouser", "polo"] {
            let preserved = categoryFilterAfterReload(current: chip, counts: counts, total: total)
            XCTAssertEqual(preserved, chip, "Reload should preserve \(chip) when count > 0")
        }
    }

    func testCoreFilterChipKeysMatchFilterBehavior() {
        let counts = WardrobeCategoryDisplay.rebuildCategoryCounts(from: sampleItems)

        for chip in WardrobeCategoryDisplay.coreFilterChips {
            let matchingItems = sampleItems.filter {
                WardrobeCategoryDisplay.matchesCategoryFilter($0.category, filter: chip.key)
            }
            let count = counts[chip.key] ?? 0

            XCTAssertEqual(
                count,
                matchingItems.count,
                "Count for core chip \(chip.key) should match filtered items"
            )
            XCTAssertGreaterThan(
                count,
                0,
                "Sample wardrobe should include items for core chip \(chip.key)"
            )
        }
    }

    /// Mirrors `WardrobeListView.countForCategory` — categoryCounts keys are lowercase chip keys.
    private func countForCategory(_ category: String, counts: [String: Int], total: Int) -> Int {
        if category == "All" {
            return total
        }
        return counts[category.lowercased()] ?? 0
    }

    /// Mirrors chip tap handler in `WardrobeListView.categoryFilterChips`.
    private func categoryFilterAfterChipTap(
        tapped: String,
        counts: [String: Int],
        total: Int
    ) -> String {
        if tapped != "All" && countForCategory(tapped, counts: counts, total: total) == 0 {
            return "All"
        }
        return tapped
    }

    /// Mirrors post-load reset guard in `WardrobeListView.load`.
    private func categoryFilterAfterReload(
        current: String,
        counts: [String: Int],
        total: Int
    ) -> String {
        if current != "All" && countForCategory(current, counts: counts, total: total) == 0 {
            return "All"
        }
        return current
    }

    private func wardrobeItem(id: Int? = nil, category: String) -> WardrobeItem {
        WardrobeItem(
            id: id ?? Int.random(in: 1...9999),
            category: category,
            name: category,
            description: nil,
            color: nil
        )
    }
}
