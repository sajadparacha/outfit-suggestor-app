import XCTest
@testable import OutfitSuggestor

final class AiProgressStepsTests: XCTestCase {
    func testOutfitSuggestionHasStagedSteps() {
        let steps = AiProgressSteps.steps(for: .outfitSuggestion)
        XCTAssertGreaterThanOrEqual(steps.count, 4)
        XCTAssertTrue(steps.contains { $0.label.contains("Analyzing your item") })
    }

    func testOutfitWithPreviewIncludesPreviewStep() {
        let steps = AiProgressSteps.steps(for: .outfitWithPreview)
        XCTAssertTrue(steps.contains { $0.label.contains("Generating preview") })
    }

    func testEstimatedDurationMatchesStepTimings() {
        let steps = AiProgressSteps.steps(for: .wardrobeAnalysis)
        let totalMs = steps.reduce(0) { $0 + $1.durationMs }
        XCTAssertEqual(AiProgressSteps.estimatedTotalSeconds(for: .wardrobeAnalysis), max(1, totalMs / 1000))
    }

    func testFormatDuration() {
        XCTAssertEqual(AiProgressSteps.formatDuration(seconds: 12), "12s")
        XCTAssertEqual(AiProgressSteps.formatDuration(seconds: 75), "1m 15s")
        XCTAssertEqual(AiProgressSteps.formatDuration(seconds: 120), "2m")
    }
}
