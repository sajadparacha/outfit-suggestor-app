import XCTest
@testable import OutfitSuggestor

final class ShoppingListStorageTests: XCTestCase {
    private var defaults: UserDefaults!
    private var suiteName: String!

    override func setUp() {
        super.setUp()
        suiteName = "ShoppingListStorageTests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)!
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        defaults = nil
        suiteName = nil
        super.tearDown()
    }

    func testStorageKeyUsesContextAndSortedItemIds() {
        let context = WardrobeInsightContext(occasion: "Business", season: "Winter", style: "Smart Casual")
        let key = ShoppingListStorage.storageKey(context: context, itemIds: ["b", "a", "c"])

        XCTAssertTrue(key.hasPrefix(ShoppingListStorage.keyPrefix))
        XCTAssertTrue(key.contains("business|winter|smart casual"))
        XCTAssertTrue(key.hasSuffix(":a,b,c"))
    }

    func testSaveAndLoadRoundTrip() {
        let context = WardrobeInsightContext(occasion: "casual", season: "summer", style: "relaxed")
        let key = ShoppingListStorage.storageKey(context: context, itemIds: ["item-1"])
        let entries: [String: ShoppingListChecklistEntry] = [
            "item-1": ShoppingListChecklistEntry(isBought: true, notes: "Found at mall"),
        ]

        ShoppingListStorage.save(entries, forKey: key, defaults: defaults)
        let loaded = ShoppingListStorage.load(forKey: key, defaults: defaults)

        XCTAssertEqual(loaded["item-1"]?.isBought, true)
        XCTAssertEqual(loaded["item-1"]?.notes, "Found at mall")
    }

    func testLoadReturnsEmptyDictionaryForMissingKey() {
        let loaded = ShoppingListStorage.load(forKey: "missing-key", defaults: defaults)
        XCTAssertTrue(loaded.isEmpty)
    }
}
