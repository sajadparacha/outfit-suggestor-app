import XCTest
@testable import OutfitSuggestor

final class WardrobeRandomSessionTests: XCTestCase {
    func testSuggestionFingerprintIncludesCorePiecesAndWardrobeIds() {
        let suggestion = OutfitSuggestion(
            shirt: "White Shirt",
            trouser: "Navy Trouser",
            blazer: "Gray Blazer",
            shoes: "Brown Shoes",
            belt: "Brown Belt",
            reasoning: "Smart casual",
            sweater: "Wool Sweater",
            shirt_id: 10,
            sweater_id: 20
        )

        let fingerprint = WardrobeRandomSession.suggestionFingerprint(for: suggestion)

        XCTAssertTrue(fingerprint.contains("shirt:white shirt"))
        XCTAssertTrue(fingerprint.contains("sweater:wool sweater"))
        XCTAssertTrue(fingerprint.contains("shirt_id:10"))
        XCTAssertTrue(fingerprint.contains("sweater_id:20"))
    }

    func testRecordTracksRecentFingerprintsAndAvoidTexts() {
        let first = OutfitSuggestion(
            shirt: "Blue shirt",
            trouser: "Grey trouser",
            blazer: "Navy blazer",
            shoes: "Brown shoes",
            belt: "Brown belt",
            reasoning: "Look one"
        )
        let second = OutfitSuggestion(
            shirt: "Green shirt",
            trouser: "Tan trouser",
            blazer: "Olive blazer",
            shoes: "White shoes",
            belt: "Tan belt",
            reasoning: "Look two"
        )

        var session = WardrobeRandomSession()
        session.record(first)
        session.record(second)

        XCTAssertEqual(session.recentFingerprints.count, 2)
        XCTAssertEqual(session.recentOutfitTexts.count, 2)
        XCTAssertTrue(session.isDuplicate(WardrobeRandomSession.suggestionFingerprint(for: first)))
        XCTAssertFalse(session.isDuplicate(WardrobeRandomSession.suggestionFingerprint(for: OutfitSuggestion(
            shirt: "Unique shirt",
            trouser: "Unique trouser",
            blazer: "Unique blazer",
            shoes: "Unique shoes",
            belt: "Unique belt",
            reasoning: "Unique"
        ))))
    }

    func testRecentFingerprintsTrimToLimit() {
        var session = WardrobeRandomSession()
        for index in 0..<(WardrobeRandomSession.recentWardrobeRandomCount + 2) {
            session.record(
                OutfitSuggestion(
                    shirt: "Shirt \(index)",
                    trouser: "Trouser \(index)",
                    blazer: "Blazer \(index)",
                    shoes: "Shoes \(index)",
                    belt: "Belt \(index)",
                    reasoning: "Reason \(index)"
                )
            )
        }

        XCTAssertEqual(session.recentFingerprints.count, WardrobeRandomSession.recentWardrobeRandomCount)
        XCTAssertEqual(session.recentOutfitTexts.count, WardrobeRandomSession.recentWardrobeRandomCount)
        XCTAssertFalse(session.isDuplicate(WardrobeRandomSession.suggestionFingerprint(for: OutfitSuggestion(
            shirt: "Shirt 0",
            trouser: "Trouser 0",
            blazer: "Blazer 0",
            shoes: "Shoes 0",
            belt: "Belt 0",
            reasoning: "Reason 0"
        ))))
    }

    func testAvoidOutfitTextsExcludesPreviousOutfitText() {
        let suggestion = OutfitSuggestion(
            shirt: "Blue shirt",
            trouser: "Grey trouser",
            blazer: "Navy blazer",
            shoes: "Brown shoes",
            belt: "Brown belt",
            reasoning: "Look one"
        )
        var session = WardrobeRandomSession()
        session.record(suggestion)

        let previousText = OutfitPromptUtils.formatPreviousOutfitForPrompt(suggestion)
        let avoidTexts = session.avoidOutfitTexts(excludingPrevious: previousText)

        XCTAssertTrue(avoidTexts.isEmpty)
        XCTAssertEqual(session.avoidOutfitTexts().count, 1)
    }

    func testResetClearsSessionState() {
        var session = WardrobeRandomSession()
        session.record(
            OutfitSuggestion(
                shirt: "Blue shirt",
                trouser: "Grey trouser",
                blazer: "Navy blazer",
                shoes: "Brown shoes",
                belt: "Brown belt",
                reasoning: "Look one"
            )
        )

        session.reset()

        XCTAssertTrue(session.recentFingerprints.isEmpty)
        XCTAssertTrue(session.recentOutfitTexts.isEmpty)
        XCTAssertFalse(session.isDuplicate("shirt:blue shirt"))
    }
}
