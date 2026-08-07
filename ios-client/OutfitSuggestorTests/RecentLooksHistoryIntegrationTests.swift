import XCTest
@testable import OutfitSuggestor

/// Integration-style coverage: API-shaped JSON → history models → thumbnail + suggestion mapping.
final class RecentLooksHistoryIntegrationTests: XCTestCase {
    func testDecodesMatchingWardrobeItemsFromHistoryPayload() throws {
        let json = """
        {
          "id": 42,
          "created_at": "2026-08-07T10:15:00",
          "text_input": null,
          "image_data": null,
          "model_image": null,
          "shirt": "Slim fit dress shirt in soft light blue",
          "trouser": "Navy trousers",
          "blazer": "Gray blazer",
          "shoes": "Brown shoes",
          "belt": "Black belt",
          "reasoning": "Clean office look",
          "shirt_id": 11,
          "source_wardrobe_item_id": 11,
          "matching_wardrobe_items": {
            "shirt": [
              {
                "id": 11,
                "category": "shirt",
                "color": "Light blue",
                "description": "Slim fit dress shirt",
                "image_data": "shirt-thumb-base64"
              }
            ],
            "trouser": [],
            "blazer": [],
            "shoes": [],
            "belt": []
          }
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(OutfitHistoryEntry.self, from: json)
        XCTAssertEqual(entry.id, 42)
        XCTAssertEqual(entry.shirt_id, 11)
        XCTAssertEqual(entry.matching_wardrobe_items?.shirt?.first?.id, 11)
        XCTAssertEqual(entry.recentLookThumbnailData, "shirt-thumb-base64")
    }

    func testHistoryListPayloadMapsThumbnailsForRecentLooks() throws {
        let json = """
        [
          {
            "id": 1,
            "created_at": "2026-08-07T09:00:00",
            "shirt": "Blue shirt",
            "trouser": "Jeans",
            "blazer": "Navy blazer",
            "shoes": "Sneakers",
            "belt": "Belt",
            "reasoning": "Casual",
            "model_image": "model-1",
            "matching_wardrobe_items": {
              "shirt": [{ "id": 1, "category": "shirt", "image_data": "ignored-when-model-present" }]
            }
          },
          {
            "id": 2,
            "created_at": "2026-08-07T09:30:00",
            "shirt": "White shirt",
            "trouser": "Chinos",
            "blazer": "Blazer",
            "shoes": "Loafers",
            "belt": "Belt",
            "reasoning": "Smart",
            "image_data": "upload-2",
            "matching_wardrobe_items": {
              "shirt": [{ "id": 2, "category": "shirt", "image_data": "shirt-2" }]
            }
          },
          {
            "id": 3,
            "created_at": "2026-08-07T10:00:00",
            "shirt": "Checked shirt",
            "trouser": "Trousers",
            "blazer": "Blazer",
            "shoes": "Shoes",
            "belt": "Belt",
            "reasoning": "Layered",
            "source_wardrobe_item_id": 99,
            "matching_wardrobe_items": {
              "outerwear": [{ "id": 99, "category": "jacket", "image_data": "jacket-99" }]
            }
          }
        ]
        """.data(using: .utf8)!

        let entries = try JSONDecoder().decode([OutfitHistoryEntry].self, from: json)
        XCTAssertEqual(entries.count, 3)
        XCTAssertEqual(entries[0].recentLookThumbnailData, "model-1")
        XCTAssertEqual(entries[1].recentLookThumbnailData, "upload-2")
        XCTAssertEqual(entries[2].recentLookThumbnailData, "jacket-99")
    }

    func testToOutfitSuggestionPreservesMatchingItemsForPreviewThumbnails() throws {
        let json = """
        {
          "id": 7,
          "created_at": "2026-08-07T11:00:00",
          "shirt": "Oxford shirt",
          "trouser": "Trousers",
          "blazer": "Blazer",
          "shoes": "Shoes",
          "belt": "Belt",
          "reasoning": "Sharp",
          "shirt_id": 21,
          "matching_wardrobe_items": {
            "shirt": [
              {
                "id": 21,
                "category": "shirt",
                "color": "White",
                "description": "Oxford",
                "image_data": "oxford-bytes"
              }
            ]
          }
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(OutfitHistoryEntry.self, from: json)
        let suggestion = entry.toOutfitSuggestion()
        XCTAssertEqual(suggestion.id, "7")
        XCTAssertEqual(suggestion.shirt_id, 21)
        XCTAssertEqual(suggestion.matching_wardrobe_items?.shirt?.first?.image_data, "oxford-bytes")
        XCTAssertEqual(
            OutfitItemThumbnail.thumbnailImage(
                suggestion: suggestion,
                category: "shirt",
                uploadImage: nil
            ) != nil,
            false,
            "Invalid non-image base64 should not produce a UIImage; mapping still carries the payload"
        )
        XCTAssertEqual(suggestion.matching_wardrobe_items?.shirt?.first?.id, 21)
    }

    func testEmptyMatchingArraysStillDecodeWithoutCrashing() throws {
        let json = """
        {
          "id": 8,
          "created_at": "2026-08-07T12:00:00",
          "shirt": "Shirt",
          "trouser": "Trouser",
          "blazer": "Blazer",
          "shoes": "Shoes",
          "belt": "Belt",
          "reasoning": "x",
          "matching_wardrobe_items": {
            "shirt": [],
            "trouser": [],
            "blazer": [],
            "shoes": [],
            "belt": [],
            "sweater": [],
            "outerwear": [],
            "tie": []
          }
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(OutfitHistoryEntry.self, from: json)
        XCTAssertNotNil(entry.matching_wardrobe_items)
        XCTAssertNil(entry.recentLookThumbnailData)
    }
}
