import XCTest
@testable import OutfitSuggestor

final class RandomHistorySelectionTests: XCTestCase {
    private func makeEntry(
        id: Int,
        createdAt: String,
        shirt: String = "white shirt",
        trouser: String = "black trouser",
        blazer: String = "black blazer",
        shoes: String = "black shoes",
        belt: String = "black belt",
        shirtId: Int? = nil
    ) -> OutfitHistoryEntry {
        OutfitHistoryEntry(
            id: id,
            created_at: createdAt,
            text_input: nil,
            image_data: nil,
            model_image: nil,
            shirt: shirt,
            trouser: trouser,
            blazer: blazer,
            shoes: shoes,
            belt: belt,
            reasoning: "test",
            shirt_id: shirtId
        )
    }

    func testFingerprintIncludesCoreFieldsAndWardrobeIds() {
        let entry = makeEntry(id: 1, createdAt: "2026-01-01T00:00:00Z", shirtId: 42)
        let fingerprint = RandomHistorySelection.outfitFingerprint(for: entry)
        XCTAssertTrue(fingerprint.contains("shirt:white shirt"))
        XCTAssertTrue(fingerprint.contains("shirt_id:42"))
    }

    func testFingerprintNormalizesCaseAndWhitespace() {
        let entry = makeEntry(
            id: 1,
            createdAt: "2026-01-01T00:00:00Z",
            shirt: "  White Shirt  "
        )
        XCTAssertTrue(
            RandomHistorySelection.outfitFingerprint(for: entry).contains("shirt:white shirt")
        )
    }

    func testDeduplicateKeepsMostRecentPerFingerprint() {
        let older = makeEntry(id: 1, createdAt: "2026-01-01T00:00:00Z")
        let newer = makeEntry(id: 2, createdAt: "2026-01-03T00:00:00Z")
        let different = makeEntry(
            id: 3,
            createdAt: "2026-01-02T00:00:00Z",
            shirt: "blue shirt"
        )

        let deduped = RandomHistorySelection.deduplicateEntries([older, newer, different])
        XCTAssertEqual(deduped.count, 2)
        XCTAssertTrue(deduped.contains { $0.id == 2 })
        XCTAssertTrue(deduped.contains { $0.id == 3 })
    }

    func testDeduplicateTieBreaksOnHigherIdWhenCreatedAtEqual() {
        let lower = makeEntry(id: 1, createdAt: "2026-01-01T00:00:00Z")
        let higher = makeEntry(id: 5, createdAt: "2026-01-01T00:00:00Z")

        let deduped = RandomHistorySelection.deduplicateEntries([lower, higher])
        XCTAssertEqual(deduped.count, 1)
        XCTAssertEqual(deduped.first?.id, 5)
    }

    func testPickExcludesCurrentHistoryId() {
        let entryA = makeEntry(id: 1, createdAt: "2026-01-01T00:00:00Z")
        let entryB = makeEntry(
            id: 2,
            createdAt: "2026-01-02T00:00:00Z",
            shirt: "blue shirt"
        )
        var selection = RandomHistorySelection(shuffle: { $0 })

        let result = selection.pick(from: [entryA, entryB], excludeCurrentId: 1)
        XCTAssertEqual(result.entry?.id, 2)
    }

    func testPickExcludesRecentSessionIds() {
        let entries = (1...6).map { index in
            makeEntry(
                id: index,
                createdAt: "2026-01-0\(index)T00:00:00Z",
                shirt: "shirt \(index)"
            )
        }
        var selection = RandomHistorySelection(shuffle: { $0.sorted() })
        for _ in 0..<5 {
            _ = selection.pick(from: entries, excludeCurrentId: nil)
        }

        let result = selection.pick(from: entries, excludeCurrentId: nil)
        XCTAssertEqual(result.entry?.id, 6)
    }

    func testPickRelaxesRecentExclusionWhenPoolEmpty() {
        let entryA = makeEntry(id: 1, createdAt: "2026-01-01T00:00:00Z")
        let entryB = makeEntry(
            id: 2,
            createdAt: "2026-01-02T00:00:00Z",
            shirt: "blue shirt"
        )
        var selection = RandomHistorySelection(shuffle: { _ in [2, 1] })
        _ = selection.pick(from: [entryA, entryB], excludeCurrentId: nil)

        let result = selection.pick(from: [entryA, entryB], excludeCurrentId: 1)
        XCTAssertEqual(result.entry?.id, 2)
    }

    func testDeckRotationAvoidsImmediateRepeatWithMultipleUniqueLooks() {
        let entryA = makeEntry(id: 1, createdAt: "2026-01-01T00:00:00Z")
        let entryB = makeEntry(
            id: 2,
            createdAt: "2026-01-02T00:00:00Z",
            shirt: "blue shirt"
        )
        var selection = RandomHistorySelection(shuffle: { $0 })

        let first = selection.pick(from: [entryA, entryB], excludeCurrentId: nil)
        let second = selection.pick(from: [entryA, entryB], excludeCurrentId: first.entry?.id)

        XCTAssertNotEqual(first.entry?.id, second.entry?.id)
    }

    func testSingleLookToastShownOncePerSession() {
        let onlyLook = makeEntry(id: 1, createdAt: "2026-01-01T00:00:00Z")
        var selection = RandomHistorySelection(shuffle: { $0 })

        let first = selection.pick(from: [onlyLook], excludeCurrentId: nil)
        let second = selection.pick(from: [onlyLook], excludeCurrentId: nil)

        XCTAssertTrue(first.shouldShowSingleLookToast)
        XCTAssertFalse(second.shouldShowSingleLookToast)
        XCTAssertEqual(first.entry?.id, 1)
        XCTAssertEqual(second.entry?.id, 1)
    }

    func testPickReturnsNilForEmptyHistory() {
        var selection = RandomHistorySelection()
        let result = selection.pick(from: [], excludeCurrentId: nil)
        XCTAssertNil(result.entry)
        XCTAssertFalse(result.shouldShowSingleLookToast)
    }

    func testResetClearsSessionState() {
        var selection = RandomHistorySelection(shuffle: { $0 })
        let entryA = makeEntry(id: 1, createdAt: "2026-01-01T00:00:00Z")
        let entryB = makeEntry(
            id: 2,
            createdAt: "2026-01-02T00:00:00Z",
            shirt: "blue shirt"
        )
        _ = selection.pick(from: [entryA, entryB], excludeCurrentId: nil)

        selection.reset()

        XCTAssertTrue(selection.deck.isEmpty)
        XCTAssertTrue(selection.recentPicks.isEmpty)
        XCTAssertFalse(selection.hasShownSingleLookToast)
    }
}
