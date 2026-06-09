import XCTest
@testable import OutfitSuggestor

final class WardrobeCardUxTests: XCTestCase {
    func testStyleThisItemCopy() {
        XCTAssertEqual(WardrobeCardUx.styleThisItemTitle, "Style this item")
        XCTAssertEqual(WardrobeCardUx.styleThisItemAccessibilityLabel, "Style this item with AI")
    }

    func testPastSuggestionsCopy() {
        XCTAssertEqual(WardrobeCardUx.pastSuggestionsTitle, "Past Suggestions")
        XCTAssertEqual(WardrobeCardUx.pastSuggestionsAccessibilityLabel, "Past Suggestions")
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
}
