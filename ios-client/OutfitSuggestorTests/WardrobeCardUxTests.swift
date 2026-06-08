import XCTest
@testable import OutfitSuggestor

final class WardrobeCardUxTests: XCTestCase {
    func testStyleThisItemCopy() {
        XCTAssertEqual(WardrobeCardUx.styleThisItemTitle, "Style this item")
        XCTAssertEqual(WardrobeCardUx.styleThisItemAccessibilityLabel, "Style this item with AI")
    }

    func testMenuActionsOrderAndTitles() {
        XCTAssertEqual(
            WardrobeCardUx.menuActionsOrder.map(\.title),
            ["View image", "Edit", "History", "Delete"]
        )
        XCTAssertEqual(WardrobeCardUx.menuActionsOrder.map(\.rawValue), [
            "viewImage", "edit", "history", "delete"
        ])
    }

    func testMenuTriggerAccessibilityLabel() {
        XCTAssertEqual(WardrobeCardUx.menuTriggerAccessibilityLabel, "More actions")
    }

    func testAccessibilityIdentifiersUseStablePrefixes() {
        XCTAssertEqual(WardrobeCardUx.heroButtonIdentifier(itemId: 42), "wardrobe.getSuggestion.42")
        XCTAssertEqual(WardrobeCardUx.menuTriggerIdentifier(itemId: 7), "wardrobe.itemMenu.7")
        XCTAssertEqual(
            WardrobeCardUx.menuItemIdentifier(itemId: 3, action: .history),
            "wardrobe.menu.history.3"
        )
        XCTAssertEqual(
            WardrobeCardUx.menuItemIdentifier(itemId: 3, action: .viewImage),
            "wardrobe.menu.viewImage.3"
        )
        XCTAssertEqual(
            WardrobeCardUx.menuItemIdentifier(itemId: 3, action: .delete),
            "wardrobe.menu.delete.3"
        )
    }

    func testFlowTipMentionsStyleThisItem() {
        XCTAssertTrue(WardrobeCardUx.flowTipStep2Fragment.contains("Style this item"))
    }
}
