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

    func testRandomHistoryHasStagedSteps() {
        let steps = AiProgressSteps.steps(for: .randomHistory)
        XCTAssertEqual(steps.count, 3)
        XCTAssertEqual(steps[0].id, "fetch")
        XCTAssertEqual(steps[0].label, "Loading your saved looks")
        XCTAssertEqual(steps[0].durationMs, 2500)
        XCTAssertEqual(steps[1].id, "pick")
        XCTAssertEqual(steps[1].label, "Finding a varied outfit")
        XCTAssertEqual(steps[1].durationMs, 2000)
        XCTAssertEqual(steps[2].id, "prepare")
        XCTAssertEqual(steps[2].label, "Preparing your look")
        XCTAssertEqual(steps[2].durationMs, 2000)
    }

    func testRandomHistoryTitle() {
        XCTAssertEqual(AiProgressSteps.title(for: .randomHistory), "Picking from your history")
    }

    func testRandomHistoryStepIndexFromMessage() {
        let steps = AiProgressSteps.steps(for: .randomHistory)
        XCTAssertEqual(
            AiProgressSteps.stepIndex(for: "Picking a random look from your history...", steps: steps),
            0
        )
        XCTAssertEqual(
            AiProgressSteps.stepIndex(for: "Finding a varied outfit", steps: steps),
            1
        )
        XCTAssertEqual(
            AiProgressSteps.stepIndex(for: "Preparing your look", steps: steps),
            2
        )
    }

    func testPastSuggestionsHasStagedSteps() {
        let steps = AiProgressSteps.steps(for: .pastSuggestions)
        XCTAssertEqual(steps.count, 3)
        XCTAssertEqual(steps[0].id, "fetch")
        XCTAssertEqual(steps[0].label, "Loading your saved looks")
        XCTAssertEqual(steps[0].durationMs, 2500)
        XCTAssertEqual(steps[1].id, "filter")
        XCTAssertEqual(steps[1].label, "Finding outfits for this item")
        XCTAssertEqual(steps[1].durationMs, 2000)
        XCTAssertEqual(steps[2].id, "prepare")
        XCTAssertEqual(steps[2].label, "Preparing suggestions")
        XCTAssertEqual(steps[2].durationMs, 2000)
    }

    func testPastSuggestionsTitle() {
        XCTAssertEqual(AiProgressSteps.title(for: .pastSuggestions), "Loading past suggestions")
    }

    func testPastSuggestionsStepIndexFromMessage() {
        let steps = AiProgressSteps.steps(for: .pastSuggestions)
        XCTAssertEqual(
            AiProgressSteps.stepIndex(for: WardrobeCardUx.pastSuggestionsLoadingMessage, steps: steps),
            0
        )
        XCTAssertEqual(
            AiProgressSteps.stepIndex(for: "Finding outfits for this item", steps: steps),
            1
        )
        XCTAssertEqual(
            AiProgressSteps.stepIndex(for: "Preparing suggestions", steps: steps),
            2
        )
    }

    func testWeekPlanGenerateHasStagedStepsAndTitle() {
        let steps = AiProgressSteps.steps(for: .weekPlanGenerate)
        XCTAssertEqual(steps.map(\.label), [
            "Reading your plan",
            "Matching wardrobe pieces",
            "Building outfits",
        ])
        XCTAssertEqual(AiProgressSteps.title(for: .weekPlanGenerate), "Planning your week")
        XCTAssertEqual(AiProgressSteps.estimatedTotalSeconds(for: .weekPlanGenerate), 24)
    }

    func testWeekPlanRegenerateSharesStepsWithDistinctTitle() {
        let generateSteps = AiProgressSteps.steps(for: .weekPlanGenerate)
        let regenerateSteps = AiProgressSteps.steps(for: .weekPlanRegenerate)
        XCTAssertEqual(generateSteps.map(\.label), regenerateSteps.map(\.label))
        XCTAssertEqual(generateSteps.map(\.durationMs), regenerateSteps.map(\.durationMs))
        XCTAssertEqual(AiProgressSteps.title(for: .weekPlanRegenerate), "Planning this day’s outfit")
    }

    func testWeekPlanSyncHasShortDuration() {
        let steps = AiProgressSteps.steps(for: .weekPlanSync)
        XCTAssertGreaterThanOrEqual(steps.count, 1)
        XCTAssertLessThanOrEqual(steps.count, 2)
        let total = AiProgressSteps.estimatedTotalSeconds(for: .weekPlanSync)
        XCTAssertGreaterThanOrEqual(total, 3)
        XCTAssertLessThanOrEqual(total, 6)
        XCTAssertEqual(AiProgressSteps.title(for: .weekPlanSync), "Updating your week")
    }

    func testWeekPlanGenerateStepIndexFromMessage() {
        let steps = AiProgressSteps.steps(for: .weekPlanGenerate)
        XCTAssertEqual(
            AiProgressSteps.stepIndex(for: "Preparing this week’s outfits…", steps: steps),
            0
        )
        XCTAssertEqual(
            AiProgressSteps.stepIndex(for: "Reading your plan", steps: steps),
            0
        )
        XCTAssertEqual(
            AiProgressSteps.stepIndex(for: "Matching wardrobe pieces", steps: steps),
            1
        )
        XCTAssertEqual(
            AiProgressSteps.stepIndex(for: "Building outfits", steps: steps),
            2
        )
    }
}
