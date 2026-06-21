import XCTest
@testable import OutfitSuggestor

final class WardrobeInsightShoppingListTests: XCTestCase {
    func testBuildRowsFromMissingItems() {
        let rows = WardrobeInsightShoppingList.buildRows(from: makeResult())

        XCTAssertEqual(rows.count, 2)
        XCTAssertEqual(rows[0].item, "Oxford Shirt")
        XCTAssertEqual(rows[0].category, "Shirt")
        XCTAssertEqual(rows[0].priority, "High")
        XCTAssertEqual(rows[0].styles, ["Oxford", "Linen"])
        XCTAssertEqual(rows[0].colors, ["Olive", "White"])
        XCTAssertEqual(rows[0].styleColorTuples, "(Oxford, Olive), (Oxford, White), (Linen, Olive), (Linen, White)")
        XCTAssertEqual(rows[0].lookForText, "Olive or white oxford; linen olive OK")
        XCTAssertEqual(rows[0].comboLinks.count, 4)
        XCTAssertNotNil(rows[0].searchAllURL)
        XCTAssertNotNil(rows[0].exportURL)
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
        XCTAssertEqual(rows[0].priority, "High")
        XCTAssertEqual(rows[0].styleColorTuples, "(Classic, Neutral)")
        XCTAssertEqual(rows[0].lookForText, "Classic neutral")
    }

    func testCleanShoppingItemLabelDedupesRepeatedWordsAndPrefersCategory() {
        XCTAssertEqual(
            WardrobeInsightShoppingList.cleanShoppingItemLabel(name: "white trouser trouser", category: "trouser"),
            "Trousers"
        )
        XCTAssertEqual(
            WardrobeInsightShoppingList.cleanShoppingItemLabel(name: "belt", category: "belt"),
            "Belt"
        )
    }

    func testFormatLookForTextProducesHumanReadableSummary() {
        XCTAssertEqual(
            WardrobeInsightShoppingList.formatLookForText(styles: ["leather", "braided"], colors: ["black", "brown"]),
            "Black or brown leather; braided black OK"
        )
        XCTAssertEqual(
            WardrobeInsightShoppingList.formatLookForText(styles: ["unstructured"], colors: ["black", "white"]),
            "Unstructured black or white"
        )
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

    func testShareTextUsesNumberedWhatsAppFormatWithoutRawTuples() {
        let result = makeResult()
        let rows = WardrobeInsightShoppingList.buildRows(from: result)
        let text = WardrobeInsightShoppingList.shareText(rows: rows, context: result.context)

        XCTAssertTrue(text.contains("🛍 ClosIQ Shopping List"))
        XCTAssertTrue(text.contains("For: Casual · Summer · Smart Casual"))
        XCTAssertTrue(text.contains("1. ☐ Oxford Shirt (High)"))
        XCTAssertTrue(text.contains("→ Olive or white oxford; linen olive OK"))
        XCTAssertTrue(text.contains("🔗 https://www.google.com/search"))
        XCTAssertFalse(text.contains("(Oxford, Olive)"))
    }

    func testShareTextIncludesChecklistState() {
        let result = makeResult()
        let rows = WardrobeInsightShoppingList.buildRows(from: result)
        let checklist: [String: ShoppingListChecklistEntry] = [
            rows[0].id: ShoppingListChecklistEntry(isBought: true, notes: "Got one in olive"),
        ]
        let text = WardrobeInsightShoppingList.shareText(rows: rows, context: result.context, checklist: checklist)

        XCTAssertTrue(text.contains("☑ Oxford Shirt (High)"))
        XCTAssertTrue(text.contains("📝 Got one in olive"))
    }

    func testShareTextUsesEmptyStateCopyForNoRows() {
        let text = WardrobeInsightShoppingList.shareText(rows: [], context: makeResult().context)

        XCTAssertTrue(text.contains(InsightsCopy.shoppingListEmptyMessage))
    }

    func testComboSearchURLUsesFocusedStyleAndColor() {
        let url = WardrobeInsightShoppingList.comboSearchURL(category: "shirt", style: "Oxford", color: "Olive")

        XCTAssertNotNil(url)
        let query = URLComponents(url: url!, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "q" })?
            .value ?? ""
        XCTAssertTrue(query.contains("shirts"))
        XCTAssertTrue(query.contains("Oxford"))
        XCTAssertTrue(query.contains("Olive"))
        XCTAssertFalse(query.contains("(Oxford, Olive)"))
    }

    func testSearchAllURLUsesMaxThreeCombos() {
        let tuples = WardrobeInsightShoppingList.buildStyleColorTuples(
            styles: ["a", "b", "c", "d"],
            colors: ["1", "2"]
        )
        let url = WardrobeInsightShoppingList.searchAllURL(category: "belt", itemLabel: "Belt", tuples: tuples)

        XCTAssertNotNil(url)
        let query = URLComponents(url: url!, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "q" })?
            .value ?? ""
        XCTAssertTrue(query.contains("A 1"))
        XCTAssertTrue(query.contains("A 2"))
        XCTAssertTrue(query.contains("B 1"))
        XCTAssertFalse(query.contains("D 2"))
    }

    func testWhatsAppURLUsesEncodedText() {
        let text = "🛍 ClosIQ Shopping List\n1. Belt (High)"
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
