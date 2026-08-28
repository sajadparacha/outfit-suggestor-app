import XCTest
@testable import OutfitSuggestor

final class AiProgressPanelViewTests: XCTestCase {

    // MARK: - Modal / backdrop contract

    func testModalBlocksInteractionWhileVisible() {
        XCTAssertTrue(AiProgressPanelModal.blocksInteractionWhileVisible)
        XCTAssertEqual(AiProgressPanelModal.backdropOpacity, 0.5, accuracy: 0.001)
        XCTAssertEqual(AiProgressPanelModal.modalAccessibilityId, "ai.progressModal")
        XCTAssertEqual(AiProgressPanelModal.backdropAccessibilityId, "ai.progressBackdrop")
    }

    func testCardContentAccessibilityIdsPresent() {
        XCTAssertEqual(AiProgressPanelModal.panelAccessibilityId, "ai.progressPanel")
    }

    func testBackdropDoesNotDismiss() {
        XCTAssertFalse(AiProgressPanelModal.dismissesOnBackdropTap)
    }

    func testHostPaddingCompensationKeepsBackdropFullBleed() {
        XCTAssertEqual(AiProgressPanelModal.hostPaddingCompensation, 16)
    }

    // MARK: - About / Guide blocking copy

    func testAboutCopyDescribesBlockingProgressPanel() {
        let copy = AboutCopy.weekPlannerFeature
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("blocks the app"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("until the operation finishes"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("not a full-screen spinner"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("tabs stay"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("non-blocking"))
    }

    func testGuideCopyMentionsBlockingModalBehavior() {
        // Mirrors UserGuideView Week Planner step wording (blocking, not non-blocking).
        let guideStep =
            "While Generate outfits, Regenerate this day, Insights AI runs, and other server calls run, a dimmed progress panel blocks the app until the operation finishes—you cannot use other tabs until it completes (Cancel appears only when that action is available)."
        XCTAssertTrue(guideStep.localizedCaseInsensitiveContains("blocks the app"))
        XCTAssertTrue(guideStep.localizedCaseInsensitiveContains("cannot use other tabs"))
        XCTAssertFalse(guideStep.localizedCaseInsensitiveContains("not a full-screen spinner"))
    }
}
