import XCTest
@testable import OutfitSuggestor

final class WardrobeInsightsViewTests: XCTestCase {
    // 1. Before analysis, full preferences form is visible
    func testBeforeAnalysisShowsExpandedPreferences() {
        XCTAssertTrue(
            WardrobeInsightsPresentation.shouldShowExpandedPreferences(hasResult: false, isPreferencesExpanded: false)
        )
        XCTAssertFalse(
            WardrobeInsightsPresentation.shouldShowContextBar(hasResult: false, isPreferencesExpanded: false)
        )
        XCTAssertTrue(
            WardrobeInsightsPresentation.shouldShowAnalyzeButton(hasResult: false, isPreferencesExpanded: false, isLoading: false)
        )
    }

    // 2. After analysis, preferences collapse into context bar
    func testAfterAnalysisCollapsesPreferencesIntoContextBar() {
        XCTAssertFalse(
            WardrobeInsightsPresentation.shouldShowExpandedPreferences(hasResult: true, isPreferencesExpanded: false)
        )
        XCTAssertTrue(
            WardrobeInsightsPresentation.shouldShowContextBar(hasResult: true, isPreferencesExpanded: false)
        )
        XCTAssertFalse(
            WardrobeInsightsPresentation.shouldShowAnalyzeButton(hasResult: true, isPreferencesExpanded: false, isLoading: false)
        )
    }

    func testChangePreferencesExpandsFormAgain() {
        XCTAssertTrue(
            WardrobeInsightsPresentation.shouldShowExpandedPreferences(hasResult: true, isPreferencesExpanded: true)
        )
        XCTAssertFalse(
            WardrobeInsightsPresentation.shouldShowContextBar(hasResult: true, isPreferencesExpanded: true)
        )
        XCTAssertTrue(
            WardrobeInsightsPresentation.shouldShowAnalyzeButton(hasResult: true, isPreferencesExpanded: true, isLoading: false)
        )
    }

    // 3. Summary card data available from normalizer
    func testSummaryCardFieldsPresentInNormalizedResult() {
        let result = NormalizeWardrobeInsight.normalize(makeMinimalResponse())
        XCTAssertGreaterThanOrEqual(result.score.value, 0)
        XCTAssertLessThanOrEqual(result.score.value, 100)
        XCTAssertFalse(result.score.summary.isEmpty)
        XCTAssertLessThanOrEqual(result.topPriorities.count, 3)
    }

    // 4. Missing item card fields and shopping copy (no outfit CTAs)
    func testMissingItemCardCopyAndFields() {
        XCTAssertEqual(InsightsCopy.shopSimilarButton, "Shop similar")
        XCTAssertEqual(InsightsCopy.bestColorsLabel, "Best colors")
        XCTAssertEqual(InsightsCopy.worksWithLabel, "Styles To Try")

        let item = NormalizeWardrobeInsight.normalize(makeMinimalResponse()).missingItems.first
        XCTAssertNotNil(item?.priority)
        XCTAssertNotNil(item?.reason)
        XCTAssertNotNil(item?.bestColors)
    }

    func testInsightsCopyHasNoOutfitGenerationCTAs() {
        let mirror = Mirror(reflecting: InsightsCopy.self)
        let copyValues = mirror.children.compactMap { $0.value as? String }
        XCTAssertFalse(copyValues.contains("Generate outfits using these gaps"))
        XCTAssertFalse(copyValues.contains("Create outfits"))
    }

    func testColorSwatchAccessibilityIdentifiers() {
        XCTAssertEqual(InsightsChipAccessibility.colorSwatch("navy"), "insights.colorSwatch.navy")
        XCTAssertEqual(InsightsChipAccessibility.colorSwatch("white"), "insights.colorSwatch.white")
    }

    func testStyleChipAccessibilityIdentifiersForWorksWith() {
        let item = NormalizeWardrobeInsight.normalize(makeMinimalResponse()).missingItems.first
        XCTAssertFalse(item?.worksWith.isEmpty ?? true)
        for style in item?.worksWith ?? [] {
            XCTAssertEqual(
                InsightsChipAccessibility.styleChip(style),
                "insights.styleChip.\(style)"
            )
        }
    }

