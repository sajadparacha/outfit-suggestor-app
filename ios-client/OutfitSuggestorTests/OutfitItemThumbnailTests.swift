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
                belt: nil
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
                belt: nil
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
