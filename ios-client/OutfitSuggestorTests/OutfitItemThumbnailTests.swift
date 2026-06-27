import XCTest
import UIKit
@testable import OutfitSuggestor

final class OutfitItemThumbnailTests: XCTestCase {
    func testThumbnailFallsBackToFirstWardrobeMatchWhenIdsAbsent() {
        let b64 = makeBase64TestImage()
        let suggestion = OutfitSuggestion(
            shirt: "Blue oxford",
            trouser: "Grey chinos",
            blazer: "Navy blazer",
            shoes: "Brown loafers",
            belt: "Brown belt",
            reasoning: "Smart casual.",
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: [
                    MatchingWardrobeItem(
                        id: 7,
                        category: "shirt",
                        color: "blue",
                        description: "Blue oxford",
                        image_data: b64
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

        let thumb = OutfitItemThumbnail.thumbnailImage(
            suggestion: suggestion,
            category: "shirt",
            uploadImage: nil
        )

        XCTAssertNotNil(thumb)
    }

    func testThumbnailPrefersUploadForMatchedCategory() {
        let upload = makeTestImage(color: .red)
        let suggestion = OutfitSuggestion(
            shirt: "From your upload",
            trouser: "Grey chinos",
            blazer: "Navy blazer",
            shoes: "Brown loafers",
            belt: "Brown belt",
            reasoning: "Uses upload.",
            upload_matched_category: "shirt"
        )

        let thumb = OutfitItemThumbnail.thumbnailImage(
            suggestion: suggestion,
            category: "shirt",
            uploadImage: upload
        )

        XCTAssertEqual(thumb, upload)
    }

    func testThumbnailSkipsUploadForNonMatchedCategory() {
        let b64 = makeBase64TestImage()
        let upload = makeTestImage(color: .red)
        let suggestion = OutfitSuggestion(
            shirt: "Blue oxford",
            trouser: "Grey chinos",
            blazer: "Navy blazer",
            shoes: "Brown loafers",
            belt: "Brown belt",
            reasoning: "Wardrobe trouser.",
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: nil,
                trouser: [
                    MatchingWardrobeItem(
                        id: 2,
                        category: "trouser",
                        color: "grey",
                        description: "Grey chinos",
                        image_data: b64
                    )
                ],
                blazer: nil,
                shoes: nil,
                belt: nil,
                sweater: nil,
                outerwear: nil,
                tie: nil
            ),
            upload_matched_category: "shirt"
        )

        let thumb = OutfitItemThumbnail.thumbnailImage(
            suggestion: suggestion,
            category: "trouser",
            uploadImage: upload
        )

        XCTAssertNotNil(thumb)
        XCTAssertNotEqual(thumb, upload)
    }

    func testThumbnailPrefersSelectedIdForOptionalCategory() {
        let b64First = makeBase64TestImage()
        let b64Second = makeTestImage(color: .green).pngData()!.base64EncodedString()
        let suggestion = OutfitSuggestion(
            shirt: "Blue oxford",
            trouser: "Grey chinos",
            blazer: "Navy blazer",
            shoes: "Brown loafers",
            belt: "Brown belt",
            reasoning: "Layered look.",
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: nil,
                trouser: nil,
                blazer: nil,
                shoes: nil,
                belt: nil,
                sweater: [
                    MatchingWardrobeItem(
                        id: 1,
                        category: "sweater",
                        color: "grey",
                        description: "Grey sweater",
                        image_data: b64First
                    ),
                    MatchingWardrobeItem(
                        id: 2,
                        category: "sweater",
                        color: "navy",
                        description: "Navy sweater",
                        image_data: b64Second
                    ),
                ],
                outerwear: nil,
                tie: nil
            ),
            sweater_id: 2
        )

        let match = OutfitItemThumbnail.resolveMatchingItem(suggestion: suggestion, category: "sweater")
        XCTAssertEqual(match?.id, 2)
        XCTAssertEqual(match?.image_data, b64Second)
    }

    func testThumbnailResolvesOuterwearAndTieCategories() {
        let b64 = makeBase64TestImage()
        let suggestion = OutfitSuggestion(
            shirt: "Shirt",
            trouser: "Trousers",
            blazer: "Blazer",
            shoes: "Shoes",
            belt: "Belt",
            reasoning: "Formal.",
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: nil,
                trouser: nil,
                blazer: nil,
                shoes: nil,
                belt: nil,
                sweater: nil,
                outerwear: [
                    MatchingWardrobeItem(
                        id: 8,
                        category: "jacket",
                        color: "navy",
                        description: "Topcoat",
                        image_data: b64
                    )
                ],
                tie: [
                    MatchingWardrobeItem(
                        id: 9,
                        category: "tie",
                        color: "navy",
                        description: "Silk tie",
                        image_data: b64
                    )
                ]
            )
        )

        XCTAssertEqual(OutfitItemThumbnail.resolveMatchingItem(suggestion: suggestion, category: "outerwear")?.id, 8)
        XCTAssertEqual(OutfitItemThumbnail.resolveMatchingItem(suggestion: suggestion, category: "tie")?.id, 9)
    }

    private func makeTestImage(color: UIColor = .systemBlue) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 8, height: 8))
        return renderer.image { context in
            color.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 8, height: 8))
        }
    }

    private func makeBase64TestImage() -> String {
        makeTestImage().pngData()!.base64EncodedString()
    }
}
