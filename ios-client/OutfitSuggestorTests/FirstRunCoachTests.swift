import XCTest
@testable import OutfitSuggestor

final class FirstRunCoachTests: XCTestCase {
    // MARK: - Copy parity with web spec

    func testStepCopyMatchesSpec() {
        XCTAssertEqual(FirstRunCoachCopy.Step.upload.title, "Upload")
        XCTAssertEqual(FirstRunCoachCopy.Step.upload.subtitle, "Add any clothing photo")
        XCTAssertEqual(FirstRunCoachCopy.Step.generate.title, "Generate")
        XCTAssertEqual(FirstRunCoachCopy.Step.generate.subtitle, "AI builds a full outfit")
        XCTAssertEqual(FirstRunCoachCopy.Step.explore.title, "Explore")
        XCTAssertEqual(FirstRunCoachCopy.Step.explore.subtitle, "Try another look or save")
    }

    func testCollapsedPreferencesAndEmptyPreviewCopyMatchSpec() {
        XCTAssertEqual(
            FirstRunCoachCopy.collapsedPreferencesLabel,
            "Occasion, season, style (optional)"
        )
        XCTAssertEqual(FirstRunCoachCopy.expandButton, "Expand")
        XCTAssertEqual(FirstRunCoachCopy.emptyPreviewHeadline, "Your outfit appears here")
        XCTAssertEqual(
            FirstRunCoachCopy.emptyPreviewSubline,
            "Upload a photo above, then tap Generate Outfit"
        )
        XCTAssertEqual(FirstRunCoachCopy.readyToGenerateHint, "Ready — tap Generate Outfit")
    }

    func testStorageKeysMatchSpec() {
        XCTAssertEqual(FirstRunCoachCopy.storageKeyDismissed, "first_run_coach_dismissed")
        XCTAssertEqual(FirstRunCoachCopy.storageKeyPrefsExpanded, "first_run_prefs_expanded")
    }

    func testAccessibilityIdentifiersMatchSpec() {
        XCTAssertEqual(FirstRunCoachCopy.Step.upload.accessibilityIdentifier, "main.firstRunCoach.step1")
        XCTAssertEqual(FirstRunCoachCopy.Step.generate.accessibilityIdentifier, "main.firstRunCoach.step2")
        XCTAssertEqual(FirstRunCoachCopy.Step.explore.accessibilityIdentifier, "main.firstRunCoach.step3")
    }

    // MARK: - Coach visibility

    func testCoachVisibleWhenNotDismissed() {
        XCTAssertTrue(FirstRunCoachLogic.shouldShowCoach(dismissed: false))
    }

    func testCoachHiddenWhenDismissed() {
        XCTAssertFalse(FirstRunCoachLogic.shouldShowCoach(dismissed: true))
    }

    // MARK: - Step state

    func testActiveStepUploadWhenNoImage() {
        XCTAssertEqual(
            FirstRunCoachLogic.activeStep(hasImage: false, hasSuggestion: false),
            .upload
        )
    }

    func testActiveStepGenerateWhenImageWithoutSuggestion() {
        XCTAssertEqual(
            FirstRunCoachLogic.activeStep(hasImage: true, hasSuggestion: false),
            .generate
        )
    }

    func testActiveStepExploreWhenSuggestionExists() {
        XCTAssertEqual(
            FirstRunCoachLogic.activeStep(hasImage: true, hasSuggestion: true),
            .explore
        )
    }

    func testUploadStepCompletedAfterImageSet() {
        XCTAssertFalse(
            FirstRunCoachLogic.isStepCompleted(.upload, hasImage: false, hasSuggestion: false)
        )
        XCTAssertTrue(
            FirstRunCoachLogic.isStepCompleted(.upload, hasImage: true, hasSuggestion: false)
        )
    }

    func testGenerateStepCompletedAfterSuggestion() {
        XCTAssertFalse(
            FirstRunCoachLogic.isStepCompleted(.generate, hasImage: true, hasSuggestion: false)
        )
        XCTAssertTrue(
            FirstRunCoachLogic.isStepCompleted(.generate, hasImage: true, hasSuggestion: true)
        )
    }

    // MARK: - Collapsed preferences

    func testPreferencesCollapsedOnFirstRunUntilExpanded() {
        XCTAssertTrue(
            FirstRunCoachLogic.shouldCollapsePreferences(coachDismissed: false, prefsExpanded: false)
        )
        XCTAssertFalse(
            FirstRunCoachLogic.shouldCollapsePreferences(coachDismissed: false, prefsExpanded: true)
        )
        XCTAssertFalse(
            FirstRunCoachLogic.shouldCollapsePreferences(coachDismissed: true, prefsExpanded: false)
        )
    }
}