    func testColorShoppingURLUsesCategoryColorAndStyles() {
        let url = InsightsShoppingSearch.buildSearchURL(
            category: "shirt",
            colors: ["navy"],
            styles: ["linen", "short-sleeve"],
            defaultStyle: "smart casual"
        )
        XCTAssertNotNil(url)
        XCTAssertEqual(url?.host, "www.google.com")
        XCTAssertTrue(url?.absoluteString.contains("tbm=shop") ?? false)
        let query = URLComponents(url: url!, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "q" })?
            .value ?? ""
        XCTAssertTrue(query.contains("shirts"))
        XCTAssertTrue(query.contains("Navy"))
        XCTAssertTrue(query.contains("Linen"))
        XCTAssertTrue(query.contains("Short-Sleeve"))
    }

    func testColorShoppingURLFallsBackToDefaultStyleWhenNoStyles() {
        let url = InsightsShoppingSearch.buildSearchURL(
            category: "shirt",
            colors: ["navy"],
            styles: [],
            defaultStyle: "smart casual"
        )
        XCTAssertNotNil(url)
        let query = URLComponents(url: url!, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "q" })?
            .value ?? ""
        XCTAssertTrue(query.contains("shirts"))
        XCTAssertTrue(query.contains("Navy"))
        XCTAssertTrue(query.contains("Smart Casual"))
    }

    func testCategoryAccordionMissingColorSearchIncludesMissingStyles() {
        let trouser = NormalizeWardrobeInsight.normalize(makeMinimalResponse()).categoryHealth
            .first { $0.id == "trouser" }!
        XCTAssertEqual(trouser.missingColors, ["khaki"])
        XCTAssertEqual(trouser.missingStyles, ["chino"])

        let url = InsightsShoppingSearch.buildSearchURL(
            category: "trouser",
            colors: [trouser.missingColors[0]],
            styles: trouser.missingStyles,
            defaultStyle: "relaxed"
        )
        XCTAssertNotNil(url)
        let query = URLComponents(url: url!, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "q" })?
            .value ?? ""
        XCTAssertTrue(query.contains("trousers"))
        XCTAssertTrue(query.contains("Khaki"))
        XCTAssertTrue(query.contains("Chino"))
        XCTAssertFalse(query.contains("Relaxed"))
    }

    // 5. Coverage dashboard renders all category statuses
    func testCoverageDashboardHasExtendedClothingCategories() {
        let health = NormalizeWardrobeInsight.normalize(makeExtendedResponse()).categoryHealth
        XCTAssertEqual(health.count, 9)
        XCTAssertEqual(
            health.map(\.category),
            ["Shirts", "Trousers", "Blazers", "Sweaters", "Jackets", "Shoes", "Belts", "Colors", "Styles"]
        )
        XCTAssertTrue(health.allSatisfy { !$0.status.rawValue.isEmpty })
        XCTAssertTrue(health.allSatisfy { !$0.summary.isEmpty })
    }

    func testCoverageDashboardIncludesTieForFormalOccasions() {
        let health = NormalizeWardrobeInsight.normalize(makeFormalResponse()).categoryHealth

        XCTAssertEqual(health.count, 10)
        XCTAssertEqual(health.first { $0.id == "tie" }?.category, "Ties")
    }

    func testExtendedCategoryIconsAreDistinct() {
        XCTAssertEqual(WardrobeCategoryIcon.symbolName(for: "sweater"), "cloud.snow.fill")
        XCTAssertEqual(WardrobeCategoryIcon.symbolName(for: "jacket"), "umbrella.fill")
        XCTAssertEqual(WardrobeCategoryIcon.symbolName(for: "tie"), "link")
        XCTAssertEqual(WardrobeCategoryIcon.symbolName(for: "blazer"), "jacket.fill")
    }

    func testExtendedCategoryShoppingURLsUseSingularSearchPhrases() {
        for (category, phrase) in [
            ("sweater", "men sweater"),
            ("jacket", "men jacket"),
            ("tie", "men tie"),
        ] {
            let url = InsightsShoppingSearch.buildSearchURL(
                category: category,
                colors: ["navy"],
                styles: ["classic"],
                defaultStyle: "smart casual"
            )
            XCTAssertNotNil(url)
            let query = URLComponents(url: url!, resolvingAgainstBaseURL: false)?
                .queryItems?
                .first(where: { $0.name == "q" })?
                .value ?? ""
            XCTAssertTrue(query.contains(phrase), "Expected \(phrase) in query for \(category)")
        }
    }

    // 6. Category details collapsed by default
    func testCategoryAccordionStartsCollapsed() {
        XCTAssertTrue(WardrobeInsightsAccordionLogic.initialExpandedIds.isEmpty)
        XCTAssertFalse(
            WardrobeInsightsAccordionLogic.isExpanded(categoryId: "shirt", expandedIds: WardrobeInsightsAccordionLogic.initialExpandedIds)
        )
        let expanded = WardrobeInsightsAccordionLogic.toggled(categoryId: "shirt", expandedIds: [])
        XCTAssertTrue(WardrobeInsightsAccordionLogic.isExpanded(categoryId: "shirt", expandedIds: expanded))
    }

    // 7. Admin/debug hidden for normal users
    func testAdminDebugHiddenForNonAdmin() {
        XCTAssertFalse(WardrobeInsightsPresentation.shouldShowAdminDebug(isAdmin: false))
    }

    // 8. Admin/debug only when admin flag true
    func testAdminDebugVisibleForAdmin() {
        XCTAssertTrue(WardrobeInsightsPresentation.shouldShowAdminDebug(isAdmin: true))
    }

    // 9. Layout structure — coverage grid uses two columns on all size classes
    func testCoverageGridColumnCountIsTwo() {
        XCTAssertEqual(WardrobeInsightsLayout.coverageGridColumnCount, 2)
    }

    // 10. Empty/no-result state
    func testEmptyStateWhenNoResult() {
        XCTAssertFalse(WardrobeInsightsPresentation.shouldShowResults(hasResult: false))
        XCTAssertFalse(WardrobeInsightsPresentation.shouldShowShoppingListAction(hasResult: false))
        XCTAssertEqual(InsightsCopy.emptyStateMessage, "Run a check to see what's missing in each part of your wardrobe.")
        XCTAssertTrue(
            WardrobeInsightsPresentation.shouldShowAnalyzeButton(hasResult: false, isPreferencesExpanded: false, isLoading: false)
        )
    }

    func testShoppingListActionAvailableAfterResults() {
        XCTAssertTrue(WardrobeInsightsPresentation.shouldShowResults(hasResult: true))
        XCTAssertTrue(WardrobeInsightsPresentation.shouldShowShoppingListAction(hasResult: true))
        XCTAssertFalse(WardrobeInsightsPresentation.shouldShowShoppingListAction(hasResult: false))
        XCTAssertEqual(InsightsCopy.shoppingListButton, "Shopping list")
    }

    func testShoppingListExportLabelsAndColumnsMatchSpec() {
        XCTAssertEqual(InsightsCopy.shoppingListBuyColumn, "Buy")
        XCTAssertEqual(InsightsCopy.shoppingListLookForColumn, "Look for")
        XCTAssertEqual(InsightsCopy.shoppingListSearchOnlineColumn, "Search online")
        XCTAssertEqual(InsightsCopy.copyListButton, "Copy list")
        XCTAssertEqual(InsightsCopy.seeAllOptionsButton, "See all options")
        XCTAssertEqual(InsightsCopy.hideOptionsButton, "Hide options")
        XCTAssertEqual(InsightsCopy.copiedToClipboardMessage, "Copied to clipboard")
        XCTAssertEqual(
            WardrobeInsightsPresentation.shoppingListExportActionTitles,
            ["Export to WhatsApp", "Copy list", "Export as PDF"]
        )
        XCTAssertEqual(InsightsCopy.shoppingListExportErrorMessage, "Could not export shopping list.")
    }

    func testHeaderCopyMatchesSpec() {
        XCTAssertEqual(InsightsCopy.pageTitle, "Wardrobe Insights")
        XCTAssertEqual(InsightsCopy.pageSubtitle, "AI-powered analysis of your wardrobe to help you dress better.")
        XCTAssertEqual(InsightsCopy.analyzedForLabel, "Analyzed for")
        XCTAssertEqual(InsightsCopy.changePreferencesButton, "Change preferences")
    }

    func testCategoryHealthIncludesOwnedAndMissingInventoryArrays() {
        let health = NormalizeWardrobeInsight.normalize(makeMinimalResponse()).categoryHealth
        let shirt = health.first { $0.id == "shirt" }

        XCTAssertEqual(shirt?.ownedColors, ["blue"])
        XCTAssertEqual(shirt?.ownedStyles, ["linen"])
        XCTAssertEqual(shirt?.missingColors, ["white"])
        XCTAssertEqual(shirt?.missingStyles, [])

        let colors = health.first { $0.id == "colors" }
        XCTAssertFalse(colors?.ownedColors.isEmpty ?? true)
        XCTAssertFalse(colors?.missingColors.isEmpty ?? true)
        XCTAssertEqual(colors?.ownedStyles, [])
        XCTAssertEqual(colors?.missingStyles, [])

        let styles = health.first { $0.id == "styles" }
        XCTAssertFalse(styles?.ownedStyles.isEmpty ?? true)
        XCTAssertFalse(styles?.missingStyles.isEmpty ?? true)
        XCTAssertEqual(styles?.ownedColors, [])
        XCTAssertEqual(styles?.missingColors, [])
    }

    func testCategoryDetailCopyIncludesInventoryLabelsAndEmptyStates() {
        XCTAssertEqual(InsightsCopy.ownedColorsLabel, "Owned colors")
        XCTAssertEqual(InsightsCopy.missingColorsLabel, "Missing colors")
        XCTAssertEqual(InsightsCopy.ownedStylesLabel, "Owned styles")
        XCTAssertEqual(InsightsCopy.missingStylesLabel, "Missing styles")
        XCTAssertEqual(InsightsCopy.noOwnedColorsMessage, "No colors detected yet.")
        XCTAssertEqual(InsightsCopy.noMissingColorsMessage, "You already have enough core colors in this category.")
        XCTAssertEqual(InsightsCopy.noOwnedStylesMessage, "No style keywords detected yet.")
        XCTAssertEqual(InsightsCopy.noMissingStylesMessage, "Your style coverage looks balanced for this category.")
    }

    private func makeMinimalResponse() -> WardrobeGapAnalysisResponse {
        makeExtendedResponse()
    }

    private func makeExtendedResponse() -> WardrobeGapAnalysisResponse {
        WardrobeGapAnalysisResponse(
            occasion: "casual",
            season: "summer",
            style: "relaxed",
            analysis_mode: "free",
            analysis_by_category: [
                "shirt": WardrobeCategoryGap(
                    category: "shirt",
                    owned_colors: ["blue"],
                    owned_styles: ["linen"],
                    missing_colors: ["white"],
                    missing_styles: [],
                    recommended_purchases: [],
                    item_count: 2
                ),
                "trouser": WardrobeCategoryGap(
                    category: "trouser",
                    owned_colors: [],
                    owned_styles: [],
                    missing_colors: ["khaki"],
                    missing_styles: ["chino"],
                    recommended_purchases: ["Khaki chinos"],
                    item_count: 0
                ),
                "blazer": WardrobeCategoryGap(
                    category: "blazer",
                    owned_colors: [],
                    owned_styles: [],
                    missing_colors: ["navy"],
                    missing_styles: ["unstructured"],
                    recommended_purchases: ["Navy blazer"],
                    item_count: 0
                ),
                "sweater": WardrobeCategoryGap(
                    category: "sweater",
                    owned_colors: [],
                    owned_styles: [],
                    missing_colors: ["gray"],
                    missing_styles: ["merino"],
                    recommended_purchases: ["Gray merino sweater"],
                    item_count: 0
                ),
                "jacket": WardrobeCategoryGap(
                    category: "jacket",
                    owned_colors: ["olive"],
                    owned_styles: ["bomber"],
                    missing_colors: [],
                    missing_styles: [],
                    recommended_purchases: [],
                    item_count: 1
                ),
                "shoes": WardrobeCategoryGap(
                    category: "shoes",
                    owned_colors: ["brown"],
                    owned_styles: ["loafers"],
                    missing_colors: [],
                    missing_styles: [],
                    recommended_purchases: [],
                    item_count: 1
                ),
                "belt": WardrobeCategoryGap(
                    category: "belt",
                    owned_colors: ["brown"],
                    owned_styles: [],
                    missing_colors: [],
                    missing_styles: [],
                    recommended_purchases: [],
                    item_count: 1
                ),
            ],
            overall_summary: "Add trousers and a blazer to round out casual summer looks.",
            summaryText: nil,
            analysisDepth: "Basic",
            priorityShoppingList: nil,
            categoryInsights: nil,
            ai_prompt: nil,
            ai_raw_response: nil,
            cost: nil
        )
    }

    private func makeFormalResponse() -> WardrobeGapAnalysisResponse {
        var categories = makeExtendedResponse().analysis_by_category
        categories["tie"] = WardrobeCategoryGap(
            category: "tie",
            owned_colors: [],
            owned_styles: [],
            missing_colors: ["burgundy"],
            missing_styles: ["silk"],
            recommended_purchases: ["Burgundy silk tie"],
            item_count: 0
        )

        return WardrobeGapAnalysisResponse(
            occasion: "business",
            season: "fall",
            style: "formal",
            analysis_mode: "premium",
            analysis_by_category: categories,
            overall_summary: "Add a tie for formal business looks.",
            summaryText: nil,
            analysisDepth: "Premium",
            priorityShoppingList: nil,
            categoryInsights: nil,
            ai_prompt: nil,
            ai_raw_response: nil,
            cost: nil
        )
    }
}
