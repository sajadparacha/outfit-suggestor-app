import XCTest
@testable import OutfitSuggestor

/// Uploaded jacket/coat fallback copy — mirrors backend `_outerwear_upload_text`.
/// No user-visible string may contain an "(uploaded item)" placeholder.
final class OutfitLayerExclusivityTests: XCTestCase {
    private func makeSuggestion(
        blazer: String = "",
        outerwear: String? = nil,
        outerwearId: Int? = nil,
        sourceWardrobeItemId: Int? = nil,
        uploadCategory: String? = "outerwear",
        matchingItems: MatchingWardrobeItems? = nil
    ) -> OutfitSuggestion {
        OutfitSuggestion(
            shirt: "White oxford",
            trouser: "Navy chinos",
            blazer: blazer,
            shoes: "Brown loafers",
            belt: "Brown belt",
            reasoning: "Test look.",
            matching_wardrobe_items: matchingItems,
            upload_matched_category: uploadCategory,
            outerwear: outerwear,
            outerwear_id: outerwearId,
            source_wardrobe_item_id: sourceWardrobeItemId
        )
    }

    private func matchingItems(
        outerwear: [MatchingWardrobeItem]? = nil,
        blazer: [MatchingWardrobeItem]? = nil
    ) -> MatchingWardrobeItems {
        MatchingWardrobeItems(
            shirt: nil,
            trouser: nil,
            blazer: blazer,
            shoes: nil,
            belt: nil,
            sweater: nil,
            outerwear: outerwear,
            tie: nil
        )
    }

    private func assertNoUploadPlaceholder(_ text: String?, file: StaticString = #filePath, line: UInt = #line) {
        let lower = (text ?? "").lowercased()
        XCTAssertFalse(lower.contains("uploaded item"), "leaked placeholder: \(text ?? "nil")", file: file, line: line)
        XCTAssertFalse(lower.contains("uploaded image"), "leaked placeholder: \(text ?? "nil")", file: file, line: line)
        XCTAssertFalse(lower.contains("your upload"), "leaked placeholder: \(text ?? "nil")", file: file, line: line)
    }

    // MARK: - Photo phrase fallback

    func testFallbackReturnsPhotoPhraseInsteadOfUploadedItemPlaceholder() {
        let suggestion = makeSuggestion()

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion)

