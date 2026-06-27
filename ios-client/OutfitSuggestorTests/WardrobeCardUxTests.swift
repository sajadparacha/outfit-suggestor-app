import XCTest
import UIKit
@testable import OutfitSuggestor

final class WardrobeCardUxTests: XCTestCase {
    func testStyleThisItemCopy() {
        XCTAssertEqual(WardrobeCardUx.styleThisItemTitle, "Style this item")
        XCTAssertEqual(WardrobeCardUx.styleThisItemAccessibilityLabel, "Style this item with AI")
    }

    func testPastSuggestionsCopy() {
        XCTAssertEqual(WardrobeCardUx.pastSuggestionsTitle, "Past Suggestions")
        XCTAssertEqual(WardrobeCardUx.pastSuggestionsAccessibilityLabel, "Past Suggestions")
    }

    func testMenuActionsOrderIncludesHistory() {
        XCTAssertEqual(
            WardrobeCardUx.menuActionsOrder.map(\.title),
            ["View image", "Edit", "Past Suggestions", "Delete"]
        )
        XCTAssertEqual(WardrobeCardUx.menuActionsOrder.map(\.rawValue), [
            "viewImage", "edit", "history", "delete"
        ])
        XCTAssertTrue(WardrobeCardUx.menuActionsOrder.contains(.history))
        XCTAssertEqual(WardrobeCardMenuAction.history.title, "Past Suggestions")
    }

    /// Wardrobe cards live in a LazyVStack; WardrobeCardView uses native SwiftUI `Menu`.
    /// UIKit presents the popover above sibling cards — not clipped by card `clipShape`
    /// or hidden behind the next row (web absolute-menu z-index bug does not apply).
    func testOverflowMenuActionsAccessibleViaNativePresentation() {
        let itemId = 99
        let actions = WardrobeCardUx.menuActionsOrder
        XCTAssertEqual(actions.count, 4)
        XCTAssertEqual(
            actions.map { WardrobeCardUx.menuItemIdentifier(itemId: itemId, action: $0) },
            [
                "wardrobe.menu.viewImage.\(itemId)",
                "wardrobe.menu.edit.\(itemId)",
                "wardrobe.menu.history.\(itemId)",
                "wardrobe.menu.delete.\(itemId)",
            ]
        )
        XCTAssertEqual(
            WardrobeCardUx.menuTriggerIdentifier(itemId: itemId),
            "wardrobe.itemMenu.\(itemId)"
        )
    }

    func testMenuTriggerAccessibilityLabel() {
        XCTAssertEqual(WardrobeCardUx.menuTriggerAccessibilityLabel, "More actions")
    }

    func testAccessibilityIdentifiersUseStablePrefixes() {
        XCTAssertEqual(WardrobeCardUx.heroButtonIdentifier(itemId: 42), "wardrobe.getSuggestion.42")
        XCTAssertEqual(
            WardrobeCardUx.pastSuggestionsButtonIdentifier(itemId: 42),
            "wardrobe.pastSuggestions.42"
        )
        XCTAssertEqual(WardrobeCardUx.menuTriggerIdentifier(itemId: 7), "wardrobe.itemMenu.7")
        XCTAssertEqual(
            WardrobeCardUx.menuItemIdentifier(itemId: 3, action: .viewImage),
            "wardrobe.menu.viewImage.3"
        )
        XCTAssertEqual(
            WardrobeCardUx.menuItemIdentifier(itemId: 3, action: .history),
            "wardrobe.menu.history.3"
        )
        XCTAssertEqual(
            WardrobeCardUx.menuItemIdentifier(itemId: 3, action: .delete),
            "wardrobe.menu.delete.3"
        )
    }

    func testFlowTipMentionsStyleThisItem() {
        XCTAssertTrue(WardrobeCardUx.flowTipStep2Fragment.contains("Style this item"))
    }

    func testMultiSelectAllowsOneEligibleItem() {
        var state = WardrobeMultiSelectState()
        let shirt = wardrobeItem(id: 1, category: "shirt")

        XCTAssertEqual(state.actionTitle, "Select at least 1 item")
        XCTAssertFalse(state.canCompleteOutfit)
        XCTAssertEqual(state.toggle(shirt), .selected)
        XCTAssertTrue(state.canCompleteOutfit)
        XCTAssertEqual(state.actionTitle, "Complete outfit with AI")
        XCTAssertEqual(state.selectedItemIds, [1])
    }

    func testMultiSelectAllowsMultipleUniqueSlotsAndPreventsDuplicates() {
        var state = WardrobeMultiSelectState()
        let shirt = wardrobeItem(id: 1, category: "shirt")
        let duplicateShirt = wardrobeItem(id: 2, category: "shirt")
        let trouser = wardrobeItem(id: 3, category: "trouser")

        XCTAssertEqual(state.toggle(shirt), .selected)
        XCTAssertEqual(state.toggle(duplicateShirt), .duplicateSlot)
        XCTAssertEqual(state.toggle(duplicateShirt).message, "Choose one item per outfit slot")
        XCTAssertEqual(state.selectedItemIds, [1])

        XCTAssertEqual(state.toggle(trouser), .selected)
        XCTAssertTrue(state.canCompleteOutfit)
        XCTAssertEqual(state.actionTitle, "Complete outfit with AI")
        XCTAssertEqual(state.selectedItemIds, [1, 3])
    }

