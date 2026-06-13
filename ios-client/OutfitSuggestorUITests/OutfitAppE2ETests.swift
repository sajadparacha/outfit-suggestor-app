import XCTest

final class OutfitAppE2ETests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        executionTimeAllowance = 180
        app = XCUIApplication()
        app.launchArguments.append("UI_TEST_MODE")
        app.launchEnvironment["UI_TEST_MODE"] = "1"
        app.launch()
        XCTAssertTrue(
            app.buttons["main.useSampleImageButton"].waitForExistence(timeout: 30),
            "Suggest screen did not become ready after launch"
        )
        waitForAppUnlocked(timeout: 15)
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

    private func openTab(_ name: String, timeout: TimeInterval = 20) {
        let tabBarButton = app.tabBars.buttons[name]
        let target = tabBarButton.waitForExistence(timeout: timeout) ? tabBarButton : tabTarget(name)
        XCTAssertTrue(target.waitForExistence(timeout: timeout), "Tab \"\(name)\" not found")
        target.tap()
    }

    private func historyCard(entryId: Int) -> XCUIElement {
        let card = app.otherElements["history.card.\(entryId)"]
        if card.exists { return card }
        let date = app.staticTexts["history.card.date.\(entryId)"]
        if date.exists { return date }
        return app.descendants(matching: .any)["history.card.\(entryId)"]
    }

    @discardableResult
    private func scrollToInsightsAdminSection(timeout: TimeInterval = 12) -> Bool {
        let adminMarker = app.descendants(matching: .any)["insights.adminDebug"]
        let costTitle = app.staticTexts["Analysis Cost"]
        let scrollView = app.scrollViews.firstMatch
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if adminMarker.waitForExistence(timeout: 0.3) { return true }
            if costTitle.waitForExistence(timeout: 0.3) { return true }
            if app.staticTexts["Admin diagnostics"].waitForExistence(timeout: 0.3) { return true }
            if scrollView.exists {
                scrollView.swipeUp()
            } else {
                app.swipeUp()
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.25))
        }
        return adminMarker.exists || costTitle.exists || app.staticTexts["Admin diagnostics"].exists
    }

    @discardableResult
    private func scrollToHistoryCard(entryId: Int, timeout: TimeInterval = 12) -> Bool {
        let card = historyCard(entryId: entryId)
        let scrollView = app.scrollViews.firstMatch
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if card.waitForExistence(timeout: 0.4) { return true }
            if scrollView.exists {
                scrollView.swipeUp()
            } else {
                app.swipeUp()
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.25))
        }
        return card.exists
    }

    private func openWardrobe() {
        openTab("Wardrobe")
        XCTAssertTrue(waitFor(app.buttons["wardrobe.chip.all"]))
        waitForAppUnlocked()
    }

    private func openHistory() {
        openTab("Looks")
        XCTAssertTrue(waitFor(app.buttons["history.loadAllButton"]))
        waitForAppUnlocked()
    }

    private func addSampleImageOnSuggest() {
        XCTAssertTrue(waitFor(app.buttons["main.useSampleImageButton"]))
        app.buttons["main.useSampleImageButton"].tap()
        XCTAssertTrue(waitFor(app.buttons["main.getSuggestionButton"]))
    }

    private func waitForAppUnlocked(timeout: TimeInterval = 10) {
        let lock = app.otherElements["global.loadingLock"]
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if !lock.exists { return }
            RunLoop.current.run(until: Date().addingTimeInterval(0.15))
        }
    }

    /// History list uses its own loading UI; global.loadingLock clears before entries render.
    private func waitForHistoryIdle(timeout: TimeInterval = 12) -> Bool {
        let loadingText = app.staticTexts["Loading history…"]
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if !loadingText.exists { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.15))
        }
        return !loadingText.exists
    }

    private func waitForHistoryEntryCount(_ count: Int, timeout: TimeInterval = 12) -> Bool {
        let predicate = NSPredicate(format: "label CONTAINS 'Showing last \(count) entries'")
        let marker = app.staticTexts.containing(predicate).firstMatch
        return marker.waitForExistence(timeout: timeout)
    }

    private func assertVisibleWardrobeItemIDs(_ expected: String, timeout: TimeInterval = 8) {
        let marker = app.otherElements["wardrobe.visibleItemIDs"]
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if marker.exists, marker.label == expected { return }
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        XCTFail(
            "Expected visible wardrobe IDs \"\(expected)\", got \"\(marker.label)\" (exists=\(marker.exists))"
        )
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

        let toastDeadline = Date().addingTimeInterval(6)
        while Date() < toastDeadline, toastText.exists {
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        XCTAssertFalse(toastText.exists)
    }

    func testHistorySearchSortAndLoadAll() {
        openHistory()

        XCTAssertFalse(historyCard(entryId: 102).exists)
        app.buttons["history.loadAllButton"].tap()
        XCTAssertTrue(waitForHistoryIdle(timeout: 12), "History loading spinner did not dismiss")
        XCTAssertTrue(
            waitForHistoryEntryCount(3, timeout: 12),
            "Expected 3 history entries after Load All"
        )
        XCTAssertTrue(
            historyCard(entryId: 100).waitForExistence(timeout: 4),
            "Expected newest history entry 100 after Load All"
        )
        XCTAssertTrue(scrollToHistoryCard(entryId: 102, timeout: 16), "Expected history entry 102 after Load All")

        let searchField = app.textFields["history.searchField"]
        searchField.tap()
        searchField.typeText("brogues")
        app.buttons["history.searchButton"].tap()
        waitForAppUnlocked()
        XCTAssertTrue(scrollToHistoryCard(entryId: 101, timeout: 8))
        XCTAssertFalse(historyCard(entryId: 100).exists)

        searchField.tap()
        if let current = searchField.value as? String, !current.isEmpty {
            let delete = String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count)
            searchField.typeText(delete)
        }
        app.buttons["history.searchButton"].tap()

        app.buttons["history.sortMenu"].tap()
        app.buttons["Oldest First"].tap()
        waitForAppUnlocked()
        XCTAssertTrue(scrollToHistoryCard(entryId: 102, timeout: 8))
    }

    func testSuggestFlowFromSampleImageShowsResultCard() {
        addSampleImageOnSuggest()
        app.buttons["main.getSuggestionButton"].tap()
        XCTAssertTrue(app.staticTexts["Your Styled Look"].waitForExistence(timeout: 6))
    }

    func testResultActionButtonsAreVisibleAfterSuggestion() {
        addSampleImageOnSuggest()
        app.buttons["main.getSuggestionButton"].tap()
        XCTAssertTrue(app.staticTexts["Your Styled Look"].waitForExistence(timeout: 6))

        XCTAssertTrue(app.buttons["main.generateAnotherButton"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["main.saveLookButton"].exists)
        XCTAssertTrue(app.buttons["main.refineButton"].exists)
        XCTAssertFalse(app.buttons["main.likeButton"].exists)
    }

    func testChangeOccasionOpensPickerSheet() {
        addSampleImageOnSuggest()
        app.buttons["main.getSuggestionButton"].tap()
        XCTAssertTrue(app.staticTexts["Your Styled Look"].waitForExistence(timeout: 6))

        app.buttons["main.refineButton"].tap()
        XCTAssertTrue(app.buttons["main.refineChangeOccasionButton"].waitForExistence(timeout: 4))
        app.buttons["main.refineChangeOccasionButton"].tap()
        XCTAssertTrue(app.navigationBars["Change occasion"].waitForExistence(timeout: 4))
    }

    func testGenerateAnotherLookKeepsResultVisible() {
        addSampleImageOnSuggest()
        app.buttons["main.getSuggestionButton"].tap()
        XCTAssertTrue(app.staticTexts["Your Styled Look"].waitForExistence(timeout: 6))

        app.buttons["main.generateAnotherButton"].tap()
        waitForAppUnlocked(timeout: 8)
        XCTAssertTrue(app.staticTexts["Your Styled Look"].waitForExistence(timeout: 6))
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
        XCTAssertTrue(app.staticTexts["Your Styled Look"].waitForExistence(timeout: 6))

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
        XCTAssertTrue(app.staticTexts["Your Styled Look"].waitForExistence(timeout: 6))
    }

    func testAiProgressPanelAppearsDuringSuggestionAndTabsStayUsable() {
        addSampleImageOnSuggest()
        app.buttons["main.getSuggestionButton"].tap()

        let progressPanel = app.descendants(matching: .any)["ai.progressPanel"]
        let progressTitle = app.staticTexts["ai.progressTitle"]
        let cancelButton = app.buttons["ai.progressCancelButton"]
        let sawProgress = progressTitle.waitForExistence(timeout: 8)
            || progressPanel.waitForExistence(timeout: 2)
            || cancelButton.waitForExistence(timeout: 2)
        XCTAssertTrue(sawProgress, "Expected AI progress panel during suggestion")

        let historyTarget = tabTarget("Looks")
        XCTAssertTrue(waitFor(historyTarget, timeout: 2))
        historyTarget.tap()
        XCTAssertTrue(app.navigationBars["Looks"].waitForExistence(timeout: 3))

        openTab("Suggest")
        XCTAssertTrue(app.staticTexts["Your Styled Look"].waitForExistence(timeout: 12))
    }

    func testAdminPremiumInsightsShowsCostPromptAndResponse() {
        openTab("Profile")
        XCTAssertTrue(waitFor(app.buttons["profile.insightsLink"]))
        app.buttons["profile.insightsLink"].tap()
        XCTAssertTrue(waitFor(app.buttons["insights.analyzeButton"]))
        XCTAssertTrue(app.staticTexts["Wardrobe Insights"].waitForExistence(timeout: 4))
        XCTAssertTrue(
            app.staticTexts["How would you like to check your wardrobe?"].waitForExistence(timeout: 4)
        )
        XCTAssertTrue(app.buttons["Quick Check"].waitForExistence(timeout: 2))

        if app.buttons["AI Stylist"].waitForExistence(timeout: 2) {
            app.buttons["AI Stylist"].tap()
        } else {
            let premiumSegment = app.segmentedControls.element(boundBy: 0).buttons.element(boundBy: 1)
            XCTAssertTrue(premiumSegment.waitForExistence(timeout: 2))
            premiumSegment.tap()
        }

        app.buttons["insights.analyzeButton"].tap()
        waitForAppUnlocked(timeout: 8)

        XCTAssertTrue(app.otherElements["insights.results"].waitForExistence(timeout: 8))
        let summary = app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS %@", "Premium wardrobe analysis completed")
        ).firstMatch
        XCTAssertTrue(summary.waitForExistence(timeout: 4))

        XCTAssertTrue(
            scrollToInsightsAdminSection(timeout: 12),
            "Expected admin diagnostics section after scrolling insights results"
        )

        let adminDiagnostics = app.descendants(matching: .any)["insights.adminDiagnostics"]
        let adminDebugPanel = app.descendants(matching: .any)["insights.adminDebug"]
        XCTAssertTrue(
            adminDiagnostics.waitForExistence(timeout: 2) || adminDebugPanel.waitForExistence(timeout: 2)
                || app.staticTexts["Admin diagnostics"].waitForExistence(timeout: 2)
        )
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
