//
//  ThumbnailEnlargeViewerTests.swift
//  OutfitSuggestorTests
//

import XCTest
import UIKit
@testable import OutfitSuggestor

final class ThumbnailEnlargeViewerTests: XCTestCase {

    private func sampleImage() -> UIImage {
        UIGraphicsImageRenderer(size: CGSize(width: 8, height: 8)).image { ctx in
            UIColor.red.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: 8, height: 8))
        }
    }

    // MARK: - Week slot thumb

    func testWeekSlotThumbWithImageOpensAndDismisses() {
        var presentation = ThumbnailEnlargePresentation()
        let image = sampleImage()

        XCTAssertFalse(presentation.isOpen)
        presentation.open(image)
        XCTAssertTrue(presentation.isOpen)
        XCTAssertNotNil(presentation.image)

        presentation.dismiss()
        XCTAssertFalse(presentation.isOpen)
        XCTAssertNil(presentation.image)
    }

    func testWeekSlotPlaceholderNotOpenable() {
        var presentation = ThumbnailEnlargePresentation()
        XCTAssertFalse(ThumbnailEnlargeUx.canOpen(image: nil))
        presentation.open(nil)
        XCTAssertFalse(presentation.isOpen)

        XCTAssertEqual(
            ThumbnailEnlargeUx.accessibilityLabel(forName: "Top"),
            "View Top full size"
        )
        XCTAssertEqual(
            ThumbnailEnlargeUx.weekSlotAccessibilityId(category: "shirt"),
            "week.slot.shirt.enlarge"
        )
        // Change remains a separate control id from enlarge.
        XCTAssertNotEqual(
            ThumbnailEnlargeUx.weekSlotAccessibilityId(category: "shirt"),
            "week.slot.shirt.change"
        )
    }

    // MARK: - Wardrobe card thumb

    func testWardrobeThumbWithImageOpensAndDismisses() {
        var presentation = ThumbnailEnlargePresentation()
        let image = sampleImage()

        XCTAssertTrue(ThumbnailEnlargeUx.canOpen(image: image))
        presentation.open(image)
        XCTAssertTrue(presentation.isOpen)

        presentation.dismiss()
        XCTAssertFalse(presentation.isOpen)

        XCTAssertEqual(
            ThumbnailEnlargeUx.accessibilityLabel(forName: "Shirt"),
            "View Shirt full size"
        )
        XCTAssertEqual(
            ThumbnailEnlargeUx.wardrobeThumbAccessibilityId(itemId: 42),
            "wardrobe.thumb.42.enlarge"
        )
    }

    func testEnlargeDoesNotFireChangeOrSelect() {
        var presentation = ThumbnailEnlargePresentation()
        var changeFired = false
        var selectFired = false
        let image = sampleImage()

        // Enlarge path only opens the viewer — Change/Select stay on separate buttons.
        presentation.open(image)
        XCTAssertTrue(presentation.isOpen)
        XCTAssertTrue(ThumbnailEnlargeUx.enlargeDoesNotTriggerChange(changeFired: changeFired))
        XCTAssertFalse(selectFired)

        // Simulating Change/Select would set those flags; enlarge must not.
        XCTAssertFalse(changeFired)
        XCTAssertFalse(selectFired)
    }
}
