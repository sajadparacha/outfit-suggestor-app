import XCTest
@testable import OutfitSuggestor

final class NormalizeWardrobeInsightTests: XCTestCase {
    func testScoreLabelBandsMatchSpec() {
        XCTAssertEqual(NormalizeWardrobeInsight.scoreLabel(for: 0), .weak)
        XCTAssertEqual(NormalizeWardrobeInsight.scoreLabel(for: 39), .weak)
        XCTAssertEqual(NormalizeWardrobeInsight.scoreLabel(for: 40), .fair)
        XCTAssertEqual(NormalizeWardrobeInsight.scoreLabel(for: 59), .fair)
        XCTAssertEqual(NormalizeWardrobeInsight.scoreLabel(for: 60), .good)
        XCTAssertEqual(NormalizeWardrobeInsight.scoreLabel(for: 79), .good)
        XCTAssertEqual(NormalizeWardrobeInsight.scoreLabel(for: 80), .strong)
        XCTAssertEqual(NormalizeWardrobeInsight.scoreLabel(for: 100), .strong)
    }

    func testNormalizeProducesContextScoreAndTopThreePriorities() {
        let response = makeResponse(
            priorityShoppingList: [
                makeShoppingItem(rank: 1, name: "Navy chinos", category: "trouser", priority: "High"),
                makeShoppingItem(rank: 2, name: "White oxford", category: "shirt", priority: "Medium"),
                makeShoppingItem(rank: 3, name: "Brown belt", category: "belt", priority: "Low"),
                makeShoppingItem(rank: 4, name: "Extra item", category: "shoes", priority: "Low"),
            ]
        )

        let result = NormalizeWardrobeInsight.normalize(response)

        XCTAssertEqual(result.context.occasion, "work")
        XCTAssertEqual(result.context.season, "fall")
        XCTAssertEqual(result.context.style, "smart casual")
        XCTAssertEqual(result.score.summary, "Your wardrobe needs a few key pieces.")
        XCTAssertEqual(result.score.label, NormalizeWardrobeInsight.scoreLabel(for: result.score.value))
        XCTAssertEqual(result.topPriorities.count, 3)
        XCTAssertEqual(result.topPriorities.map(\.rank), [1, 2, 3])
        XCTAssertEqual(result.topPriorities.first?.name, "Navy chinos")
    }

    func testMissingItemsIncludePriorityReasonColorsAndWorksWith() {
        let response = makeResponse(
            priorityShoppingList: [
                WardrobePriorityShoppingItem(
                    rank: 1,
                    itemName: "Navy blazer",
                    category: "blazer",
                    priority: "High",
                    recommendedColors: ["navy", "charcoal"],
                    recommendedStyles: ["unstructured"],
                    reason: "Unlocks business looks.",
                    outfitImpact: "More formal options.",
                    actions: ["Shop similar"]
                )
            ]
        )

        let item = NormalizeWardrobeInsight.normalize(response).missingItems.first

        XCTAssertEqual(item?.priority, "High")
        XCTAssertEqual(item?.reason, "Unlocks business looks.")
        XCTAssertEqual(item?.bestColors, ["navy", "charcoal"])
        XCTAssertEqual(item?.worksWith, ["Unstructured"])
    }

    func testMissingItemsWorksWithUsesRecommendedStylesNotCategoryNames() {
        let response = makeResponse(
            priorityShoppingList: [
                WardrobePriorityShoppingItem(
                    rank: 1,
                    itemName: "Linen shirt",
                    category: "shirt",
                    priority: "High",
                    recommendedColors: ["white"],
                    recommendedStyles: ["linen", "short-sleeve", "breathable", "casual", "relaxed"],
                    reason: "Summer staple.",
                    outfitImpact: "More warm-weather options.",
                    actions: ["Shop similar"]
                )
            ]
        )

        let item = NormalizeWardrobeInsight.normalize(response).missingItems.first

        XCTAssertEqual(item?.worksWith, ["Linen"])
    }

    func testShirtCategoryHealthExcludesCrossCategoryStyles() {
        let response = makeResponse(
            analysisByCategory: [
                "shirt": makeCategoryGap(
                    category: "shirt",
                    itemCount: 2,
                    missingStyles: ["clean sneakers", "oxford"],
                    ownedStyles: ["linen"]
                ),
                "trouser": makeCategoryGap(category: "trouser", itemCount: 1),
                "shoes": makeCategoryGap(category: "shoes", itemCount: 1),
                "blazer": makeCategoryGap(category: "blazer", itemCount: 0),
                "belt": makeCategoryGap(category: "belt", itemCount: 1),
            ]
        )

        let shirt = NormalizeWardrobeInsight.normalize(response).categoryHealth.first { $0.id == "shirt" }

        XCTAssertEqual(shirt?.ownedStyles, ["linen"])
        XCTAssertEqual(shirt?.missingStyles, ["oxford"])
        XCTAssertFalse(shirt?.missingStyles.contains("clean sneakers") ?? true)
    }

