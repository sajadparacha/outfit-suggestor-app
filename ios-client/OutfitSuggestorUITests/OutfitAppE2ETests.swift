import XCTest

final class OutfitAppE2ETests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments.append("UI_TEST_MODE")
        app.launchEnvironment["UI_TEST_MODE"] = "1"
        app.launch()
    }

    @discardableResult
    private func waitFor(_ element: XCUIElement, timeout: TimeInterval = 10) -> Bool {
        element.waitForExistence(timeout: timeout)
    }

    private func openWardrobe() {
        XCTAssertTrue(waitFor(app.tabBars.buttons["Wardrobe"]))
        app.tabBars.buttons["Wardrobe"].tap()
        XCTAssertTrue(waitFor(app.buttons["wardrobe.chip.all"]))
        waitForAppUnlocked()
    }

    private func openHistory() {
        XCTAssertTrue(waitFor(app.tabBars.buttons["History"]))
        app.tabBars.buttons["History"].tap()
        XCTAssertTrue(waitFor(app.buttons["history.loadAllButton"]))
    }

    private func addSampleImageOnSuggest() {
        XCTAssertTrue(waitFor(app.buttons["main.useSampleImageButton"]))
        app.buttons["main.useSampleImageButton"].tap()
        XCTAssertTrue(waitFor(app.buttons["main.getSuggestionButton"]))
    }

    private func waitForAppUnlocked(timeout: TimeInterval = 6) {
        let lock = app.otherElements["global.loadingLock"]
        let unlocked = NSPredicate(format: "exists == false")
        expectation(for: unlocked, evaluatedWith: lock)
        waitForExpectations(timeout: timeout)
    }

    private func assertVisibleWardrobeItemIDs(_ expected: String, timeout: TimeInterval = 4) {
        let marker = app.otherElements["wardrobe.visibleItemIDs"]
        XCTAssertTrue(waitFor(marker, timeout: timeout))
        let predicate = NSPredicate(format: "label == %@", expected)
        expectation(for: predicate, evaluatedWith: marker)
        waitForExpectations(timeout: timeout)
    }

    func testWardrobeFilterChipsUpdateVisibleList() {
        openWardrobe()

        waitForAppUnlocked()
        app.buttons["wardrobe.chip.trouser"].tap()
        assertVisibleWardrobeItemIDs("2")

        waitForAppUnlocked()
        app.buttons["wardrobe.chip.shoes"].tap()
        assertVisibleWardrobeItemIDs("3")

        waitForAppUnlocked()
        app.buttons["wardrobe.chip.belt"].tap()
        assertVisibleWardrobeItemIDs("4")

        waitForAppUnlocked()
        app.buttons["wardrobe.chip.other"].tap()
        assertVisibleWardrobeItemIDs("5")

        waitForAppUnlocked()
        app.buttons["wardrobe.chip.all"].tap()
        assertVisibleWardrobeItemIDs("1,2,3,4,5")
    }

    func testEmptyCategoryFallsBackToAllAndToastAutoHides() {
        openWardrobe()
        waitForAppUnlocked()
        app.buttons["wardrobe.chip.blazer"].tap()

        let toastText = app.staticTexts["wardrobe.categoryInfoToastText"]
        XCTAssertTrue(toastText.waitForExistence(timeout: 2))
        assertVisibleWardrobeItemIDs("1,2,3,4,5")

        let toastGone = NSPredicate(format: "exists == false")
        expectation(for: toastGone, evaluatedWith: toastText)
        waitForExpectations(timeout: 5)
    }

    func testHistorySearchSortAndLoadAll() {
        openHistory()

        XCTAssertFalse(app.staticTexts["May 20, 2026, 8:15 AM"].exists)
        app.buttons["history.loadAllButton"].tap()
        XCTAssertTrue(app.staticTexts["May 20, 2026, 8:15 AM"].waitForExistence(timeout: 3))

        let searchField = app.textFields["history.searchField"]
        searchField.tap()
        searchField.typeText("brogues")
        app.buttons["history.searchButton"].tap()
        XCTAssertTrue(app.staticTexts["May 21, 2026, 9:00 AM"].waitForExistence(timeout: 2))
        XCTAssertFalse(app.staticTexts["May 22, 2026, 10:19 AM"].exists)

        searchField.tap()
        if let current = searchField.value as? String, !current.isEmpty {
            let delete = String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count)
            searchField.typeText(delete)
        }
        app.buttons["history.searchButton"].tap()

        app.buttons["history.sortMenu"].tap()
        app.buttons["Oldest First"].tap()
        XCTAssertTrue(app.staticTexts["May 20, 2026, 8:15 AM"].exists)
    }

    func testSuggestFlowFromSampleImageShowsResultCard() {
        addSampleImageOnSuggest()
        app.buttons["main.getSuggestionButton"].tap()
        XCTAssertTrue(app.staticTexts["Your Perfect Outfit"].waitForExistence(timeout: 6))
    }

    func testWardrobeActionButtonsNavigateToExpectedPaths() {
        openWardrobe()
        XCTAssertTrue(waitFor(app.buttons["Get Suggestion"].firstMatch))

        app.buttons["Get Suggestion"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Your Perfect Outfit"].waitForExistence(timeout: 6))

        openWardrobe()
        XCTAssertTrue(app.buttons["Past Suggestions"].firstMatch.waitForExistence(timeout: 2))
        app.buttons["Past Suggestions"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Past Suggestions"].waitForExistence(timeout: 3))

        app.buttons["Use This"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Your Perfect Outfit"].waitForExistence(timeout: 4))
    }

    func testGlobalAppLockAppearsDuringServerCalls() {
        addSampleImageOnSuggest()
        app.buttons["main.getSuggestionButton"].tap()

        app.tabBars.buttons["History"].tap()
        XCTAssertFalse(app.navigationBars["Outfit History"].exists)

        XCTAssertTrue(app.staticTexts["Your Perfect Outfit"].waitForExistence(timeout: 8))
    }
}
