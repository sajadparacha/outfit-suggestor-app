import XCTest
@testable import OutfitSuggestor

final class BuildShoppingListRowsTests: XCTestCase {
    private func makeCategory(
        id: String,
        status: WardrobeCoverageStatus = .good,
        missingColors: [String] = [],
        missingStyles: [String] = []
    ) -> WardrobeInsightCategoryHealth {
        WardrobeInsightCategoryHealth(
            id: id,
            category: id,
            status: status,
            summary: "",
            details: "",
            ownedColors: [],
            ownedStyles: [],
            missingColors: missingColors,
            missingStyles: missingStyles,
            recommendedStep: ""
        )
    }

    func testBuildsRowsForClothingCategoriesWithMissingStyleOrColor() {
        let categories = [
            makeCategory(id: "shirt", missingColors: ["navy"], missingStyles: ["oxford"]),
            makeCategory(id: "trouser", missingColors: ["charcoal"], missingStyles: ["chino"]),
        ]

        XCTAssertEqual(BuildShoppingListRows.build(from: categories), [
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "Oxford",
                color: "Navy",
                key: "shirt-Oxford-Navy-0"
            ),
            ShoppingListRow(
                categoryKey: "trouser",
                category: "Pant",
                style: "Chino",
                color: "Charcoal",
                key: "trouser-Chino-Charcoal-0"
            ),
        ])
    }

    func testMapsBlazerAndJacketDisplayLabelsToJacket() {
        let categories = [
            makeCategory(id: "blazer", status: .missing, missingColors: ["navy"], missingStyles: ["unstructured"]),
            makeCategory(id: "jacket", status: .weak, missingColors: ["black"], missingStyles: ["bomber"]),
        ]

        let rows = BuildShoppingListRows.build(from: categories)
        XCTAssertEqual(rows[0].category, "Jacket")
        XCTAssertEqual(rows[1].category, "Jacket")
    }

    func testIncludesRowsWhenStatusIsMissingOrWeakWithoutMissingArrays() {
        let categories = [
            makeCategory(id: "shoes", status: .weak),
            makeCategory(id: "belt", status: .missing),
        ]

        XCTAssertEqual(BuildShoppingListRows.build(from: categories), [
            ShoppingListRow(
                categoryKey: "shoes",
                category: "Shoes",
                style: "—",
                color: "—",
                key: "shoes-—-—-0"
            ),
            ShoppingListRow(
                categoryKey: "belt",
                category: "Belt",
                style: "—",
                color: "—",
                key: "belt-—-—-0"
            ),
        ])
    }

    func testSkipsAggregatePseudoCategoriesColorsAndStyles() {
        let categories = [
            makeCategory(id: "colors", missingColors: ["mint green"], missingStyles: ["linen"]),
            makeCategory(id: "styles", missingColors: ["navy"], missingStyles: ["smart casual"]),
            makeCategory(id: "shirt", missingColors: ["white"]),
        ]

        let rows = BuildShoppingListRows.build(from: categories)
        XCTAssertEqual(rows.count, 1)
        XCTAssertEqual(rows[0].categoryKey, "shirt")
    }

    func testSkipsCategoriesWithSolidCoverageAndNoGaps() {
        let categories = [
            makeCategory(id: "belt", status: .good),
            makeCategory(id: "sweater", status: .medium, missingColors: ["burgundy"]),
        ]

        XCTAssertEqual(BuildShoppingListRows.build(from: categories), [
            ShoppingListRow(
                categoryKey: "sweater",
                category: "Sweater",
                style: "—",
                color: "Burgundy",
                key: "sweater-—-Burgundy-0"
            ),
        ])
    }

    func testBuildsCartesianProductForAllMissingStylesAndColors() {
        let categories = [
            makeCategory(
                id: "shirt",
                missingColors: ["black", "blue"],
                missingStyles: ["linen", "oxford"]
            ),
        ]

        let rows = BuildShoppingListRows.build(from: categories)
        XCTAssertEqual(rows.count, 4)
        XCTAssertEqual(rows, [
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "Linen",
                color: "Black",
                key: "shirt-Linen-Black-0"
            ),
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "Linen",
                color: "Blue",
                key: "shirt-Linen-Blue-1"
            ),
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "Oxford",
                color: "Black",
                key: "shirt-Oxford-Black-2"
            ),
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "Oxford",
                color: "Blue",
                key: "shirt-Oxford-Blue-3"
            ),
        ])
    }

    func testBuildsOneRowPerMissingStyleWhenNoMissingColors() {
        let categories = [
            makeCategory(id: "shirt", missingStyles: ["linen", "oxford"]),
        ]

        XCTAssertEqual(BuildShoppingListRows.build(from: categories), [
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "Linen",
                color: "—",
                key: "shirt-Linen-—-0"
            ),
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "Oxford",
                color: "—",
                key: "shirt-Oxford-—-1"
            ),
        ])
    }

    func testBuildsOneRowPerMissingColorWhenNoMissingStyles() {
        let categories = [
            makeCategory(id: "shirt", missingColors: ["black", "blue"]),
        ]

        XCTAssertEqual(BuildShoppingListRows.build(from: categories), [
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "—",
                color: "Black",
                key: "shirt-—-Black-0"
            ),
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "—",
                color: "Blue",
                key: "shirt-—-Blue-1"
            ),
        ])
    }

    func testBuildCsvExportsHeaderAndRowsWithEmptyCellsForDashes() {
        let csv = BuildShoppingListRows.buildCsv([
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "Oxford",
                color: "Navy",
                key: "shirt-Oxford-Navy-0"
            ),
            ShoppingListRow(
                categoryKey: "shoes",
                category: "Shoes",
                style: "—",
                color: "Black",
                key: "shoes-—-Black-0"
            ),
        ])

        XCTAssertEqual(csv, "Category,Style,Color\nShirt,Oxford,Navy\nShoes,,Black")
    }

    func testBuildWhatsAppMessageFormatsBulletListWithHeader() {
        let message = BuildShoppingListRows.buildWhatsAppMessage([
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "Oxford",
                color: "Navy",
                key: "shirt-Oxford-Navy-0"
            ),
            ShoppingListRow(
                categoryKey: "trouser",
                category: "Pant",
                style: "Chino",
                color: "Charcoal",
                key: "trouser-Chino-Charcoal-0"
            ),
        ])

        XCTAssertEqual(
            message,
            "Shopping list (wardrobe analysis)\n\n• Shirt — Oxford, Navy\n• Pant — Chino, Charcoal"
        )
    }

    func testWhatsAppURLEncodesMessage() {
        let rows = [
            ShoppingListRow(
                categoryKey: "shirt",
                category: "Shirt",
                style: "Oxford",
                color: "Navy",
                key: "shirt-Oxford-Navy-0"
            ),
        ]
        let url = BuildShoppingListRows.whatsAppURL(for: rows)
        XCTAssertNotNil(url)
        XCTAssertEqual(url?.host, "wa.me")
        let text = URLComponents(url: url!, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "text" })?
            .value
        XCTAssertTrue(text?.contains("Shopping list (wardrobe analysis)") ?? false)
        XCTAssertTrue(text?.contains("Shirt") ?? false)
    }

    func testPrettyLabelCapitalizesWords() {
        XCTAssertEqual(BuildShoppingListRows.prettyLabel("smart casual"), "Smart Casual")
        XCTAssertEqual(BuildShoppingListRows.prettyLabel("navy"), "Navy")
    }
}
