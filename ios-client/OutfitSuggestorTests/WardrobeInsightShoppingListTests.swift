import XCTest
@testable import OutfitSuggestor

final class WardrobeInsightShoppingListTests: XCTestCase {
    func testBuildRowsFromMissingItems() {
        let rows = WardrobeInsightShoppingList.buildRows(from: makeResult())

        XCTAssertEqual(rows.count, 2)
        XCTAssertEqual(rows[0].item, "Oxford Shirt")
        XCTAssertEqual(rows[0].category, "Shirt")
        XCTAssertEqual(rows[0].styles, ["Oxford", "Linen"])
        XCTAssertEqual(rows[0].colors, ["Olive", "White"])
        XCTAssertEqual(rows[0].styleColorTuples, "(Oxford, Olive), (Oxford, White), (Linen, Olive), (Linen, White)")
        XCTAssertNotNil(rows[0].googleShoppingURL)
    }

    func testBuildRowsFallsBackToTopPrioritiesWhenMissingItemsAreEmpty() {
        let result = WardrobeInsightResult(
            context: makeResult().context,
            score: WardrobeInsightScore(value: 80, label: .strong, summary: "Strong coverage."),
            topPriorities: [
                WardrobeInsightPriority(
                    id: "priority-1-shoes",
                    rank: 1,
                    name: "loafers",
                    category: "shoes",
                    priority: "High"
                ),
            ],
            missingItems: [],
            categoryHealth: [],
            diagnostics: nil,
            admin: nil
        )

        let rows = WardrobeInsightShoppingList.buildRows(from: result)

        XCTAssertEqual(rows.count, 1)
        XCTAssertEqual(rows[0].item, "Loafers")
        XCTAssertEqual(rows[0].category, "Shoes")
        XCTAssertEqual(rows[0].styleColorTuples, "(Classic, Neutral)")
    }

    func testTupleFormattingUsesFallbacksWhenStyleOrColorMissing() {
        XCTAssertEqual(
            WardrobeInsightShoppingList.formatTuples(styles: [], colors: ["navy"]),
            "(Classic, Navy)"
        )
        XCTAssertEqual(
            WardrobeInsightShoppingList.formatTuples(styles: ["linen"], colors: []),
            "(Linen, Neutral)"
        )
        XCTAssertEqual(
            WardrobeInsightShoppingList.formatTuples(styles: [], colors: []),
            "(Classic, Neutral)"
        )
    }

    func testShareTextContainsContextRowsAndGoogleShoppingLinks() {
        let result = makeResult()
        let rows = WardrobeInsightShoppingList.buildRows(from: result)
        let text = WardrobeInsightShoppingList.shareText(rows: rows, context: result.context)

        XCTAssertTrue(text.contains("Wardrobe Insights Shopping List"))
        XCTAssertTrue(text.contains("Analyzed for Casual / Summer / Smart Casual"))
        XCTAssertTrue(text.contains("Oxford Shirt: (Oxford, Olive), (Oxford, White), (Linen, Olive), (Linen, White)"))
        XCTAssertTrue(text.contains("Google Shopping: https://www.google.com/search"))
    }

    func testShareTextUsesEmptyStateCopyForNoRows() {
        let text = WardrobeInsightShoppingList.shareText(rows: [], context: makeResult().context)

        XCTAssertTrue(text.contains(InsightsCopy.shoppingListEmptyMessage))
    }

    func testGoogleShoppingURLIncludesItemCategoryAndTuples() {
        let url = WardrobeInsightShoppingList.googleShoppingURL(
            item: "Oxford Shirt",
            category: "shirt",
            styles: ["Oxford", "Linen"],
            colors: ["Olive", "White"]
        )

        XCTAssertNotNil(url)
        XCTAssertEqual(url?.host, "www.google.com")
        XCTAssertTrue(url?.absoluteString.contains("tbm=shop") ?? false)

        let query = URLComponents(url: url!, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "q" })?
            .value ?? ""
        XCTAssertTrue(query.contains("Oxford Shirt"))
        XCTAssertTrue(query.contains("Shirt"))
        XCTAssertTrue(query.contains("(Oxford, Olive)"))
        XCTAssertTrue(query.contains("(Linen, White)"))
    }

    func testWhatsAppURLUsesEncodedText() {
        let text = "Wardrobe Insights Shopping List\nOxford Shirt: (Oxford, Olive)"
        let url = WardrobeInsightShoppingList.whatsappURL(for: text)

        XCTAssertEqual(url?.scheme, "whatsapp")
        XCTAssertEqual(url?.host, "send")
        let encodedText = URLComponents(url: url!, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "text" })?
            .value
        XCTAssertEqual(encodedText, text)
    }

    private func makeResult() -> WardrobeInsightResult {
        WardrobeInsightResult(
            context: WardrobeInsightContext(
                occasion: "casual",
                season: "summer",
                style: "smart casual"
            ),
            score: WardrobeInsightScore(
                value: 72,
                label: .good,
                summary: "Add versatile warm-weather pieces."
            ),
            topPriorities: [],
            missingItems: [
                WardrobeInsightMissingItem(
                    id: "missing-1-shirt",
                    name: "oxford shirt",
                    category: "shirt",
                    priority: "High",
                    reason: "Adds smart casual range.",
                    bestColors: ["olive", "white"],
                    worksWith: ["oxford", "linen"]
                ),
                WardrobeInsightMissingItem(
                    id: "missing-2-belt",
                    name: "braided belt",
                    category: "belt",
                    priority: "Medium",
                    reason: "Completes summer outfits.",
                    bestColors: [],
                    worksWith: []
                ),
            ],
            categoryHealth: [],
            diagnostics: nil,
            admin: nil
        )
    }
}
