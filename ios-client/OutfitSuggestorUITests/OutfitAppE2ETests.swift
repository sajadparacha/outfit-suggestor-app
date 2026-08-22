import XCTest
import UIKit

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

    /// Coordinate taps avoid XCTest "scroll to visible", which SIGKILL'd the runner on iOS 26.
    private func safeTap(_ element: XCUIElement, timeout: TimeInterval = 10, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(
            element.waitForExistence(timeout: timeout),
            "Element did not appear in time",
            file: file,
            line: line
        )
        element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }

    private func tapGetSuggestion() {
        let button = app.buttons["main.getSuggestionButton"]
        XCTAssertTrue(button.waitForExistence(timeout: 10), "Get suggestion button missing")
        if app.scrollViews.firstMatch.exists {
            app.scrollViews.firstMatch.swipeUp()
            RunLoop.current.run(until: Date().addingTimeInterval(0.15))
        }
        button.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }

    private func waitForStyledLook(timeout: TimeInterval = 15, file: StaticString = #filePath, line: UInt = #line) {
        waitForAppUnlocked(timeout: timeout)
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if app.otherElements["main.resultCard"].exists { return }
            if app.staticTexts["main.resultTitle"].exists { return }
            if app.staticTexts["Your Styled Look"].exists { return }
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        XCTFail("Expected styled look result card", file: file, line: line)
    }

    private func enterText(_ field: XCUIElement, _ text: String) {
        XCTAssertTrue(field.waitForExistence(timeout: 8), "Text field missing")
        field.tap()
        if app.keyboards.firstMatch.waitForExistence(timeout: 2) {
            field.typeText(text)
            return
        }
        UIPasteboard.general.string = text
        field.press(forDuration: 1.0)
        let paste = app.menuItems["Paste"].firstMatch
        if paste.waitForExistence(timeout: 2) {
            paste.tap()
        } else {
            field.typeText(text)
        }
    }

    private func tabIdentifier(for name: String) -> String? {
        switch name {
        case "Suggest": return "tab.suggest"
        case "Wardrobe": return "tab.wardrobe"
        case "Week Planner", "Week": return "tab.week"
        case "Insights": return "tab.insights"
        case "Looks": return "tab.history"
        case "Profile": return "tab.profile"
        default: return nil
        }
    }

    private func tabBarButton(named name: String) -> XCUIElement {
        if let id = tabIdentifier(for: name) {
            let byId = app.tabBars.buttons[id]
            if byId.exists { return byId }
            let anyById = app.descendants(matching: .any)[id]
            if anyById.exists { return anyById }
        }
        return app.tabBars.buttons[name]
    }

    /// iOS shows only the first 4 tabs + More when there are 6+ tabs.
    private func openOverflowTabIfNeeded(named name: String) -> Bool {
        let moreCandidates: [XCUIElement] = [
            app.tabBars.buttons["More"],
            app.tabBars.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "More")).firstMatch,
        ]
        var moreButton: XCUIElement?
        for candidate in moreCandidates where candidate.exists {
            moreButton = candidate
            break
        }
        if moreButton == nil, app.tabBars.buttons.count >= 5 {
            moreButton = app.tabBars.buttons.element(boundBy: app.tabBars.buttons.count - 1)
        }
        guard let more = moreButton, more.exists else { return false }

        if !app.navigationBars["More"].exists {
            more.tap()
            RunLoop.current.run(until: Date().addingTimeInterval(0.35))
        }

        let overflowMatches: [XCUIElement] = [
            app.tables.cells.staticTexts[name],
            app.tables.cells[name],
            app.tables.staticTexts[name],
            app.collectionViews.staticTexts[name],
            app.buttons[name].firstMatch,
            app.staticTexts[name].firstMatch,
        ]
        if let id = tabIdentifier(for: name) {
            let byId = app.descendants(matching: .any)[id]
            if byId.waitForExistence(timeout: 1) {
                byId.tap()
                return true
            }
        }
        for match in overflowMatches where match.waitForExistence(timeout: 1) {
            match.tap()
            return true
        }
        return false
    }

    private func tabTarget(_ name: String) -> XCUIElement {
        let tabBarButton = tabBarButton(named: name)
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
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            let tabBarButton = tabBarButton(named: name)
            if tabBarButton.exists, tabBarButton.isHittable {
                tabBarButton.tap()
                return
            }
            // Visible but not yet hittable
            if tabBarButton.waitForExistence(timeout: 0.3), tabBarButton.isHittable {
                tabBarButton.tap()
                return
            }

            if openOverflowTabIfNeeded(named: name) {
                return
            }

            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }

        if openOverflowTabIfNeeded(named: name) {
            return
        }

        let target = tabTarget(name)
        XCTAssertTrue(target.waitForExistence(timeout: 2), "Tab \"\(name)\" not found (including More overflow)")
        target.tap()
    }

    private func historyCard(entryId: Int) -> XCUIElement {
        let card = app.otherElements["history.card.\(entryId)"]
        if card.exists { return card }
        let date = app.staticTexts["history.card.date.\(entryId)"]
        if date.exists { return date }
        return app.descendants(matching: .any)["history.card.\(entryId)"]
    }

    private func insightsElement(identifier: String) -> XCUIElement {
        app.descendants(matching: .any)[identifier]
    }

    private func insightsTextContaining(_ needle: String) -> XCUIElement {
        app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", needle)).firstMatch
    }

    private func accessibilityBlob(_ element: XCUIElement) -> String {
        guard element.exists else { return "" }
        return "\(element.label) \((element.value as? String) ?? "")"
    }

    @discardableResult
    private func scrollToInsightsAdminSection(timeout: TimeInterval = 12) -> Bool {
        let adminMarker = app.descendants(matching: .any)["insights.adminDebug"]
        let costTitle = app.staticTexts["Analysis Cost"]
        let promptPanel = insightsElement(identifier: "insights.inputPrompt")
        let promptText = insightsTextContaining("ui-test-premium-prompt")
        let promptTitle = app.staticTexts["Input Prompt"]
        let scrollView = app.scrollViews.firstMatch
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if promptPanel.waitForExistence(timeout: 0.2)
                || promptText.waitForExistence(timeout: 0.2)
                || promptTitle.waitForExistence(timeout: 0.2) {
                return true
            }
            if adminMarker.waitForExistence(timeout: 0.15) { /* keep scrolling to prompt */ }
            if costTitle.waitForExistence(timeout: 0.15) { /* keep scrolling to prompt */ }
            if app.staticTexts["Admin diagnostics"].waitForExistence(timeout: 0.15) { /* keep scrolling */ }
            if scrollView.exists {
                scrollView.swipeUp()
            } else {
                app.swipeUp()
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        return promptPanel.exists || promptText.exists || promptTitle.exists
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
        dismissWardrobeFlowTipIfPresent()
        collapseWardrobeCompletionPreferencesIfExpanded()
        waitForAppUnlocked()
    }

    private func openHistory() {
        openTab("Looks")
        XCTAssertTrue(waitFor(app.buttons["history.loadAllButton"]))
        waitForAppUnlocked()
    }

    private func addSampleImageOnSuggest() {
        XCTAssertTrue(waitFor(app.buttons["main.useSampleImageButton"]))
        safeTap(app.buttons["main.useSampleImageButton"])
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

    private func dismissWardrobeFlowTipIfPresent() {
        let dismiss = app.buttons["Dismiss"].firstMatch
        if dismiss.exists, dismiss.isHittable {
            dismiss.tap()
        }
    }

    private func wardrobeRow(itemId: Int) -> XCUIElement {
        app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier == %@", "wardrobe.row.\(itemId)")
        ).firstMatch
    }

    private func collapseWardrobeCompletionPreferencesIfExpanded() {
        let occasionFilter = app.buttons["wardrobe.completion.filter.occasion"]
        guard occasionFilter.waitForExistence(timeout: 3) else { return }
        let preferencesToggle = app.staticTexts["Preferences"].firstMatch
        if preferencesToggle.waitForExistence(timeout: 2), preferencesToggle.isHittable {
            preferencesToggle.tap()
            RunLoop.current.run(until: Date().addingTimeInterval(0.3))
        }
    }

    private func wardrobeHeroButton(itemId: Int) -> XCUIElement {
        let identifier = "wardrobe.getSuggestion.\(itemId)"
        let byId = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier == %@", identifier)
        ).firstMatch
        if byId.exists { return byId }

        let byExactLabel = app.buttons.matching(
            NSPredicate(format: "label == %@", "Style this item with AI")
        ).firstMatch
        if byExactLabel.exists { return byExactLabel }

        return app.buttons.matching(
            NSPredicate(format: "label CONTAINS 'Style this item'")
        ).firstMatch
    }

    private func scrollWardrobeItemIntoView(
        itemId: Int,
        requiringHittable target: XCUIElement? = nil,
        timeout: TimeInterval = 12
    ) {
        let hero = wardrobeHeroButton(itemId: itemId)
        let row = wardrobeRow(itemId: itemId)
        let menu = wardrobeMenuTrigger(itemId: itemId)
        let required = target ?? (hero.exists ? hero : row)
        let list = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier == %@", "wardrobe.itemsList")
        ).firstMatch
        let deadline = Date().addingTimeInterval(timeout)
        var upwardPasses = 0
        while Date() < deadline {
            if required.exists, required.isHittable { return }
            if target == nil, hero.exists, hero.isHittable { return }
            if target == nil, row.exists, row.isHittable { return }
            if target == nil, menu.exists, menu.isHittable { return }
            // Never blind-swipe the app — that can leave the Wardrobe tab.
            guard list.exists else { return }
            if upwardPasses < 6 {
                list.swipeUp()
                upwardPasses += 1
            } else {
                list.swipeDown()
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.25))
        }
    }

    private func tapWardrobeHeroButton(itemId: Int, timeout: TimeInterval = 12) {
        dismissWardrobeFlowTipIfPresent()
        collapseWardrobeCompletionPreferencesIfExpanded()

        let list = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier == %@", "wardrobe.itemsList")
        ).firstMatch
        let deadline = Date().addingTimeInterval(timeout)
        var swipeCount = 0
        while Date() < deadline {
            let hero = wardrobeHeroButton(itemId: itemId)
            if hero.waitForExistence(timeout: 0.6) {
                if hero.isHittable {
                    hero.tap()
                } else {
                    hero.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
                }
                return
            }

            // Fallback: visible title text (when button a11y id is missing).
            let styleTitle = app.staticTexts["Style this item"].firstMatch
            if styleTitle.exists, styleTitle.isHittable {
                styleTitle.tap()
                return
            }

            // Keep Wardrobe on-screen — never blind-swipe the whole app (can leave the tab).
            if list.exists {
                if swipeCount < 6 {
                    list.swipeUp()
                } else {
                    list.swipeDown()
                }
            } else if app.buttons["wardrobe.chip.all"].exists {
                // List id may not resolve as ScrollView; nudge within Wardrobe only.
                app.buttons["wardrobe.chip.shirt"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
                RunLoop.current.run(until: Date().addingTimeInterval(0.2))
            }
            swipeCount += 1
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }

        let hero = wardrobeHeroButton(itemId: itemId)
        let visible = app.otherElements["wardrobe.visibleItemIDs"]
        let chips = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "wardrobe.chip."))
        let wardrobeIds = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH %@", "wardrobe.")
        )
        var sample: [String] = []
        for i in 0..<min(wardrobeIds.count, 30) {
            sample.append(wardrobeIds.element(boundBy: i).identifier)
        }
        XCTFail(
            "Expected Style this item button for wardrobe item \(itemId). " +
            "hero.exists=\(hero.exists) visible=\(visible.exists ? visible.label : "missing") " +
            "chipCount=\(chips.count) sample=[\(sample.joined(separator: ","))]"
        )
    }

    private func wardrobeMenuTrigger(itemId: Int) -> XCUIElement {
        let identifier = "wardrobe.itemMenu.\(itemId)"
        // Use matching().firstMatch — subscript throws when duplicates exist.
        let byId = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier == %@", identifier)
        ).firstMatch
        if byId.exists { return byId }

        let byLabel = app.buttons.matching(
            NSPredicate(format: "label == %@", "More actions")
        ).firstMatch
        if byLabel.exists { return byLabel }

        return app.buttons.matching(
            NSPredicate(format: "label CONTAINS 'More actions'")
        ).firstMatch
    }

    private func tapWardrobeMenuTrigger(itemId: Int, timeout: TimeInterval = 10) {
        dismissWardrobeFlowTipIfPresent()
        collapseWardrobeCompletionPreferencesIfExpanded()
        let list = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier == %@", "wardrobe.itemsList")
        ).firstMatch
        let deadline = Date().addingTimeInterval(timeout)
        var swipeCount = 0
        while Date() < deadline {
            let menu = wardrobeMenuTrigger(itemId: itemId)
            // Resolve via exists only — isHittable can throw on ambiguous queries.
            if menu.waitForExistence(timeout: 0.6) {
                if menu.isHittable {
                    menu.tap()
                } else {
                    menu.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
                }
                return
            }
            if list.exists {
                if swipeCount < 6 {
                    list.swipeUp()
                } else {
                    list.swipeDown()
                }
            }
            swipeCount += 1
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        let menu = wardrobeMenuTrigger(itemId: itemId)
        XCTAssertTrue(
            waitFor(menu, timeout: 2),
            "Expected More actions menu for wardrobe item \(itemId)"
        )
        menu.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
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
        safeTap(app.buttons["history.loadAllButton"])
        XCTAssertTrue(waitForHistoryIdle(timeout: 12), "History loading spinner did not dismiss")
        XCTAssertTrue(
            waitForHistoryEntryCount(3, timeout: 12),
            "Expected 3 history entries after Load All"
        )
        XCTAssertTrue(
            historyCard(entryId: 100).waitForExistence(timeout: 8),
            "Expected newest history entry 100 after Load All"
        )
        XCTAssertTrue(scrollToHistoryCard(entryId: 102, timeout: 16), "Expected history entry 102 after Load All")

        let searchField = app.textFields["history.searchField"]
        enterText(searchField, "brogues")
        safeTap(app.buttons["history.searchButton"])
        waitForAppUnlocked()
        XCTAssertTrue(scrollToHistoryCard(entryId: 101, timeout: 8))
        XCTAssertFalse(historyCard(entryId: 100).exists)

        searchField.tap()
        if let current = searchField.value as? String, !current.isEmpty {
            let delete = String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count)
            if app.keyboards.firstMatch.exists {
                searchField.typeText(delete)
            } else {
                searchField.press(forDuration: 1.0)
                let selectAll = app.menuItems["Select All"].firstMatch
                if selectAll.waitForExistence(timeout: 1) {
                    selectAll.tap()
                    searchField.typeText(XCUIKeyboardKey.delete.rawValue)
                }
            }
        }
        safeTap(app.buttons["history.searchButton"])

        safeTap(app.buttons["history.sortMenu"])
        safeTap(app.buttons["Oldest First"])
        waitForAppUnlocked()
        XCTAssertTrue(scrollToHistoryCard(entryId: 102, timeout: 8))
    }

    func testSuggestFlowFromSampleImageShowsResultCard() {
        addSampleImageOnSuggest()
        tapGetSuggestion()
        waitForStyledLook()
    }

    func testResultActionButtonsAreVisibleAfterSuggestion() {
        addSampleImageOnSuggest()
        tapGetSuggestion()
        waitForStyledLook()

        XCTAssertTrue(app.buttons["main.generateAnotherButton"].waitForExistence(timeout: 6))
        XCTAssertTrue(app.buttons["main.saveLookButton"].exists)
        XCTAssertTrue(app.buttons["main.refineButton"].exists)
        XCTAssertFalse(app.buttons["main.likeButton"].exists)
    }

    func testChangeOccasionOpensPickerSheet() {
        addSampleImageOnSuggest()
        tapGetSuggestion()
        waitForStyledLook()

        safeTap(app.buttons["main.refineButton"])
        XCTAssertTrue(app.buttons["main.refineChangeOccasionButton"].waitForExistence(timeout: 6))
        safeTap(app.buttons["main.refineChangeOccasionButton"])
        XCTAssertTrue(app.navigationBars["Change occasion"].waitForExistence(timeout: 6))
    }

    func testGenerateAnotherLookKeepsResultVisible() {
        addSampleImageOnSuggest()
        tapGetSuggestion()
        waitForStyledLook()

        safeTap(app.buttons["main.generateAnotherButton"])
        waitForAppUnlocked(timeout: 10)
        waitForStyledLook()
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
        XCTAssertTrue(app.buttons["main.getSuggestionButton"].waitForExistence(timeout: 6))
        tapGetSuggestion()
        waitForStyledLook()

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
        waitForStyledLook()
    }

    func testAiProgressPanelAppearsDuringSuggestionAndTabsStayUsable() {
        addSampleImageOnSuggest()
        tapGetSuggestion()

        let progressPanel = app.descendants(matching: .any)["ai.progressPanel"]
        let progressTitle = app.staticTexts["ai.progressTitle"]
        let cancelButton = app.buttons["ai.progressCancelButton"]
        let sawProgress = progressTitle.waitForExistence(timeout: 8)
            || progressPanel.waitForExistence(timeout: 2)
            || cancelButton.waitForExistence(timeout: 2)
        XCTAssertTrue(sawProgress, "Expected AI progress panel during suggestion")

        openTab("Looks")
        XCTAssertTrue(
            app.navigationBars["Looks"].waitForExistence(timeout: 5)
                || app.buttons["history.loadAllButton"].waitForExistence(timeout: 2),
            "Expected Looks tab content while suggestion runs"
        )

        openTab("Suggest")
        waitForStyledLook(timeout: 16)
    }

    func testAdminPremiumInsightsShowsCostPromptAndResponse() {
        // Insights is a main tab (first 4 + More). Prefer that path.
        openTab("Insights")
        if !app.buttons["insights.analyzeButton"].waitForExistence(timeout: 6) {
            // Fallback: Profile may live under More; Suggest header also opens Profile.
            if !openOverflowTabIfNeeded(named: "Profile") {
                openTab("Suggest")
                let profileButton = app.buttons["home.profileButton"]
                XCTAssertTrue(profileButton.waitForExistence(timeout: 4), "Expected home profile button")
                profileButton.tap()
            }
            XCTAssertTrue(waitFor(app.buttons["profile.insightsLink"]))
            app.buttons["profile.insightsLink"].tap()
        }
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

        let analyze = app.buttons["insights.analyzeButton"]
        XCTAssertTrue(analyze.waitForExistence(timeout: 6))
        if app.scrollViews.firstMatch.exists {
            app.scrollViews.firstMatch.swipeUp()
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        }
        analyze.tap()
        waitForAppUnlocked(timeout: 12)

        let results = app.descendants(matching: .any)["insights.results"]
        let summary = app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS %@", "Premium wardrobe analysis completed")
        ).firstMatch
        let shoppingList = app.buttons["insights.shoppingListButton"]
        let resultsReady = results.waitForExistence(timeout: 12)
            || summary.waitForExistence(timeout: 4)
            || shoppingList.waitForExistence(timeout: 2)
            || app.staticTexts["Top items to add"].waitForExistence(timeout: 2)
        XCTAssertTrue(resultsReady, "Expected insights results after analyze")

        XCTAssertTrue(
            scrollToInsightsAdminSection(timeout: 16),
            "Expected admin diagnostics section after scrolling insights results"
        )

        let adminDiagnostics = app.descendants(matching: .any)["insights.adminDiagnostics"]
        let adminDebugPanel = app.descendants(matching: .any)["insights.adminDebug"]
        XCTAssertTrue(
            adminDiagnostics.waitForExistence(timeout: 4) || adminDebugPanel.waitForExistence(timeout: 4)
                || app.staticTexts["Admin diagnostics"].waitForExistence(timeout: 4)
        )
        XCTAssertTrue(app.staticTexts["Analysis Cost"].waitForExistence(timeout: 6))
        let cost = app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "$0.012")).firstMatch
        XCTAssertTrue(cost.waitForExistence(timeout: 4), "Expected analysis cost amount")

        let promptPanel = insightsElement(identifier: "insights.inputPrompt")
        let promptText = insightsTextContaining("ui-test-premium-prompt")
        let promptTitle = app.staticTexts["Input Prompt"]
        XCTAssertTrue(
            promptPanel.waitForExistence(timeout: 8)
                || promptText.waitForExistence(timeout: 8)
                || promptTitle.waitForExistence(timeout: 4),
            "Expected input prompt panel"
        )
        let promptBlob = [
            accessibilityBlob(promptPanel),
            accessibilityBlob(promptText),
            accessibilityBlob(promptTitle)
        ].joined(separator: " ")
        XCTAssertTrue(
            promptBlob.contains("ui-test-premium-prompt") || promptText.exists,
            "Expected ui-test-premium-prompt in admin diagnostics, got \(promptBlob)"
        )

        let responsePanel = insightsElement(identifier: "insights.aiResponse")
        let responseText = insightsTextContaining("ui-test-premium-response")
        let responseTitle = app.staticTexts["AI Response"]
        XCTAssertTrue(
            responsePanel.waitForExistence(timeout: 8)
                || responseText.waitForExistence(timeout: 8)
                || responseTitle.waitForExistence(timeout: 4),
            "Expected AI response panel"
        )
        let responseBlob = [
            accessibilityBlob(responsePanel),
            accessibilityBlob(responseText),
            accessibilityBlob(responseTitle)
        ].joined(separator: " ")
        XCTAssertTrue(
            responseBlob.contains("ui-test-premium-response") || responseText.exists,
            "Expected ui-test-premium-response in admin diagnostics, got \(responseBlob)"
        )
    }
}
