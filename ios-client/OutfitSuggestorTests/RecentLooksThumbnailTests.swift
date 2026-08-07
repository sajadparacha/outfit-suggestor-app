import XCTest
@testable import OutfitSuggestor

final class RecentLooksThumbnailTests: XCTestCase {
    func testPrefersModelImageOverUploadAndShirt() {
        let entry = OutfitHistoryEntry(
            id: 1,
            created_at: "2026-08-07T10:00:00",
            text_input: nil,
            image_data: "upload-bytes",
            model_image: "model-bytes",
            shirt: "Blue shirt",
            trouser: "Navy trousers",
            blazer: "Gray blazer",
            shoes: "Brown shoes",
            belt: "Black belt",
            reasoning: "Looks good",
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: [
                    MatchingWardrobeItem(
                        id: 11,
                        category: "shirt",
                        color: "Blue",
                        description: "Slim fit",
                        image_data: "shirt-bytes"
                    )
                ],
                trouser: nil,
                blazer: nil,
                shoes: nil,
                belt: nil,
                sweater: nil,
                outerwear: nil,
                tie: nil
            )
        )
        XCTAssertEqual(entry.recentLookThumbnailData, "model-bytes")
    }

    func testFallsBackToShirtWardrobeThumbnailWhenNoModelOrUpload() {
        let entry = OutfitHistoryEntry(
            id: 2,
            created_at: "2026-08-07T10:00:00",
            text_input: nil,
            image_data: nil,
            model_image: nil,
            shirt: "Blue shirt",
            trouser: "Navy trousers",
            blazer: "Gray blazer",
            shoes: "Brown shoes",
            belt: "Black belt",
            reasoning: "Looks good",
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: [
                    MatchingWardrobeItem(
                        id: 11,
                        category: "shirt",
                        color: "Blue",
                        description: "Slim fit",
                        image_data: "shirt-bytes"
                    )
                ],
                trouser: nil,
                blazer: nil,
                shoes: nil,
                belt: nil,
                sweater: nil,
                outerwear: nil,
                tie: nil
            )
        )
        XCTAssertEqual(entry.recentLookThumbnailData, "shirt-bytes")
    }

    func testReturnsNilWhenNoThumbnailSources() {
        let entry = OutfitHistoryEntry(
            id: 3,
            created_at: "2026-08-07T10:00:00",
            text_input: nil,
            image_data: nil,
            model_image: nil,
            shirt: "Blue shirt",
            trouser: "Navy trousers",
            blazer: "Gray blazer",
            shoes: "Brown shoes",
            belt: "Black belt",
            reasoning: "Looks good"
        )
        XCTAssertNil(entry.recentLookThumbnailData)
    }

    func testFallsBackToUploadWhenModelMissing() {
        let entry = OutfitHistoryEntry(
            id: 4,
            created_at: "2026-08-07T10:00:00",
            text_input: nil,
            image_data: "upload-bytes",
            model_image: nil,
            shirt: "Blue shirt",
            trouser: "Navy trousers",
            blazer: "Gray blazer",
            shoes: "Brown shoes",
            belt: "Black belt",
            reasoning: "Looks good",
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: [
                    MatchingWardrobeItem(
                        id: 11,
                        category: "shirt",
                        color: "Blue",
                        description: "Slim fit",
                        image_data: "shirt-bytes"
                    )
                ],
                trouser: nil,
                blazer: nil,
                shoes: nil,
                belt: nil,
                sweater: nil,
                outerwear: nil,
                tie: nil
            )
        )
        XCTAssertEqual(entry.recentLookThumbnailData, "upload-bytes")
    }

    func testEmptyStringsAreTreatedAsMissing() {
        let entry = OutfitHistoryEntry(
            id: 5,
            created_at: "2026-08-07T10:00:00",
            text_input: nil,
            image_data: "",
            model_image: "",
            shirt: "Blue shirt",
            trouser: "Navy trousers",
            blazer: "Gray blazer",
            shoes: "Brown shoes",
            belt: "Black belt",
            reasoning: "Looks good",
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: [
                    MatchingWardrobeItem(
                        id: 11,
                        category: "shirt",
                        color: "Blue",
                        description: "Slim fit",
                        image_data: ""
                    )
                ],
                trouser: nil,
                blazer: nil,
                shoes: nil,
                belt: nil,
                sweater: nil,
                outerwear: nil,
                tie: nil
            )
        )
        XCTAssertNil(entry.recentLookThumbnailData)
    }

    func testSourceWardrobeItemIdResolvesNonShirtMatch() {
        let entry = OutfitHistoryEntry(
            id: 6,
            created_at: "2026-08-07T10:00:00",
            text_input: nil,
            image_data: nil,
            model_image: nil,
            shirt: "Blue shirt",
            trouser: "Navy trousers",
            blazer: "Gray blazer",
            shoes: "Brown shoes",
            belt: "Black belt",
            reasoning: "Looks good",
            source_wardrobe_item_id: 55,
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: nil,
                trouser: nil,
                blazer: nil,
                shoes: nil,
                belt: nil,
                sweater: nil,
                outerwear: [
                    MatchingWardrobeItem(
                        id: 55,
                        category: "jacket",
                        color: "Brown",
                        description: "Corduroy",
                        image_data: "jacket-bytes"
                    )
                ],
                tie: nil
            )
        )
        XCTAssertEqual(entry.recentLookThumbnailData, "jacket-bytes")
    }

    func testFirstItemWithIdSearchesAllSlots() {
        let matching = MatchingWardrobeItems(
            shirt: nil,
            trouser: [
                MatchingWardrobeItem(
                    id: 3,
                    category: "trouser",
                    color: "Navy",
                    description: nil,
                    image_data: "trouser-bytes"
                )
            ],
            blazer: nil,
            shoes: nil,
            belt: nil,
            sweater: nil,
            outerwear: nil,
            tie: nil
        )
        XCTAssertEqual(matching.firstItem(withId: 3)?.image_data, "trouser-bytes")
        XCTAssertNil(matching.firstItem(withId: 99))
    }
}