    func testMultiSelectAllowsUpToFiveUniqueSlots() {
        var state = WardrobeMultiSelectState()
        let items = [
            wardrobeItem(id: 1, category: "shirt"),
            wardrobeItem(id: 2, category: "trouser"),
            wardrobeItem(id: 3, category: "blazer"),
            wardrobeItem(id: 4, category: "shoes"),
            wardrobeItem(id: 5, category: "belt")
        ]

        for item in items {
            XCTAssertEqual(state.toggle(item), .selected)
        }

        XCTAssertEqual(WardrobeMultiSelectState.maximumSelectedItems, 5)
        XCTAssertEqual(state.selectedCount, 5)
        XCTAssertEqual(state.selectedItemIds, [1, 2, 3, 4, 5])
        XCTAssertTrue(state.canCompleteOutfit)
    }

    func testMultiSelectRejectsUnsupportedCategories() {
        var state = WardrobeMultiSelectState()
        let hat = wardrobeItem(id: 5, category: "hat")

        XCTAssertFalse(state.isEligible(hat))
        XCTAssertEqual(state.toggle(hat), .unsupportedCategory)
        XCTAssertTrue(state.selectedItemIds.isEmpty)
    }

    func testMultiSelectSelectionSummaryUsesSlotNames() {
        var state = WardrobeMultiSelectState()
        let shirt = wardrobeItem(id: 1, category: "shirt")
        let trouser = wardrobeItem(id: 3, category: "trouser")
        let items = [shirt, trouser]

        XCTAssertEqual(state.selectionSummary(for: items), WardrobeCompletionCopy.noItemsSelected)
        XCTAssertEqual(state.toggle(shirt), .selected)
        XCTAssertEqual(state.selectionSummary(for: items), "1 selected: shirt")
        XCTAssertEqual(state.toggle(trouser), .selected)
        XCTAssertEqual(state.selectionSummary(for: items), "2 selected: shirt, trousers")
    }

    func testWardrobeCompletionPreferencesCopyContract() {
        XCTAssertEqual(WardrobeCompletionCopy.noItemsSelected, "No items selected")
        XCTAssertEqual(WardrobeCompletionCopy.sharedPreferencesHint, InsightsCopy.sharedPreferencesNote)
        XCTAssertEqual(
            WardrobeCompletionCopy.filterAccessibilityId(for: "Occasion"),
            "wardrobe.completion.filter.occasion"
        )
        XCTAssertEqual(
            WardrobeCompletionCopy.filterAccessibilityId(for: "Notes"),
            "wardrobe.completion.filter.notes"
        )
        XCTAssertEqual(
            WardrobeCompletionCopy.preferencesPanelAccessibilityId,
            "wardrobe.completion.preferences"
        )
        XCTAssertEqual(
            WardrobeCompletionCopy.wardrobeOnlyCheckboxAccessibilityId,
            "wardrobe.completion.wardrobeOnlyCheckbox"
        )
    }

    func testCompletionThumbnailSelectedItemsPreserveSelectionOrder() {
        let items = [
            wardrobeItem(id: 1, category: "shirt"),
            wardrobeItem(id: 2, category: "trouser"),
            wardrobeItem(id: 3, category: "blazer")
        ]
        let ordered = WardrobeCompletionThumbnails.selectedItemsInOrder(
            selectedItemIds: [3, 1],
            allItems: items
        )
        XCTAssertEqual(ordered.map(\.id), [3, 1])
    }

    func testCompletionThumbnailItemsFilterMissingOrInvalidImageData() {
        let validImage = makeBase64TestImage()
        let items = [
            wardrobeItem(id: 1, category: "shirt", imageData: validImage),
            wardrobeItem(id: 2, category: "trouser", imageData: nil),
            wardrobeItem(id: 3, category: "blazer", imageData: "not-valid-base64"),
            wardrobeItem(id: 4, category: "shoes", imageData: validImage)
        ]
        let thumbnails = WardrobeCompletionThumbnails.thumbnailItemsInOrder(
            selectedItemIds: [2, 1, 3, 4],
            allItems: items
        )
        XCTAssertEqual(thumbnails.map(\.id), [1, 4])
    }

    func testCompletionThumbnailAccessibilityIdentifiers() {
        XCTAssertEqual(WardrobeCompletionThumbnails.rowAccessibilityId, "wardrobe.multiSelect.thumbnails")
        XCTAssertEqual(WardrobeCompletionThumbnails.thumbnailAccessibilityId(itemId: 42), "wardrobe.multiSelect.thumb.42")
        XCTAssertEqual(
            WardrobeCompletionThumbnails.viewImageAccessibilityLabel(for: wardrobeItem(id: 1, category: "shirt")),
            "View shirt"
        )
        XCTAssertEqual(
            WardrobeCompletionThumbnails.viewImageAccessibilityLabel(for: wardrobeItem(id: 3, category: "trouser")),
            "View trousers"
        )
    }

    func testHasDecodableImageDataAcceptsValidBase64Payload() {
        let payload = makeBase64TestImage()
        XCTAssertTrue(WardrobeCompletionThumbnails.hasDecodableImageData(payload))
        XCTAssertFalse(WardrobeCompletionThumbnails.hasDecodableImageData(nil))
        XCTAssertFalse(WardrobeCompletionThumbnails.hasDecodableImageData(""))
        XCTAssertFalse(WardrobeCompletionThumbnails.hasDecodableImageData("not-valid-base64"))
    }

    private func wardrobeItem(id: Int, category: String, imageData: String? = nil) -> WardrobeItem {
        WardrobeItem(
            id: id,
            category: category,
            name: "\(category) \(id)",
            description: nil,
            color: nil,
            image_data: imageData
        )
    }

    private func makeBase64TestImage() -> String {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 8, height: 8))
        let image = renderer.image { context in
            UIColor.systemBlue.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 8, height: 8))
        }
        return image.pngData()!.base64EncodedString()
    }
}