    func testDerivedMissingItemsWorksWithUsesMissingStyles() {
        let response = makeResponse(
            analysisByCategory: [
                "shirt": makeCategoryGap(category: "shirt", itemCount: 2),
                "trouser": makeCategoryGap(
                    category: "trouser",
                    itemCount: 0,
                    missingColors: ["khaki"],
                    missingStyles: ["chino"]
                ),
                "shoes": makeCategoryGap(category: "shoes", itemCount: 1),
                "blazer": makeCategoryGap(category: "blazer", itemCount: 0),
                "belt": makeCategoryGap(category: "belt", itemCount: 1),
            ]
        )

        let trouserItem = NormalizeWardrobeInsight.normalize(response).missingItems.first { $0.category == "trouser" }

        XCTAssertEqual(trouserItem?.worksWith, ["Chino"])
    }

    func testCategoryHealthIncludesAllCoverageCategories() {
        let result = NormalizeWardrobeInsight.normalize(makeResponse())

        XCTAssertEqual(result.categoryHealth.count, 7)
        XCTAssertEqual(
            result.categoryHealth.map(\.category),
            ["Shirts", "Trousers", "Shoes", "Blazers", "Belts", "Colors", "Styles"]
        )
        XCTAssertTrue(result.categoryHealth.contains { $0.status == .missing })
        XCTAssertTrue(result.categoryHealth.contains { $0.category == "Colors" })
        XCTAssertTrue(result.categoryHealth.contains { $0.category == "Styles" })
    }

    func testAdminPayloadPreservedInNormalizedResult() {
        let cost = WardrobeGapAnalysisCost(
            gpt4_cost: 0.02,
            model_image_cost: nil,
            total_cost: 0.02,
            input_tokens: 100,
            output_tokens: 50
        )
        let response = makeResponse(
            aiPrompt: "Analyze gaps",
            aiRawResponse: "{ \"gaps\": true }",
            cost: cost
        )

        let admin = NormalizeWardrobeInsight.normalize(response).admin

        XCTAssertEqual(admin?.aiPrompt, "Analyze gaps")
        XCTAssertEqual(admin?.aiRawResponse, "{ \"gaps\": true }")
        XCTAssertEqual(admin?.cost?.total_cost, 0.02)
    }

    func testDerivesScoreFromCategoryGapsWhenNoExplicitScore() {
        let emptyShoes = WardrobeCategoryGap(
            category: "shoes",
            owned_colors: [],
            owned_styles: [],
            missing_colors: ["brown", "black", "tan"],
            missing_styles: ["casual", "formal"],
            recommended_purchases: ["Brown loafers"],
            item_count: 0
        )
        let response = makeResponse(
            analysisByCategory: [
                "shirt": makeCategoryGap(category: "shirt", itemCount: 2, missingColors: ["white"]),
                "trouser": makeCategoryGap(category: "trouser", itemCount: 1, missingColors: ["navy", "gray"]),
                "shoes": emptyShoes,
                "blazer": makeCategoryGap(category: "blazer", itemCount: 0),
                "belt": makeCategoryGap(category: "belt", itemCount: 1),
            ]
        )

        let score = NormalizeWardrobeInsight.normalize(response).score.value
        XCTAssertLessThan(score, 80)
        XCTAssertGreaterThanOrEqual(score, 0)
    }

    func testClothingCategoryDetailsMatchWebFormat() {
        let result = NormalizeWardrobeInsight.normalize(makeResponse())
        let shirt = result.categoryHealth.first { $0.id == "shirt" }

        XCTAssertEqual(
            shirt?.details,
            "Owned: 1 colors, 1 styles. Missing: 1 colors, 0 styles."
        )
    }

    func testClothingCategoryDetailsForMissingCategoryUsesZeros() {
        let response = makeResponse(
            analysisByCategory: [
                "shirt": makeCategoryGap(category: "shirt", itemCount: 0),
                "trouser": makeCategoryGap(category: "trouser", itemCount: 0),
                "shoes": makeCategoryGap(category: "shoes", itemCount: 0),
                "blazer": makeCategoryGap(category: "blazer", itemCount: 0),
                "belt": makeCategoryGap(category: "belt", itemCount: 0),
            ]
        )

        let health = NormalizeWardrobeInsight.normalize(response).categoryHealth
        let blazer = health.first { $0.id == "blazer" }

        XCTAssertEqual(
            blazer?.details,
            "Owned: 1 colors, 1 styles. Missing: 0 colors, 0 styles."
        )
    }

