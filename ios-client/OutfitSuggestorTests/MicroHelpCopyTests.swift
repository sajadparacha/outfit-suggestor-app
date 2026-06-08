import XCTest
@testable import OutfitSuggestor

final class MicroHelpCopyTests: XCTestCase {
    func testWardrobeOnlyMatchesSpec() {
        XCTAssertEqual(
            MicroHelpCopy.wardrobeOnly,
            "Only recommend items from your saved wardrobe."
        )
    }

    func testModelPreviewMatchesSpec() {
        XCTAssertEqual(
            MicroHelpCopy.modelPreview,
            "Creates a visual preview of the suggested outfit."
        )
    }

    func testInsightsMatchesSpec() {
        XCTAssertEqual(
            MicroHelpCopy.insights,
            "Find missing items that would unlock more outfit combinations."
        )
    }
}
