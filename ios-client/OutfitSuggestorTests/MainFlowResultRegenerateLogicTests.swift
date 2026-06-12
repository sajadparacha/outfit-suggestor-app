import XCTest
@testable import OutfitSuggestor

final class MainFlowResultRegenerateLogicTests: XCTestCase {
    func testCanGenerateAnotherRequiresSuggestion() {
        XCTAssertFalse(
            MainFlowResultRegenerateLogic.canGenerateAnotherFromResult(
                inputPanelSource: OutfitViewModel.InputPanelSource.history,
                hasUploadedImage: true,
                hasFlowPreview: true,
                hasSuggestion: false
            )
        )
    }

    func testCanGenerateAnotherWithUploadedImage() {
        XCTAssertTrue(
            MainFlowResultRegenerateLogic.canGenerateAnotherFromResult(
                inputPanelSource: OutfitViewModel.InputPanelSource.none,
                hasUploadedImage: true,
                hasFlowPreview: false,
                hasSuggestion: true
            )
        )
    }

    func testCanGenerateAnotherForWardrobeRandomWithoutUpload() {
        XCTAssertTrue(
            MainFlowResultRegenerateLogic.canGenerateAnotherFromResult(
                inputPanelSource: OutfitViewModel.InputPanelSource.wardrobe,
                hasUploadedImage: false,
                hasFlowPreview: true,
                hasSuggestion: true
            )
        )
    }

    func testCanGenerateAnotherForHistoryWithPreview() {
        XCTAssertTrue(
            MainFlowResultRegenerateLogic.canGenerateAnotherFromResult(
                inputPanelSource: OutfitViewModel.InputPanelSource.history,
                hasUploadedImage: false,
                hasFlowPreview: true,
                hasSuggestion: true
            )
        )
    }

    func testCanGenerateAnotherFalseForHistoryWithoutPreview() {
        XCTAssertFalse(
            MainFlowResultRegenerateLogic.canGenerateAnotherFromResult(
                inputPanelSource: OutfitViewModel.InputPanelSource.history,
                hasUploadedImage: false,
                hasFlowPreview: false,
                hasSuggestion: true
            )
        )
    }

    func testShouldShowCompactUploadActionsWhenViewingResult() {
        XCTAssertTrue(MainFlowResultRegenerateLogic.shouldShowCompactUploadActions(hasSuggestion: true))
        XCTAssertFalse(MainFlowResultRegenerateLogic.shouldShowCompactUploadActions(hasSuggestion: false))
    }
}
