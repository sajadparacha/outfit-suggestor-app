import XCTest
@testable import OutfitSuggestor

final class OutfitSuggestionViewTests: XCTestCase {
    private func baseSuggestion(
        sweater: String? = nil,
        outerwear: String? = nil,
        tie: String? = nil
    ) -> OutfitSuggestion {
        OutfitSuggestion(
            shirt: "White dress shirt",
            trouser: "Navy trousers",
            blazer: "Charcoal blazer",
            shoes: "Black oxfords",
            belt: "Black belt",
            reasoning: "Classic business look.",
            sweater: sweater,
            outerwear: outerwear,
            tie: tie
        )
    }

    func testOptionalLayersHiddenWhenAllFieldsNull() {
        let suggestion = baseSuggestion()
        XCTAssertFalse(OutfitOptionalLayers.hasOptionalLayers(suggestion))
        XCTAssertTrue(OutfitOptionalLayers.items(for: suggestion).isEmpty)
    }

    func testOptionalLayersHiddenWhenFieldsEmptyOrWhitespace() {
        let suggestion = baseSuggestion(sweater: "  ", outerwear: "", tie: nil)
        XCTAssertFalse(OutfitOptionalLayers.hasOptionalLayers(suggestion))
        XCTAssertTrue(OutfitOptionalLayers.items(for: suggestion).isEmpty)
    }

    func testOptionalLayersRenderWhenPresent() {
        let suggestion = baseSuggestion(
            sweater: "Merino crew neck",
            outerwear: "Wool overcoat",
            tie: "Navy silk tie"
        )

        XCTAssertTrue(OutfitOptionalLayers.hasOptionalLayers(suggestion))

        let items = OutfitOptionalLayers.items(for: suggestion)
        XCTAssertEqual(items.map(\.label), [
            MainFlowUxCopy.layerLabel,
            MainFlowUxCopy.outerwearLabel,
            MainFlowUxCopy.tieLabel,
        ])
        XCTAssertEqual(items.map(\.category), ["sweater", "outerwear", "tie"])
        XCTAssertEqual(items.map(\.description), [
            "Merino crew neck",
            "Wool overcoat",
            "Navy silk tie",
        ])
    }

    func testOptionalLayersRenderSubsetWhenOnlySomePresent() {
        let suggestion = baseSuggestion(tie: "Burgundy knit tie")
        XCTAssertTrue(OutfitOptionalLayers.hasOptionalLayers(suggestion))

        let items = OutfitOptionalLayers.items(for: suggestion)
        XCTAssertEqual(items.count, 1)
        XCTAssertEqual(items.first?.label, MainFlowUxCopy.tieLabel)
        XCTAssertEqual(items.first?.category, "tie")
    }

    func testAlsoWearCopyMatchesContract() {
        XCTAssertEqual(MainFlowUxCopy.alsoWearSection, "Also wear")
        XCTAssertEqual(MainFlowUxCopy.layerLabel, "Layer")
        XCTAssertEqual(MainFlowUxCopy.outerwearLabel, "Outerwear")
        XCTAssertEqual(MainFlowUxCopy.tieLabel, "Tie")
    }

    func testLayerExclusivityHidesBlazerWhenOuterwearAnchored() {
        let suggestion = OutfitSuggestion(
            shirt: "White dress shirt",
            trouser: "Navy trousers",
            blazer: "Royal blue blazer",
            shoes: "Black oxfords",
            belt: "Black belt",
            reasoning: "Classic business look.",
            upload_matched_category: "outerwear",
            outerwear: "Tan corduroy jacket"
        )
        XCTAssertFalse(OutfitLayerExclusivity.shouldShowBlazerCard(suggestion: suggestion))
        XCTAssertTrue(OutfitLayerExclusivity.shouldShowAnchoredOuterwearInCoreGrid(suggestion: suggestion))
        XCTAssertEqual(OutfitLayerExclusivity.optionalLayerCategories(for: suggestion), ["tie"])
    }

    func testLayerExclusivityDropsSweaterAndOuterwearWhenBlazerAnchored() {
        let suggestion = OutfitSuggestion(
            shirt: "White dress shirt",
            trouser: "Navy trousers",
            blazer: "Charcoal blazer",
            shoes: "Black oxfords",
            belt: "Black belt",
            reasoning: "Classic business look.",
            upload_matched_category: "blazer",
            sweater: "Merino",
            outerwear: "Denim jacket"
        )
        XCTAssertTrue(OutfitLayerExclusivity.shouldShowBlazerCard(suggestion: suggestion))
        XCTAssertEqual(OutfitLayerExclusivity.optionalLayerCategories(for: suggestion), ["tie"])
        XCTAssertFalse(OutfitLayerExclusivity.hasVisibleOptionalLayers(suggestion))
    }
}