    func testClothingCategoryHealthIncludesInventoryArrays() {
        let result = NormalizeWardrobeInsight.normalize(makeResponse())
        let shirt = result.categoryHealth.first { $0.id == "shirt" }

        XCTAssertEqual(shirt?.ownedColors, ["blue"])
        XCTAssertEqual(shirt?.ownedStyles, ["linen"])
        XCTAssertEqual(shirt?.missingColors, ["white"])
        XCTAssertEqual(shirt?.missingStyles, [])
    }

    func testAggregateColorsHealthIncludesUniqueOwnedAndMissingColors() {
        let result = NormalizeWardrobeInsight.normalize(makeResponse())
        let colors = result.categoryHealth.first { $0.id == "colors" }

        XCTAssertEqual(colors?.details, "Owned: 1 colors. Missing: 1 colors.")
        XCTAssertEqual(colors?.ownedColors, ["blue"])
        XCTAssertEqual(colors?.missingColors, ["white"])
        XCTAssertEqual(colors?.ownedStyles, [])
        XCTAssertEqual(colors?.missingStyles, [])
    }

    func testAggregateStylesHealthIncludesUniqueOwnedAndMissingStyles() {
        let result = NormalizeWardrobeInsight.normalize(makeResponse())
        let styles = result.categoryHealth.first { $0.id == "styles" }

        XCTAssertEqual(styles?.details, "Owned: 1 styles. Missing: 1 styles.")
        XCTAssertEqual(styles?.ownedStyles, ["linen"])
        XCTAssertEqual(styles?.missingStyles, ["clean sneakers"])
        XCTAssertEqual(styles?.ownedColors, [])
        XCTAssertEqual(styles?.missingColors, [])
    }

    // MARK: - Fixtures

    private func makeResponse(
        analysisByCategory: [String: WardrobeCategoryGap]? = nil,
        priorityShoppingList: [WardrobePriorityShoppingItem]? = nil,
        aiPrompt: String? = nil,
        aiRawResponse: String? = nil,
        cost: WardrobeGapAnalysisCost? = nil
    ) -> WardrobeGapAnalysisResponse {
        let defaultCategories: [String: WardrobeCategoryGap] = [
            "shirt": makeCategoryGap(category: "shirt", itemCount: 2, missingColors: ["white"], ownedStyles: ["linen"]),
            "trouser": makeCategoryGap(category: "trouser", itemCount: 0),
            "shoes": makeCategoryGap(category: "shoes", itemCount: 1, missingStyles: ["clean sneakers"]),
            "blazer": makeCategoryGap(category: "blazer", itemCount: 0),
            "belt": makeCategoryGap(category: "belt", itemCount: 1),
        ]

        return WardrobeGapAnalysisResponse(
            occasion: "work",
            season: "fall",
            style: "smart casual",
            analysis_mode: "premium",
            analysis_by_category: analysisByCategory ?? defaultCategories,
            overall_summary: "Your wardrobe needs a few key pieces.",
            summaryText: nil,
            analysisDepth: "Premium",
            priorityShoppingList: priorityShoppingList,
            categoryInsights: nil,
            ai_prompt: aiPrompt,
            ai_raw_response: aiRawResponse,
            cost: cost
        )
    }

    private func makeCategoryGap(
        category: String,
        itemCount: Int = 1,
        missingColors: [String] = [],
        missingStyles: [String] = [],
        ownedStyles: [String] = ["linen"]
    ) -> WardrobeCategoryGap {
        WardrobeCategoryGap(
            category: category,
            owned_colors: ["blue"],
            owned_styles: ownedStyles,
            missing_colors: missingColors,
            missing_styles: missingStyles,
            recommended_purchases: itemCount == 0 ? ["Add a versatile \(category)"] : [],
            item_count: itemCount
        )
    }

    private func makeShoppingItem(
        rank: Int,
        name: String,
        category: String,
        priority: String
    ) -> WardrobePriorityShoppingItem {
        WardrobePriorityShoppingItem(
            rank: rank,
            itemName: name,
            category: category,
            priority: priority,
            recommendedColors: ["navy"],
            recommendedStyles: ["classic"],
            reason: "High impact purchase.",
            outfitImpact: "More combinations.",
            actions: ["Create outfits", "Shop similar"]
        )
    }
}