        XCTAssertEqual(text, "The jacket in your photo")
        assertNoUploadPlaceholder(text)
    }

    func testFallbackUsesCoatLabelWhenSourceCategoryIsCoat() {
        let suggestion = makeSuggestion()

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(
            suggestion: suggestion,
            sourceWardrobeCategory: "coat"
        )

        XCTAssertEqual(text, "The coat in your photo")
        assertNoUploadPlaceholder(text)
    }

    func testFallbackKeepsOuterwearCardVisibleForPhotoUpload() {
        let suggestion = makeSuggestion()

        XCTAssertTrue(OutfitLayerExclusivity.shouldShowAnchoredOuterwearInCoreGrid(suggestion: suggestion))
        XCTAssertNotNil(OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion))
    }

    // MARK: - Priority chain

    func testWardrobeDescriptionWins() {
        let item = MatchingWardrobeItem(
            id: 9,
            category: "jacket",
            color: "Navy",
            description: "Navy wool overcoat",
            image_data: nil
        )
        let suggestion = makeSuggestion(
            outerwearId: 9,
            matchingItems: matchingItems(outerwear: [item])
        )

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion)

        XCTAssertEqual(text, "Navy wool overcoat")
        assertNoUploadPlaceholder(text)
    }

    func testColourFallbackWhenDescriptionMissing() {
        let item = MatchingWardrobeItem(
            id: 4,
            category: "coat",
            color: "Charcoal",
            description: nil,
            image_data: nil
        )
        let suggestion = makeSuggestion(
            outerwearId: 4,
            matchingItems: matchingItems(outerwear: [item])
        )

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion)

        XCTAssertEqual(text, "Your wardrobe coat — Charcoal")
        assertNoUploadPlaceholder(text)
    }

    func testExplicitSourceLabelWinsOverWardrobeItemCategory() {
        let item = MatchingWardrobeItem(
            id: 12,
            category: "coat",
            color: "Camel",
            description: nil,
            image_data: nil
        )
        let suggestion = makeSuggestion(
            outerwearId: 12,
            matchingItems: matchingItems(outerwear: [item])
        )

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(
            suggestion: suggestion,
            sourceWardrobeCategory: "jacket"
        )

        XCTAssertEqual(text, "Your wardrobe jacket — Camel")
        assertNoUploadPlaceholder(text)
    }

    func testLegacyStoredPlaceholderIsReplacedWithDescription() {
        let item = MatchingWardrobeItem(
            id: 11,
            category: "jacket",
            color: "Tan",
            description: "Tan suede jacket",
            image_data: nil
        )
        let suggestion = makeSuggestion(
            outerwear: "Your wardrobe jacket (uploaded item)",
            outerwearId: 11,
            matchingItems: matchingItems(outerwear: [item])
        )

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion)

        XCTAssertEqual(text, "Tan suede jacket")
        assertNoUploadPlaceholder(text)
    }

    func testLegacyStoredPlaceholderWithoutWardrobeDataUsesPhotoPhrase() {
        let suggestion = makeSuggestion(outerwear: "Your wardrobe coat (uploaded item)")

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion)

        XCTAssertEqual(text, "The jacket in your photo")
        assertNoUploadPlaceholder(text)
    }

    func testRealOuterwearTextStillWins() {
        let suggestion = makeSuggestion(outerwear: "Camel trench coat")

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion)

        XCTAssertEqual(text, "Camel trench coat")
    }

    // MARK: - Real description kept around a legacy upload marker

    func testCleanMarkerTextKeepsDescriptionAfterUploadPrefix() {
        let suggestion = makeSuggestion(outerwear: "From your upload — navy bomber jacket")

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion)

        XCTAssertEqual(text, "navy bomber jacket")
        assertNoUploadPlaceholder(text)
    }

    func testCleanMarkerTextStripsTrailingParenthetical() {
        let suggestion = makeSuggestion(outerwear: "Navy corduroy jacket (uploaded item)")

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion)

        XCTAssertEqual(text, "Navy corduroy jacket")
        assertNoUploadPlaceholder(text)
    }

    func testCleanMarkerTextKeepsDescriptiveWardrobeSentence() {
        let suggestion = makeSuggestion(outerwear: "Your wardrobe jacket — Navy (uploaded item)")

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion)

        XCTAssertEqual(text, "Your wardrobe jacket — Navy")
        assertNoUploadPlaceholder(text)
    }

    func testBarePlaceholderUsesResolvableWardrobeDescription() {
        let item = MatchingWardrobeItem(
            id: 15,
            category: "jacket",
            color: "Olive",
            description: "Olive field jacket",
            image_data: nil
        )
        let suggestion = makeSuggestion(
            outerwear: "Jacket (uploaded item)",
            outerwearId: 15,
            matchingItems: matchingItems(outerwear: [item])
        )

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion)

        XCTAssertEqual(text, "Olive field jacket")
        assertNoUploadPlaceholder(text)
    }

    func testBarePlaceholderWithNothingKnownUsesPhotoPhrase() {
        let suggestion = makeSuggestion(outerwear: "Jacket (uploaded item)")

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(suggestion: suggestion)

        XCTAssertEqual(text, "The jacket in your photo")
        assertNoUploadPlaceholder(text)
    }

    func testCleanedUploadTextStillYieldsToStructuredBlazer() {
        let suggestion = makeSuggestion(
            blazer: "Charcoal wool blazer",
            outerwear: "From your upload — navy bomber jacket"
        )

        let text = OutfitLayerExclusivity.resolveOuterwearDisplayText(
            suggestion: suggestion,
            context: OutfitLayerExclusivity.LayerContext(occasion: "work", style: "classic")
        )

        XCTAssertNil(text)
    }

    func testCleanUploadMarkerTextRejectsBarePlaceholders() {
        XCTAssertNil(OutfitUploadCategory.cleanUploadMarkerText(nil))
        XCTAssertNil(OutfitUploadCategory.cleanUploadMarkerText(""))
        XCTAssertNil(OutfitUploadCategory.cleanUploadMarkerText("null"))
        XCTAssertNil(OutfitUploadCategory.cleanUploadMarkerText("Your wardrobe jacket (uploaded item)"))
        XCTAssertNil(OutfitUploadCategory.cleanUploadMarkerText("Jacket (uploaded item)"))
        XCTAssertNil(OutfitUploadCategory.cleanUploadMarkerText("Coat — uploaded item"))
        XCTAssertEqual(
            OutfitUploadCategory.cleanUploadMarkerText("Navy corduroy jacket (uploaded item)"),
            "Navy corduroy jacket"
        )
    }

    // MARK: - Upload normalization paths

    func testNormalizeSuggestionWritesPhotoPhraseForCoatSource() {
        let suggestion = makeSuggestion(uploadCategory: nil)

        let normalized = OutfitUploadCategory.normalizeSuggestion(
            suggestion,
            sourceWardrobeCategory: "coat"
        )

        XCTAssertEqual(normalized.outerwear, "The coat in your photo")
        assertNoUploadPlaceholder(normalized.outerwear)
    }

    func testSourceWardrobeJacketNeverWritesUploadedItemPlaceholder() {
        let suggestion = makeSuggestion()

        let updated = OutfitItemCardSourceTag.applyingSourceWardrobeUploadCategory(
            to: suggestion,
            sourceCategory: "jacket"
        )

        XCTAssertEqual(updated.outerwear, "The jacket in your photo")
        assertNoUploadPlaceholder(updated.outerwear)
    }
}
