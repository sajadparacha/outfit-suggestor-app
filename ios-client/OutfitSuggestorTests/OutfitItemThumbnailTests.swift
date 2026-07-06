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

    func testResolveMatchingItemFindsOuterwearByIdInBlazerBucket() {
        let b64 = makeBase64TestImage()
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
                blazer: [
                    MatchingWardrobeItem(
                        id: 15,
                        category: "blazer",
                        color: "navy",
                        description: "Navy blazer",
                        image_data: b64
                    )
                ],
                shoes: nil,
                belt: nil,
                sweater: nil,
                outerwear: nil,
                tie: nil
            ),
            outerwear_id: 15
        )

        let match = OutfitItemThumbnail.resolveMatchingItem(
            suggestion: suggestion,
            category: "outerwear"
        )

        XCTAssertEqual(match?.id, 15)
        XCTAssertEqual(match?.image_data, b64)
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

    func testUploadCategoryResolvesJacketFromSourceWardrobeItemId() {
        let suggestion = OutfitSuggestion(
            shirt: "Black shirt with white and red horizontal stripes",
            trouser: "Beige chinos",
            blazer: "Royal blue blazer",
            shoes: "Brown brogues",
            belt: "Tan belt",
            reasoning: "Elegant",
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: nil,
                trouser: nil,
                blazer: nil,
                shoes: nil,
                belt: nil,
                sweater: nil,
                outerwear: [
                    MatchingWardrobeItem(
                        id: 42,
                        category: "jacket",
                        color: "tan",
                        description: "Tan corduroy jacket",
                        image_data: makeBase64TestImage()
                    )
                ],
                tie: nil
            ),
            upload_matched_category: "shirt",
            shirt_id: 42,
            source_wardrobe_item_id: 42
        )

        XCTAssertEqual(
            OutfitUploadCategory.resolvedUploadCategory(
                suggestion: suggestion,
                sourceWardrobeCategory: "jacket"
            ),
            "outerwear"
        )
    }

    func testWardrobeMultiSelectOuterwearIsNotUploadAnchor() {
        let suggestion = OutfitSuggestion(
            shirt: "Slim fit dress shirt",
            trouser: "Grey trousers",
            blazer: "No structured blazer",
            shoes: "Brown monk strap shoes",
            belt: "Brown belt",
            reasoning: "Elegant winter look",
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: nil,
                trouser: nil,
                blazer: nil,
                shoes: [
                    MatchingWardrobeItem(
                        id: 66,
                        category: "shoes",
                        color: "Brown",
                        description: "Brown monk strap shoes",
                        image_data: makeBase64TestImage()
                    )
                ],
                belt: nil,
                sweater: nil,
                outerwear: [
                    MatchingWardrobeItem(
                        id: 55,
                        category: "jacket",
                        color: "Tan",
                        description: "Tan wool overcoat",
                        image_data: makeBase64TestImage()
                    )
                ],
                tie: nil
            ),
            outerwear: "Tan wool overcoat",
            shoes_id: 66,
            outerwear_id: 55,
            source_wardrobe_item_id: 55
        )

        XCTAssertNil(OutfitUploadCategory.resolvedUploadCategory(suggestion: suggestion))
        let thumb = OutfitItemThumbnail.thumbnailImage(
            suggestion: suggestion,
            category: "outerwear",
            uploadImage: nil
        )
        XCTAssertNotNil(thumb)
    }

    func testThumbnailPlacesJacketUploadOnOuterwearWhenMetadataMismatchesShirtSlot() {
        let upload = makeTestImage(color: .brown)
        let suggestion = OutfitSuggestion(
            shirt: "Black shirt with white and red horizontal stripes",
            trouser: "Beige chinos",
            blazer: "Royal blue blazer",
            shoes: "Brown brogues",
            belt: "Tan belt",
            reasoning: "Elegant",
            matching_wardrobe_items: MatchingWardrobeItems(
                shirt: nil,
                trouser: nil,
                blazer: nil,
                shoes: nil,
                belt: nil,
                sweater: nil,
                outerwear: [
                    MatchingWardrobeItem(
                        id: 42,
                        category: "jacket",
                        color: "tan",
                        description: "Tan corduroy jacket",
                        image_data: makeBase64TestImage()
                    )
                ],
                tie: nil
            ),
            upload_matched_category: "shirt",
            outerwear: "Tan corduroy jacket",
            shirt_id: 42,
            source_wardrobe_item_id: 42
        )

        let normalized = OutfitUploadCategory.normalizeSuggestion(suggestion, sourceWardrobeCategory: "jacket")
        let shirtThumb = OutfitItemThumbnail.thumbnailImage(
            suggestion: normalized,
            category: "shirt",
            uploadImage: upload,
            sourceWardrobeCategory: "jacket"
        )
        let outerwearThumb = OutfitItemThumbnail.thumbnailImage(
            suggestion: normalized,
            category: "outerwear",
            uploadImage: upload,
            sourceWardrobeCategory: "jacket"
        )

        XCTAssertNil(shirtThumb)
        XCTAssertEqual(outerwearThumb, upload)
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
