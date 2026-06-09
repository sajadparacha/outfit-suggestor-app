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

    private func tabTarget(_ name: String) -> XCUIElement {
        let tabBarButton = app.tabBars.buttons[name]
        if tabBarButton.exists { return tabBarButton }

        let navButton = app.navigationBars.buttons[name]
        if navButton.exists { return navButton }

        let button = app.buttons[name].firstMatch
        if button.exists { return button }

        let cell = app.cells[name].firstMatch
        if cell.exists { return cell }

        return tabBarButton
    }

    private func openTab(_ name: String, timeout: TimeInterval = 10) {
        let predicate = NSPredicate(format: "exists == true")
        let target = tabTarget(name)
        expectation(for: predicate, evaluatedWith: target)
        waitForExpectations(timeout: timeout)
        target.tap()
    }

    private func openWardrobe() {
        openTab("Wardrobe")
        XCTAssertTrue(waitFor(app.buttons["wardrobe.chip.all"]))
        waitForAppUnlocked()
    }

    private func openHistory() {
        openTab("Looks")
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

    private func wardrobeHeroButton(itemId: Int) -> XCUIElement {
        app.buttons["wardrobe.getSuggestion.\(itemId)"]
    }

    private func scrollWardrobeItemIntoView(itemId: Int) {
        let hero = wardrobeHeroButton(itemId: itemId)
        let menu = wardrobeMenuTrigger(itemId: itemId)
        let list = app.scrollViews["wardrobe.itemsList"]
        for _ in 0..<6 {
            if hero.exists, hero.isHittable { return }
            if menu.exists, menu.isHittable { return }
            if list.exists {
                list.swipeUp()
            } else {
                app.swipeUp()
            }
        }
    }

    private func tapWardrobeHeroButton(itemId: Int, timeout: TimeInterval = 10) {
        scrollWardrobeItemIntoView(itemId: itemId)
        let byIdentifier = wardrobeHeroButton(itemId: itemId)
        if waitFor(byIdentifier, timeout: timeout) {
            byIdentifier.tap()
            return
        }
        let byLabel = app.buttons["Style this item with AI"].firstMatch
        XCTAssertTrue(waitFor(byLabel, timeout: timeout))
        byLabel.tap()
    }

    private func wardrobeMenuTrigger(itemId: Int) -> XCUIElement {
        app.buttons["wardrobe.itemMenu.\(itemId)"]
    }

    private func tapWardrobeMenuTrigger(itemId: Int, timeout: TimeInterval = 10) {
        scrollWardrobeItemIntoView(itemId: itemId)
        let byIdentifier = wardrobeMenuTrigger(itemId: itemId)
        if waitFor(byIdentifier, timeout: timeout) {
            byIdentifier.tap()
            return
        }
        let byLabel = app.buttons["More actions"].firstMatch
        XCTAssertTrue(waitFor(byLabel, timeout: timeout))
        byLabel.tap()
    }

    private func tapWardrobePastSuggestions(itemId: Int, timeout: TimeInterval = 10) {
        scrollWardrobeItemIntoView(itemId: itemId)
        tapWardrobeMenuTrigger(itemId: itemId, timeout: timeout)

        let identifier = "wardrobe.menu.history.\(itemId)"
        let candidates: [XCUIElement] = [
            app.buttons[identifier],
            app.descendants(matching: .any)[identifier],
            app.menuItems["Past Suggestions"],
            app.menus.firstMatch.menuItems["Past Suggestions"],
            app.buttons.matching(
                NSPredicate(format: "label CONTAINS %@", "Past Suggestions")
            ).firstMatch,
            app.buttons["Past Suggestions"].firstMatch,
        ]
        for element in candidates {
            if waitFor(element, timeout: 2) {
                element.tap()
                return
            }
        }

        let fallback = app.menuItems["Past Suggestions"]
        XCTAssertTrue(
            waitFor(fallback, timeout: timeout),
            "Past Suggestions menu item not found after opening wardrobe overflow menu"
        )
        fallback.tap()
    }

    private func tapWardrobeHistoryUseThis(timeout: TimeInterval = 12) {
        let byIdentifier = app.buttons.matching(
            NSPredicate(format: "identifier BEGINSWITH 'wardrobe.history.useThis.'")
        ).firstMatch
        if waitFor(byIdentifier, timeout: timeout) {
            byIdentifier.tap()
            return
        }
        let useThis = app.buttons["Use This"].firstMatch
        XCTAssertTrue(waitFor(useThis, timeout: timeout))
        useThis.tap()
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

    func testResultActionButtonsAreVisibleAfterSuggestion() {
        addSampleImageOnSuggest()
        app.buttons["main.getSuggestionButton"].tap()
        XCTAssertTrue(app.staticTexts["Your Perfect Outfit"].waitForExistence(timeout: 6))

        XCTAssertTrue(app.buttons["main.generateAnotherButton"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["main.makeMoreFormalButton"].exists)
        XCTAssertTrue(app.buttons["main.makeMoreCasualButton"].exists)
        XCTAssertTrue(app.buttons["main.changeOccasionButton"].exists)
    }

    func testChangeOccasionOpensPickerSheet() {
        addSampleImageOnSuggest()
        app.buttons["main.getSuggestionButton"].tap()
        XCTAssertTrue(app.staticTexts["Your Perfect Outfit"].waitForExistence(timeout: 6))

        app.buttons["main.changeOccasionButton"].tap()
        XCTAssertTrue(app.navigationBars["Change Occasion"].waitForExistence(timeout: 4))
    }

    func testGenerateAnotherLookKeepsResultVisible() {
        addSampleImageOnSuggest()
        app.buttons["main.getSuggestionButton"].tap()
        XCTAssertTrue(app.staticTexts["Your Perfect Outfit"].waitForExistence(timeout: 6))

        app.buttons["main.generateAnotherButton"].tap()
        waitForAppUnlocked(timeout: 8)
        XCTAssertTrue(app.staticTexts["Your Perfect Outfit"].waitForExistence(timeout: 6))
    }

    private func focusWardrobeItem(_ itemId: Int) {
        switch itemId {
        case 1: app.buttons["wardrobe.chip.shirt"].tap()
        case 2: app.buttons["wardrobe.chip.trouser"].tap()
        case 3: app.buttons["wardrobe.chip.shoes"].tap()
        case 4: app.buttons["wardrobe.chip.belt"].tap()
        default: app.buttons["wardrobe.chip.other"].tap()
        }
        waitForAppUnlocked()
        assertVisibleWardrobeItemIDs("\(itemId)")
    }

    func testWardrobeActionButtonsNavigateToExpectedPaths() {
        let wardrobeItemId = 1

        openWardrobe()
        focusWardrobeItem(wardrobeItemId)
        tapWardrobeHeroButton(itemId: wardrobeItemId)
        waitForAppUnlocked()
        XCTAssertTrue(
            app.staticTexts["From your wardrobe"].waitForExistence(timeout: 6)
                || app.otherElements["main.wardrobeSourceBanner"].waitForExistence(timeout: 1)
        )
        XCTAssertTrue(app.buttons["main.getSuggestionButton"].waitForExistence(timeout: 4))
        app.buttons["main.getSuggestionButton"].tap()
        XCTAssertTrue(app.staticTexts["Your Perfect Outfit"].waitForExistence(timeout: 6))

        openWardrobe()
        focusWardrobeItem(wardrobeItemId)
        tapWardrobePastSuggestions(itemId: wardrobeItemId)
        XCTAssertTrue(app.navigationBars["Past Suggestions"].waitForExistence(timeout: 8))
        waitForAppUnlocked(timeout: 8)
        let suggestionEntry = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS 'SUGGESTION #'")
        ).firstMatch
        XCTAssertTrue(waitFor(suggestionEntry, timeout: 12), "Expected wardrobe history entries")
        tapWardrobeHistoryUseThis()
        XCTAssertTrue(app.staticTexts["Your Perfect Outfit"].waitForExistence(timeout: 6))
    }

    func testAiProgressPanelAppearsDuringSuggestionAndTabsStayUsable() {
        addSampleImageOnSuggest()
        app.buttons["main.getSuggestionButton"].tap()

        let progressPanel = app.otherElements["ai.progressPanel"]
        let progressTitle = app.staticTexts["Creating your outfit"]
        let sawProgress = progressPanel.waitForExistence(timeout: 4)
            || progressTitle.waitForExistence(timeout: 1)
        XCTAssertTrue(sawProgress)

        let historyTarget = tabTarget("Looks")
        XCTAssertTrue(waitFor(historyTarget, timeout: 2))
        historyTarget.tap()
        XCTAssertTrue(app.navigationBars["Looks"].waitForExistence(timeout: 3))

        openTab("Suggest")
        XCTAssertTrue(app.staticTexts["Your Perfect Outfit"].waitForExistence(timeout: 8))
    }

    func testAdminPremiumInsightsShowsCostPromptAndResponse() {
        openTab("Profile")
        XCTAssertTrue(waitFor(app.buttons["profile.insightsLink"]))
        app.buttons["profile.insightsLink"].tap()
        XCTAssertTrue(waitFor(app.buttons["insights.analyzeButton"]))
        XCTAssertTrue(app.staticTexts["What's Missing From My Wardrobe?"].waitForExistence(timeout: 4))
        XCTAssertTrue(app.buttons["Quick Check"].waitForExistence(timeout: 2))

        let premiumSegment = app.segmentedControls["insights.analysisMode"].buttons.element(boundBy: 1)
        if premiumSegment.waitForExistence(timeout: 2) {
            premiumSegment.tap()
        } else if app.buttons["AI Stylist"].waitForExistence(timeout: 2) {
            app.buttons["AI Stylist"].tap()
        }

        app.buttons["insights.analyzeButton"].tap()
        waitForAppUnlocked(timeout: 8)

        let summary = app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS %@", "Premium wardrobe analysis completed")
        ).firstMatch
        XCTAssertTrue(summary.waitForExistence(timeout: 8))

        let scrollView = app.scrollViews.firstMatch
        for _ in 0..<4 where !app.staticTexts["Analysis Cost"].exists {
            if scrollView.exists {
                scrollView.swipeUp()
            } else {
                app.swipeUp()
            }
        }

        XCTAssertTrue(app.buttons["insights.adminDiagnostics"].waitForExistence(timeout: 4))
        XCTAssertTrue(app.staticTexts["Analysis Cost"].waitForExistence(timeout: 4))
        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "$0.012")).firstMatch.exists
        )
        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "ui-test-premium-prompt")).firstMatch.exists
        )
        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "ui-test-premium-response")).firstMatch.exists
        )
    }
}
