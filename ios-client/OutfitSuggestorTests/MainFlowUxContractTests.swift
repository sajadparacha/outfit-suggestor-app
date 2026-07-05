import XCTest
@testable import OutfitSuggestor

final class MainFlowUxContractTests: XCTestCase {
    // MARK: - MainFlowUxCopy parity with docs/main-flow-ux-contract.md

    func testPrimaryCtaCopy() {
        XCTAssertEqual(MainFlowUxCopy.primaryCta, "Generate Outfit")
        XCTAssertEqual(MainFlowUxCopy.primaryCtaAccessibility, "Get AI outfit suggestion")
    }

    func testEmptyPreviewCopy() {
        XCTAssertEqual(MainFlowUxCopy.emptyPreviewHeadline, "Your outfit appears here")
        XCTAssertEqual(
            MainFlowUxCopy.emptyPreviewSubline,
            "Upload a photo, set preferences, then tap Generate Outfit"
        )
    }

    func testResultCopy() {
        XCTAssertEqual(MainFlowUxCopy.resultTitle, "Your Styled Look")
        XCTAssertEqual(MainFlowUxCopy.whyThisWorks, "Why this works")
        XCTAssertEqual(MainFlowUxCopy.generateAnother, "Generate Another Look")
        XCTAssertEqual(MainFlowUxCopy.saveLook, "Save Look")
        XCTAssertEqual(MainFlowUxCopy.refine, "Refine")
    }

    func testRefineOptionsCopy() {
        XCTAssertEqual(MainFlowUxCopy.refineMoreFormal, "Make it more formal")
        XCTAssertEqual(MainFlowUxCopy.refineMoreCasual, "Make it more casual")
        XCTAssertEqual(MainFlowUxCopy.refineWardrobeOnly, "Use wardrobe items only")
        XCTAssertEqual(MainFlowUxCopy.refineChangeOccasion, "Change occasion")
    }

    func testSourceTagCopy() {
        XCTAssertEqual(MainFlowUxCopy.tagFromUpload, "From your upload")
        XCTAssertEqual(MainFlowUxCopy.tagFromWardrobe, "From your wardrobe")
        XCTAssertEqual(MainFlowUxCopy.fromHistory, "From history")
        XCTAssertEqual(MainFlowUxCopy.tagAiSuggested, "AI Suggested")
    }

    func testSectionAndToastCopy() {
        XCTAssertEqual(MainFlowUxCopy.preferencesSection, "Preferences")
        XCTAssertEqual(MainFlowUxCopy.wardrobeSection, "Wardrobe")
        XCTAssertEqual(MainFlowUxCopy.randomPicksSection, "Random picks")
        XCTAssertEqual(MainFlowUxCopy.advancedOptionsSection, "Advanced options")
        XCTAssertEqual(MainFlowUxCopy.compactSummaryTitle, "Your inputs")
        XCTAssertEqual(MainFlowUxCopy.saveLookToast, "Look saved!")
        XCTAssertEqual(MainFlowUxCopy.saveLookAuthPrompt, "Sign in to save looks")
        XCTAssertEqual(MainFlowUxCopy.uploadNewItem, "Upload new item")
        XCTAssertEqual(MainFlowUxCopy.compactUploadHint, "Upload a new photo to start a fresh outfit")
        XCTAssertEqual(MainFlowUxCopy.alsoWearSection, "Also wear")
        XCTAssertEqual(MainFlowUxCopy.layerLabel, "Layer")
        XCTAssertEqual(MainFlowUxCopy.outerwearLabel, "Outerwear")
        XCTAssertEqual(MainFlowUxCopy.tieLabel, "Tie")
    }

    // MARK: - ReasoningBullets

    func testReasoningBulletsSplitsNewlines() {
        let bullets = ReasoningBullets.toBullets(
            "Classic pairing.\nNeutral tones work well.\nComfortable for summer."
        )
        XCTAssertEqual(bullets, [
            "Classic pairing.",
            "Neutral tones work well.",
            "Comfortable for summer.",
        ])
    }

    func testReasoningBulletsSplitsSentences() {
        XCTAssertEqual(
            ReasoningBullets.toBullets("First point. Second point. Third point."),
            ["First point.", "Second point.", "Third point."]
        )
    }

    func testReasoningBulletsSingleShortText() {
        XCTAssertEqual(ReasoningBullets.toBullets("One cohesive look."), ["One cohesive look."])
    }

    func testReasoningBulletsCapsAtFive() {
        let bullets = ReasoningBullets.toBullets(
            "First reason here. Second reason here. Third reason here. Fourth reason here. Fifth reason here. Sixth reason here."
        )
        XCTAssertEqual(bullets.count, 5)
    }

    func testReasoningBulletsEmptyInput() {
        XCTAssertEqual(ReasoningBullets.toBullets("   "), [])
    }

    // MARK: - OutfitItemCardTextParser

