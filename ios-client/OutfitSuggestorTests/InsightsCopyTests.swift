import XCTest
@testable import OutfitSuggestor

final class InsightsCopyTests: XCTestCase {
    func testPrimaryLabelsMatchSpec() {
        XCTAssertEqual(InsightsCopy.pageTitle, "Wardrobe Insights")
        XCTAssertEqual(InsightsCopy.pageSubtitle, "AI-powered analysis of your wardrobe to help you dress better.")
        XCTAssertEqual(InsightsCopy.shoppingSectionTitle, "What to Buy Next")
    }

    func testShoppingListLabelsMatchSpec() {
        XCTAssertEqual(InsightsCopy.shoppingListButton, "Shopping list")
        XCTAssertEqual(InsightsCopy.shoppingListTitle, "Shopping list")
        XCTAssertEqual(InsightsCopy.shoppingListBuyColumn, "Buy")
        XCTAssertEqual(InsightsCopy.shoppingListLookForColumn, "Look for")
        XCTAssertEqual(InsightsCopy.shoppingListSearchOnlineColumn, "Search online")
        XCTAssertEqual(InsightsCopy.copyListButton, "Copy list")
        XCTAssertEqual(InsightsCopy.exportToWhatsAppButton, "Export to WhatsApp")
        XCTAssertEqual(InsightsCopy.exportAsPDFButton, "Export as PDF")
        XCTAssertEqual(InsightsCopy.shoppingListEmptyMessage, "No shopping list items for this analysis.")
    }

    func testModeNamesMatchSpec() {
        XCTAssertEqual(InsightsCopy.quickCheckModeTitle, "Quick Wardrobe Check")
        XCTAssertEqual(InsightsCopy.aiStylistModeTitle, "AI Stylist Review")
        XCTAssertEqual(InsightsCopy.quickCheckSegmentLabel, "Quick Check")
        XCTAssertEqual(InsightsCopy.aiStylistSegmentLabel, "AI Stylist")
    }

    func testModePickerCopyMatchSpec() {
        XCTAssertEqual(InsightsCopy.modePickerTitle, "How would you like to check your wardrobe?")
        XCTAssertEqual(InsightsCopy.modePickerSubtitle, "Pick the level of detail you want from your stylist.")
        XCTAssertEqual(InsightsCopy.quickCheckModeSubtitle, "Fast snapshot with practical buy-next guidance.")
        XCTAssertEqual(InsightsCopy.aiStylistModeSubtitle, "Deeper styling advice tailored to your occasion and wardrobe.")
    }

    func testLoadingMessagesMatchSpec() {
        XCTAssertEqual(InsightsCopy.quickCheckLoadingMessage, "Running your Quick Wardrobe Check...")
        XCTAssertEqual(InsightsCopy.aiStylistLoadingMessage, "Preparing your AI Stylist Review...")
        XCTAssertEqual(InsightsCopy.loadingMessage(forAnalysisMode: "free"), InsightsCopy.quickCheckLoadingMessage)
        XCTAssertEqual(InsightsCopy.loadingMessage(forAnalysisMode: "premium"), InsightsCopy.aiStylistLoadingMessage)
    }

    func testStatCardLabelsMatchSpec() {
        XCTAssertEqual(InsightsCopy.categoriesCheckedLabel, "Categories checked")
        XCTAssertEqual(InsightsCopy.colorsToAddLabel, "Colors to add")
        XCTAssertEqual(InsightsCopy.stylesToTryLabel, "Styles to try")
        XCTAssertEqual(InsightsCopy.bestCategoryToShopNextLabel, "Best category to shop next")
    }

    func testReviewTypeDisplayMatchSpec() {
        XCTAssertEqual(
            InsightsCopy.reviewTypeDisplay(forAnalysisMode: "free"),
            "Review type: Quick Wardrobe Check"
        )
        XCTAssertEqual(
            InsightsCopy.reviewTypeDisplay(forAnalysisMode: "premium"),
            "Review type: AI Stylist Review"
        )
        XCTAssertEqual(
            InsightsCopy.reviewTypeDisplay(forAnalysisDepth: "Basic"),
            "Review type: Quick Wardrobe Check"
        )
        XCTAssertEqual(
            InsightsCopy.reviewTypeDisplay(forAnalysisDepth: "Premium"),
            "Review type: AI Stylist Review"
        )
    }

    func testEmptyStateAndReadyToastMatchSpec() {
        XCTAssertEqual(
            InsightsCopy.emptyStateMessage,
            "Run a check to see what's missing in each part of your wardrobe."
        )
        XCTAssertEqual(InsightsCopy.aiStylistReadyToast, "Your AI Stylist Review is ready. ✅")
    }
}
