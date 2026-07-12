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
        XCTAssertEqual(
            WardrobeCardUx.pastSuggestionsLoadingMessage,
            "Loading past suggestions for this item…"
        )
    }

    @MainActor
    func testPastSuggestionsLoaderShowsProgressPanelDuringDelayedFetch() async {
        let mock = WardrobePastSuggestionsMockAPIService()
        mock.historyFetchDelayNanos = 200_000_000
        mock.historyResult = .success([
            makeHistoryEntry(id: 1, sourceWardrobeItemId: 42)
        ])
        let loader = WardrobePastSuggestionsLoader(apiService: mock)
        let item = wardrobeItem(id: 42, category: "shirt")

        let loadTask = Task { await loader.open(for: item) }
        try? await Task.sleep(nanoseconds: 50_000_000)

        XCTAssertTrue(loader.showsProgressPanel)
        XCTAssertEqual(loader.loadingItemId, 42)
        XCTAssertEqual(loader.progressOperationType, .pastSuggestions)
        XCTAssertEqual(loader.progressMessage, WardrobeCardUx.pastSuggestionsLoadingMessage)
        XCTAssertEqual(
            WardrobeCardUx.pastSuggestionsProgressPanelAccessibilityIdentifier,
            "ai.progressPanel"
        )
        XCTAssertEqual(
            WardrobeCardUx.pastSuggestionsProgressTitleAccessibilityIdentifier,
            "ai.progressTitle"
        )

        await loadTask.value
        XCTAssertFalse(loader.showsProgressPanel)
        XCTAssertNil(loader.loadingItemId)
        XCTAssertTrue(loader.showSheet)
        XCTAssertEqual(loader.suggestions.count, 1)
    }

    func testHistoryEntryReferencesItemMatchesSourceWardrobeItemId() {
        let item = wardrobeItem(id: 7, category: "shirt")
        let entry = makeHistoryEntry(id: 1, sourceWardrobeItemId: 7)
        XCTAssertTrue(WardrobePastSuggestionsMatching.historyEntryReferencesItem(entry, item: item))
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

    func testMultiSelectRemoveOneItemLeavesRemainingSelectionAndPreviewThumbnail() {
        let validImage = makeBase64TestImage()
        let shirt = wardrobeItem(id: 1, category: "shirt", imageData: validImage)
        let trouser = wardrobeItem(id: 3, category: "trouser", imageData: validImage)
        let items = [shirt, trouser]

        var state = WardrobeMultiSelectState()
        XCTAssertEqual(state.toggle(shirt), .selected)
        XCTAssertEqual(state.toggle(trouser), .selected)
        XCTAssertEqual(state.selectedItemIds, [1, 3])
        XCTAssertEqual(state.selectionSummary(for: items), "2 selected: shirt, trousers")

        state.remove(shirt)

        XCTAssertEqual(state.selectedItemIds, [3])
        XCTAssertTrue(state.canCompleteOutfit)
        XCTAssertEqual(state.selectionSummary(for: items), "1 selected: trousers")

        let thumbnails = WardrobeCompletionThumbnails.thumbnailItemsInOrder(
            selectedItemIds: state.selectedItemIds,
            allItems: items
        )
        XCTAssertEqual(thumbnails.map(\.id), [3])
        XCTAssertEqual(
            WardrobeCompletionThumbnails.thumbnailAccessibilityId(itemId: 3),
            "wardrobe.multiSelect.thumb.3"
        )
        XCTAssertEqual(
            WardrobeCompletionThumbnails.viewImageAccessibilityLabel(for: trouser),
            "View trousers"
        )
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

    private func makeHistoryEntry(id: Int, sourceWardrobeItemId: Int?) -> OutfitHistoryEntry {
        OutfitHistoryEntry(
            id: id,
            created_at: "2026-01-01T00:00:00Z",
            text_input: nil,
            image_data: nil,
            model_image: nil,
            shirt: "white shirt",
            trouser: "black trouser",
            blazer: "black blazer",
            shoes: "black shoes",
            belt: "black belt",
            reasoning: "classic",
            source_wardrobe_item_id: sourceWardrobeItemId
        )
    }
}

@MainActor
private final class WardrobePastSuggestionsMockAPIService: APIServiceProtocol {
    var historyFetchDelayNanos: UInt64 = 0
    var historyResult: Result<[OutfitHistoryEntry], Error> = .success([])
    private(set) var historyCalls = 0

    func getSuggestion(
        image: UIImage,
        textInput: String,
        useWardrobeOnly: Bool,
        generateModelImage: Bool,
        imageModel: String,
        location: String?,
        previousOutfitText: String?,
        sourceWardrobeItemId: Int?,
        occasion: String?,
        season: String?,
        style: String?
    ) async throws -> OutfitSuggestion {
        throw APIServiceError.invalidResponse
    }

    func getSuggestionFromWardrobeItem(
        itemId: Int,
        textInput: String,
        generateModelImage: Bool,
        imageModel: String,
        location: String?,
        occasion: String?,
        season: String?,
        style: String?
    ) async throws -> OutfitSuggestion {
        throw APIServiceError.invalidResponse
    }

    func getSuggestionFromWardrobeItems(
        selectedWardrobeItemIds: [Int],
        textInput: String,
        occasion: String?,
        season: String?,
        style: String?
    ) async throws -> OutfitSuggestion {
        throw APIServiceError.invalidResponse
    }

    func getOutfitHistory(limit: Int) async throws -> [OutfitHistoryEntry] {
        historyCalls += 1
        if historyFetchDelayNanos > 0 {
            try await Task.sleep(nanoseconds: historyFetchDelayNanos)
        }
        return try historyResult.get()
    }

    func checkOutfitDuplicate(image: UIImage) async throws -> OutfitDuplicateResponse {
        OutfitDuplicateResponse(is_duplicate: false, existing_suggestion: nil)
    }

    func getRandomOutfit(occasion: String, season: String, style: String) async throws -> OutfitSuggestion {
        throw APIServiceError.invalidResponse
    }

    func getWardrobeOnlySuggestion(
        occasion: String,
        season: String,
        style: String,
        textInput: String,
        previousOutfitText: String?,
        avoidOutfitTexts: [String]?
    ) async throws -> OutfitSuggestion {
        throw APIServiceError.invalidResponse
    }
}