    func testItemCardTextSplitsOnEmDash() {
        let parsed = OutfitItemCardTextParser.parse("Navy chinos — tailored fit for office")
        XCTAssertEqual(parsed.shortName, "Navy chinos")
        XCTAssertEqual(parsed.oneLineReason, "tailored fit for office")
    }

    func testItemCardTextShortNameOnly() {
        let parsed = OutfitItemCardTextParser.parse("White linen shirt")
        XCTAssertEqual(parsed.shortName, "White linen shirt")
        XCTAssertNil(parsed.oneLineReason)
    }

    func testItemCardTextTruncatesLongText() {
        let long = String(repeating: "A", count: 60)
        let parsed = OutfitItemCardTextParser.parse(long)
        XCTAssertTrue(parsed.shortName.hasSuffix("…"))
        XCTAssertNil(parsed.oneLineReason)
    }

    // MARK: - OutfitContextLine

    func testContextLineStyleAndSeason() {
        XCTAssertEqual(
            OutfitContextLine.format(occasion: "work", season: "summer", style: "smart-casual"),
            "Smart Casual · Summer"
        )
    }

    func testContextLineStyleOnly() {
        XCTAssertEqual(
            OutfitContextLine.format(occasion: "everyday", season: "all-season", style: "classic"),
            "Classic"
        )
    }

    func testContextLineOccasionFallback() {
        XCTAssertEqual(
            OutfitContextLine.format(occasion: "formal-event", season: "all-season", style: ""),
            "Formal Event"
        )
    }

    // MARK: - MainFlowLayoutLogic (wardrobe style → Generate Outfit)

    func testShowsCreationLayoutWhenWardrobeStylePendingWithoutSuggestion() {
        XCTAssertTrue(
            MainFlowLayoutLogic.isWardrobeStylePending(
                sourceWardrobeItemId: 42,
                hasSuggestion: false,
                highlightGenerateButton: true
            )
        )
        XCTAssertFalse(
            MainFlowLayoutLogic.showsCompactResultLayout(
                hasSuggestion: false,
                sourceWardrobeItemId: 42,
                highlightGenerateButton: true
            )
        )
    }

    func testShowsCreationLayoutWhenHighlightGenerateDespiteStaleSuggestion() {
        XCTAssertTrue(
            MainFlowLayoutLogic.isWardrobeStylePending(
                sourceWardrobeItemId: 42,
                hasSuggestion: true,
                highlightGenerateButton: true
            )
        )
        XCTAssertFalse(
            MainFlowLayoutLogic.showsCompactResultLayout(
                hasSuggestion: true,
                sourceWardrobeItemId: 42,
                highlightGenerateButton: true
            )
        )
    }

    func testShowsCompactLayoutAfterWardrobeSuggestionGenerated() {
        XCTAssertFalse(
            MainFlowLayoutLogic.isWardrobeStylePending(
                sourceWardrobeItemId: 42,
                hasSuggestion: true,
                highlightGenerateButton: false
            )
        )
        XCTAssertTrue(
            MainFlowLayoutLogic.showsCompactResultLayout(
                hasSuggestion: true,
                sourceWardrobeItemId: 42,
                highlightGenerateButton: false
            )
        )
    }

    // MARK: - Upload category resolution

    func testResolvedUploadCategoryFromMetadata() {
        let suggestion = OutfitSuggestion(
            shirt: "White shirt",
            trouser: "Navy trousers",
            blazer: "Gray blazer",
            shoes: "Black shoes",
            belt: "Brown belt",
            reasoning: "Test",
            model_image: nil,
            matching_wardrobe_items: nil,
            upload_matched_category: "trouser"
        )
        XCTAssertEqual(
            OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion),
            "trouser"
        )
    }

    func testResolvedUploadCategoryPrefersMetadataOverBlazerUploadText() {
        let suggestion = OutfitSuggestion(
            shirt: "White shirt",
            trouser: "Navy trousers",
            blazer: "From your upload — navy bomber jacket",
            shoes: "Black shoes",
            belt: "Brown belt",
            reasoning: "Test",
            model_image: nil,
            matching_wardrobe_items: nil,
            upload_matched_category: "outerwear"
        )
        XCTAssertEqual(
            OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion),
            "outerwear"
        )
    }

    func testJacketSourceWardrobeNormalizesUploadCategoryToOuterwear() {
        let suggestion = OutfitSuggestion(
            shirt: "White shirt",
            trouser: "Navy trousers",
            blazer: "Navy blazer",
            shoes: "Black shoes",
            belt: "Brown belt",
            reasoning: "Test",
            model_image: nil,
            matching_wardrobe_items: nil,
            upload_matched_category: "blazer",
            source_slot: "blazer"
        )
        let normalized = OutfitItemCardSourceTag.applyingSourceWardrobeUploadCategory(
            to: suggestion,
            sourceCategory: "jacket"
        )
        XCTAssertEqual(normalized.upload_matched_category, "outerwear")
    }
}
