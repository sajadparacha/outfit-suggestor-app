import XCTest
import UIKit
@testable import OutfitSuggestor

final class WardrobeFitEvaluateTests: XCTestCase {

    // MARK: - Copy / verdict labels

    func testSharedCopyMatchesSpec() {
        XCTAssertEqual(WardrobeFitEvaluateCopy.action, "How this fits")
        XCTAssertEqual(
            WardrobeFitEvaluateCopy.loading,
            "Checking how this works with your wardrobe…"
        )
        XCTAssertEqual(WardrobeFitEvaluateCopy.sectionPairs, "Works with what you own")
        XCTAssertEqual(WardrobeFitEvaluateCopy.sectionGap, "Missing for your goal")
        XCTAssertEqual(
            WardrobeFitEvaluateCopy.emptyPairs,
            "Add items to see what this pairs with."
        )
        XCTAssertEqual(
            WardrobeFitEvaluateCopy.error,
            "Couldn’t evaluate this piece. Try again."
        )
    }

    func testVerdictLabels() {
        XCTAssertEqual(WardrobeFitEvaluateCopy.verdictLabel(.strongFit), "Strong fit")
        XCTAssertEqual(WardrobeFitEvaluateCopy.verdictLabel(.weakFit), "Weak fit")
        XCTAssertEqual(WardrobeFitEvaluateCopy.verdictLabel(.redundant), "Already covered")
        XCTAssertEqual(WardrobeFitEvaluateCopy.verdictLabel(rawValue: "strong_fit"), "Strong fit")
        XCTAssertEqual(WardrobeFitEvaluateCopy.verdictLabel(rawValue: "weak_fit"), "Weak fit")
        XCTAssertEqual(WardrobeFitEvaluateCopy.verdictLabel(rawValue: "redundant"), "Already covered")
    }

    func testGuideAndAboutMentionFitEvaluate() {
        XCTAssertTrue(GuideCopy.wardrobeFitEvaluateStep.contains("How this fits"))
        XCTAssertTrue(GuideCopy.wardrobeFitEvaluateStep.contains("pairs"))
        XCTAssertTrue(GuideCopy.wardrobeFitEvaluateStep.contains("Strong fit, Weak fit, or Already covered"))
        XCTAssertTrue(GuideCopy.wardrobeFitEvaluateStep.contains("last fit check, then your Insights preferences"))
        XCTAssertTrue(GuideCopy.wardrobeFitEvaluateStep.contains("ranked by AI"))
        XCTAssertTrue(GuideCopy.wardrobeFitEvaluateStep.contains("view it full screen"))
        XCTAssertTrue(GuideCopy.wardrobeFitEvaluateStep.contains("View all (N)"))
        XCTAssertTrue(GuideCopy.wardrobeFitEvaluateStep.contains("Show less"))
        XCTAssertTrue(AboutCopy.wardrobeFitFeature.contains("Strong fit, Weak fit, or Already covered"))
        XCTAssertTrue(AboutCopy.wardrobeFeature.contains("fits your wardrobe"))
        XCTAssertTrue(AboutCopy.wardrobeFeature.contains("pair counts"))
    }

    // MARK: - Decode

    func testDecodeFitEvaluateResponse() throws {
        let json = """
        {
          "candidate": {
            "id": 42,
            "category": "blazer",
            "label": "Navy blazer",
            "color": "navy",
            "image_data": null
          },
          "goal": {
            "label": "business-casual",
            "dress_code": "smart-casual",
            "lifestyle_mix": ["work", "everyday"],
            "primary_lifestyle": "work",
            "style_primary": "classic",
            "text_input": ""
          },
          "pairs_with": [
            {
              "category": "trouser",
              "count": 2,
              "items": [
                { "id": 12, "label": "Charcoal trousers", "color": "charcoal", "image_data": null }
              ]
            }
          ],
          "outfit_multiplier": 6,
          "verdict": "strong_fit",
          "missing_for_goal": {
            "category": "shoes",
            "label": "pair of shoes",
            "reason": "You still need shoes for this goal.",
            "candidate_fills_this_gap": false
          },
          "summary_text": "This blazer works with 2 items you own."
        }
        """.data(using: .utf8)!

        let decoded = try JSONDecoder().decode(WardrobeFitEvaluateResponse.self, from: json)
        XCTAssertEqual(decoded.candidate.id, 42)
        XCTAssertEqual(decoded.candidate.category, "blazer")
        XCTAssertEqual(decoded.candidate.label, "Navy blazer")
        XCTAssertEqual(decoded.goal.dress_code, "smart-casual")
        XCTAssertEqual(decoded.goal.lifestyle_mix, ["work", "everyday"])
        XCTAssertEqual(decoded.pairs_with.count, 1)
        XCTAssertEqual(decoded.pairs_with[0].count, 2)
        XCTAssertEqual(decoded.outfit_multiplier, 6)
        XCTAssertEqual(decoded.verdict, .strongFit)
        XCTAssertEqual(decoded.missing_for_goal.category, "shoes")
        XCTAssertFalse(decoded.missing_for_goal.candidate_fills_this_gap)
        XCTAssertTrue(decoded.summary_text.contains("blazer"))
    }

    func testDecodeWeakAndRedundantVerdicts() throws {
        for raw in ["weak_fit", "redundant"] {
            let json = """
            {
              "candidate": { "id": 1, "category": "shirt", "label": "White shirt", "color": "white", "image_data": null },
              "goal": {
                "label": "smart-casual",
                "dress_code": "smart-casual",
                "lifestyle_mix": ["work"],
                "primary_lifestyle": "work",
                "style_primary": "classic",
                "text_input": ""
              },
              "pairs_with": [],
              "outfit_multiplier": 0,
              "verdict": "\(raw)",
              "missing_for_goal": {
                "category": null,
                "label": "nothing critical",
                "reason": "Covered.",
                "candidate_fills_this_gap": false
              },
              "summary_text": "Summary."
            }
            """.data(using: .utf8)!
            let decoded = try JSONDecoder().decode(WardrobeFitEvaluateResponse.self, from: json)
            XCTAssertEqual(decoded.verdict.rawValue, raw)
        }
    }

    func testEncodeFitEvaluateRequestDefaults() throws {
        let request = WardrobeFitEvaluateRequest(wardrobe_item_id: 42)
        let data = try JSONEncoder().encode(request)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(object["wardrobe_item_id"] as? Int, 42)
        XCTAssertEqual(object["dress_code"] as? String, "smart-casual")
        XCTAssertEqual(object["primary_lifestyle"] as? String, "work")
        XCTAssertEqual(object["style_primary"] as? String, "classic")
        XCTAssertEqual(object["lifestyle_mix"] as? [String], ["work", "everyday"])
        XCTAssertEqual(object["text_input"] as? String, "")
    }

    // MARK: - ViewModel

    @MainActor
    func testViewModelSuccessSetsResult() async {
        let expected = Self.sampleResponse(verdict: .strongFit)
        let vm = WardrobeFitEvaluateViewModel { _ in expected }
        let item = WardrobeItem(id: 42, category: "blazer", description: "Navy blazer", color: "navy")

        vm.sourceItem = item
        vm.isPresented = true
        await vm.runEvaluate()

        XCTAssertTrue(vm.isPresented)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertEqual(vm.result?.verdict, .strongFit)
        XCTAssertEqual(vm.result?.summary_text, expected.summary_text)
        XCTAssertEqual(vm.dressCode, "smart-casual")
        XCTAssertEqual(vm.lifestyleMix, ["work", "everyday"])
        XCTAssertEqual(vm.stylePrimary, "classic")
    }

    @MainActor
    func testViewModelErrorSetsSpecCopy() async {
        let vm = WardrobeFitEvaluateViewModel { _ in
            throw APIServiceError.serverError("boom")
        }
        let item = WardrobeItem(id: 7, category: "shirt", description: "Oxford", color: "white")
        vm.sourceItem = item
        vm.isPresented = true
        await vm.runEvaluate()

        XCTAssertTrue(vm.isPresented)
        XCTAssertNil(vm.result)
        XCTAssertEqual(vm.errorMessage, WardrobeFitEvaluateCopy.error)
    }

    @MainActor
    func testViewModelRetryClearsErrorOnSuccess() async {
        var shouldFail = true
        let vm = WardrobeFitEvaluateViewModel { _ in
            if shouldFail {
                throw APIServiceError.invalidResponse
            }
            return Self.sampleResponse(verdict: .weakFit)
        }
        let item = WardrobeItem(id: 3, category: "trouser", color: "navy")
        vm.sourceItem = item
        vm.isPresented = true
        await vm.runEvaluate()
        XCTAssertEqual(vm.errorMessage, WardrobeFitEvaluateCopy.error)

        shouldFail = false
        await vm.retry()
        XCTAssertNil(vm.errorMessage)
        XCTAssertEqual(vm.result?.verdict, .weakFit)
    }

    @MainActor
    func testViewModelHasEmptyPairs() {
        let vm = WardrobeFitEvaluateViewModel { _ in
            Self.sampleResponse(verdict: .redundant, pairs: [])
        }
        vm.result = Self.sampleResponse(verdict: .redundant, pairs: [])
        XCTAssertTrue(vm.hasEmptyPairs)

        vm.result = Self.sampleResponse(verdict: .strongFit)
        XCTAssertFalse(vm.hasEmptyPairs)
    }

    // MARK: - Goal prefill / last-used goal

    private func makeDefaults(_ name: String = #function) -> UserDefaults {
        let suite = "WardrobeFitEvaluateTests.\(name)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return defaults
    }

    @MainActor
    func testInitialGoalFallsBackToDefaults() {
        let defaults = makeDefaults()
        let vm = WardrobeFitEvaluateViewModel(defaults: defaults) { _ in Self.sampleResponse(verdict: .weakFit) }
        vm.applyInitialGoal()
        XCTAssertEqual(vm.currentGoal, WardrobeFitGoalPrefs.default)
        XCTAssertEqual(vm.dressCode, "smart-casual")
        XCTAssertEqual(vm.lifestyleMix, ["work", "everyday"])
        XCTAssertEqual(vm.stylePrimary, "classic")
    }

    @MainActor
    func testInitialGoalFromInsightsPrefs() async {
        let defaults = makeDefaults()
        InsightsLifestyleStore.save(
            InsightsLifestyle(
                mix: ["social", "formal"],
                dressCodes: ["business-professional", "formal"],
                climates: [],
                stylePrimaries: ["minimal", "classic"],
                styleAccents: [],
                eventFocus: nil
            ),
            to: defaults
        )
        var captured: WardrobeFitEvaluateRequest?
        let vm = WardrobeFitEvaluateViewModel(defaults: defaults) { request in
            captured = request
            return Self.sampleResponse(verdict: .weakFit)
        }
        vm.open(for: WardrobeItem(id: 5, category: "shirt", color: "white"))

        XCTAssertEqual(vm.dressCode, "business-professional")
        XCTAssertEqual(vm.lifestyleMix, ["social", "formal"])
        XCTAssertEqual(vm.primaryLifestyle, "social")
        XCTAssertEqual(vm.stylePrimary, "minimal")

        await vm.runEvaluate()
        XCTAssertEqual(captured?.dress_code, "business-professional")
        XCTAssertEqual(captured?.lifestyle_mix, ["social", "formal"])
        XCTAssertEqual(captured?.primary_lifestyle, "social")
        XCTAssertEqual(captured?.style_primary, "minimal")
        // Opening alone must not record a last-used goal.
        XCTAssertNil(defaults.data(forKey: WardrobeFitGoalPrefs.lastGoalKey))
    }

    @MainActor
    func testLastUsedGoalPersistedOnEvaluateAndPreferredOverInsights() async {
        let defaults = makeDefaults()
        InsightsLifestyleStore.save(
            InsightsLifestyle(
                mix: ["social"],
                dressCodes: ["formal"],
                climates: [],
                stylePrimaries: ["elegant"],
                styleAccents: [],
                eventFocus: nil
            ),
            to: defaults
        )
        let vm = WardrobeFitEvaluateViewModel(defaults: defaults) { _ in Self.sampleResponse(verdict: .strongFit) }
        vm.sourceItem = WardrobeItem(id: 9, category: "blazer", color: "navy")
        vm.dressCode = "casual"
        vm.lifestyleMix = ["everyday", "sport"]
        vm.primaryLifestyle = "everyday"
        vm.stylePrimary = "streetwear"
        await vm.applyGoalAndReevaluate()

        XCTAssertNotNil(defaults.data(forKey: "wardrobeFitLastGoal"))

        let reopened = WardrobeFitEvaluateViewModel(defaults: defaults) { _ in Self.sampleResponse(verdict: .weakFit) }
        reopened.applyInitialGoal()
        XCTAssertEqual(reopened.dressCode, "casual")
        XCTAssertEqual(reopened.lifestyleMix, ["everyday", "sport"])
        XCTAssertEqual(reopened.primaryLifestyle, "everyday")
        XCTAssertEqual(reopened.stylePrimary, "streetwear")
    }

    // MARK: - Pair count label

    func testPairsWithLabelSingularAndPlural() {
        XCTAssertEqual(WardrobeFitEvaluateCopy.pairsWithLabel(count: 3), "Pairs with 3")
        XCTAssertEqual(WardrobeFitEvaluateCopy.pairsWithLabel(count: 1), "Pairs with 1")
    }

    // MARK: - Open Insights

    @MainActor
    func testOpenInsightsAvailableWhenMissingForGoalShown() async {
        let defaults = makeDefaults()
        let vm = WardrobeFitEvaluateViewModel(defaults: defaults) { _ in Self.sampleResponse(verdict: .weakFit) }
        XCTAssertEqual(WardrobeFitEvaluateCopy.openInsights, "Open Insights")
        XCTAssertFalse(vm.showsMissingForGoal)
        XCTAssertFalse(vm.showsOpenInsights(hasHandler: true))

        vm.sourceItem = WardrobeItem(id: 1, category: "shirt", color: "white")
        await vm.runEvaluate()
        XCTAssertTrue(vm.showsMissingForGoal)
        XCTAssertTrue(vm.showsOpenInsights(hasHandler: true))
        XCTAssertFalse(vm.showsOpenInsights(hasHandler: false))
    }

    @MainActor
    func testOpenInsightsHiddenOnError() async {
        let vm = WardrobeFitEvaluateViewModel(defaults: makeDefaults()) { _ in
            throw APIServiceError.invalidResponse
        }
        vm.sourceItem = WardrobeItem(id: 1, category: "shirt", color: "white")
        await vm.runEvaluate()
        XCTAssertFalse(vm.showsMissingForGoal)
        XCTAssertFalse(vm.showsOpenInsights(hasHandler: true))
    }

    // MARK: - Check before you buy

    func testCheckBeforeBuyCopyMatchesSpec() {
        XCTAssertEqual(WardrobeFitEvaluateCopy.checkBeforeBuyAction, "Check before you buy")
        XCTAssertEqual(
            WardrobeFitEvaluateCopy.checkBeforeBuyLoading,
            "Checking how this would fit your wardrobe…"
        )
        XCTAssertEqual(WardrobeFitEvaluateCopy.addToWardrobe, "Add to wardrobe")
        XCTAssertTrue(GuideCopy.checkBeforeBuyStep.contains("once a photo is added, Check before you buy appears under Generate Outfit"))
        XCTAssertTrue(GuideCopy.checkBeforeBuyStep.contains("Add to wardrobe"))
        XCTAssertTrue(GuideCopy.checkBeforeBuyStep.contains("View all (N)"))
        XCTAssertTrue(AboutCopy.wardrobeFitFeature.contains("How this fits"))
        XCTAssertTrue(AboutCopy.checkBeforeBuyFeature.contains("Check before you buy"))
    }

    func testAttributeRequestEncodingOmitsWardrobeItemId() throws {
        let request = WardrobeFitEvaluateRequest(category: "blazer", color: "", description: "Navy blazer")
        let data = try JSONEncoder().encode(request)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertFalse(object.keys.contains("wardrobe_item_id"))
        XCTAssertEqual(object["category"] as? String, "blazer")
        XCTAssertEqual(object["color"] as? String, "")
        XCTAssertEqual(object["description"] as? String, "Navy blazer")
        XCTAssertEqual(object["dress_code"] as? String, "smart-casual")
        XCTAssertEqual(object["lifestyle_mix"] as? [String], ["work", "everyday"])
        XCTAssertEqual(object["primary_lifestyle"] as? String, "work")
        XCTAssertEqual(object["style_primary"] as? String, "classic")
    }

    @MainActor
    func testCheckBeforeBuySuccessAnalyzesThenEvaluatesAttributeCandidate() async throws {
        let image = Self.sampleImage()
        var analyzedImage: UIImage?
        var captured: WardrobeFitEvaluateRequest?
        let vm = WardrobeFitEvaluateViewModel(
            defaults: makeDefaults(),
            evaluate: { request in
                XCTAssertNotNil(analyzedImage, "analyze must run before evaluate")
                captured = request
                return Self.sampleResponse(verdict: .strongFit, candidateId: nil)
            },
            analyze: { img in
                analyzedImage = img
                return WardrobeAnalyzeResponse(
                    category: "blazer", color: "navy", description: "Navy wool blazer", model_used: "blip"
                )
            }
        )

        await vm.checkBeforeBuy(image: image)

        XCTAssertTrue(analyzedImage === image)
        let request = try XCTUnwrap(captured)
        XCTAssertNil(request.wardrobe_item_id)
        XCTAssertEqual(request.category, "blazer")
        XCTAssertEqual(request.color, "navy")
        XCTAssertEqual(request.description, "Navy wool blazer")
        XCTAssertEqual(request.dress_code, "smart-casual")
        XCTAssertEqual(request.lifestyle_mix, ["work", "everyday"])
        XCTAssertEqual(request.primary_lifestyle, "work")
        XCTAssertEqual(request.style_primary, "classic")
        let encoded = try XCTUnwrap(
            JSONSerialization.jsonObject(with: JSONEncoder().encode(request)) as? [String: Any]
        )
        XCTAssertFalse(encoded.keys.contains("wardrobe_item_id"))

        XCTAssertTrue(vm.isPresented)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.sourceItem)
        XCTAssertTrue(vm.candidateImage === image)
        XCTAssertTrue(vm.isCheckBeforeBuy)
        XCTAssertEqual(vm.result?.verdict, .strongFit)
        XCTAssertNil(vm.result?.candidate.id)
        XCTAssertEqual(vm.analyzedAttributes?.category, "blazer")
        XCTAssertEqual(vm.loadingMessage, WardrobeFitEvaluateCopy.checkBeforeBuyLoading)
        XCTAssertEqual(vm.title, WardrobeFitEvaluateCopy.checkBeforeBuyAction)

        vm.dismiss()
        XCTAssertNil(vm.candidateImage)
        XCTAssertNil(vm.analyzedAttributes)
        XCTAssertFalse(vm.isCheckBeforeBuy)
    }

    @MainActor
    func testCheckBeforeBuyAnalyzeFailureShowsErrorAndRetryRecovers() async {
        var analyzeShouldFail = true
        var evaluateCalls = 0
        let vm = WardrobeFitEvaluateViewModel(
            defaults: makeDefaults(),
            evaluate: { _ in
                evaluateCalls += 1
                return Self.sampleResponse(verdict: .weakFit, candidateId: nil)
            },
            analyze: { _ in
                if analyzeShouldFail { throw APIServiceError.invalidResponse }
                return WardrobeAnalyzeResponse(category: "shirt", color: "", description: "Oxford", model_used: nil)
            }
        )

        await vm.checkBeforeBuy(image: Self.sampleImage())
        XCTAssertEqual(vm.errorMessage, WardrobeFitEvaluateCopy.error)
        XCTAssertNil(vm.result)
        XCTAssertEqual(evaluateCalls, 0)
        XCTAssertNotNil(vm.candidateImage)

        analyzeShouldFail = false
        await vm.retry()
        XCTAssertNil(vm.errorMessage)
        XCTAssertEqual(vm.result?.verdict, .weakFit)
        XCTAssertEqual(evaluateCalls, 1)
    }

    @MainActor
    func testCheckBeforeBuyEvaluateFailureShowsError() async {
        var analyzeCalls = 0
        let vm = WardrobeFitEvaluateViewModel(
            defaults: makeDefaults(),
            evaluate: { _ in throw APIServiceError.serverError("boom") },
            analyze: { _ in
                analyzeCalls += 1
                return WardrobeAnalyzeResponse(category: "shoes", color: "brown", description: "Loafers", model_used: nil)
            }
        )

        await vm.checkBeforeBuy(image: Self.sampleImage())
        XCTAssertEqual(vm.errorMessage, WardrobeFitEvaluateCopy.error)
        XCTAssertNil(vm.result)
        XCTAssertFalse(vm.showsMissingForGoal)

        await vm.retry()
        XCTAssertEqual(analyzeCalls, 1, "retry reuses analyzed attributes")
        XCTAssertEqual(vm.errorMessage, WardrobeFitEvaluateCopy.error)
    }

    @MainActor
    func testOwnedItemEvaluateIsNotCheckBeforeBuy() async {
        let vm = WardrobeFitEvaluateViewModel(defaults: makeDefaults()) { _ in Self.sampleResponse(verdict: .strongFit) }
        vm.open(for: WardrobeItem(id: 1, category: "shirt", color: "white"))
        XCTAssertFalse(vm.isCheckBeforeBuy)
        XCTAssertNil(vm.candidateImage)
        XCTAssertEqual(vm.loadingMessage, WardrobeFitEvaluateCopy.loading)
        XCTAssertEqual(vm.title, WardrobeFitEvaluateCopy.action)
    }

    // MARK: - Full-screen image viewer

    func testImageViewerSelectCandidateOpensAndDismissClears() {
        var viewer = WardrobeFitImageViewer()
        XCTAssertFalse(viewer.isOpen)

        viewer.selectCandidate(imageData: nil, localImage: nil)
        XCTAssertFalse(viewer.isOpen)

        let local = Self.sampleImage()
        viewer.selectCandidate(imageData: nil, localImage: local)
        XCTAssertTrue(viewer.isOpen)
        XCTAssertTrue(viewer.image === local)

        viewer.dismiss()
        XCTAssertFalse(viewer.isOpen)
        XCTAssertNil(viewer.image)

        viewer.selectCandidate(imageData: Self.sampleImageBase64())
        XCTAssertTrue(viewer.isOpen)
    }

    func testImageViewerSelectPairRequiresImageData() {
        var viewer = WardrobeFitImageViewer()
        let noImage = WardrobeFitPairItem(id: 1, label: "Charcoal trousers", color: "charcoal", image_data: nil)
        viewer.selectPair(noImage)
        XCTAssertFalse(viewer.isOpen)
        XCTAssertNil(WardrobeFitImageViewer.resolveImage(imageData: nil))

        let withImage = WardrobeFitPairItem(
            id: 2, label: "White shirt", color: "white", image_data: Self.sampleImageBase64()
        )
        viewer.selectPair(withImage)
        XCTAssertTrue(viewer.isOpen)
        XCTAssertNotNil(viewer.image)
    }

    func testViewFullImageAccessibilityLabels() {
        XCTAssertEqual(WardrobeFitEvaluateCopy.viewFullImage, "View full image")
        XCTAssertEqual(
            WardrobeFitEvaluateCopy.viewFullImageLabel(itemLabel: "Charcoal trousers"),
            "View full image of Charcoal trousers"
        )
    }

    // MARK: - View all / Show less

    private static func pairRow(count: Int, imageFrom: Int? = nil) -> WardrobeFitPairCategory {
        let items = (1...count).map { i in
            WardrobeFitPairItem(
                id: i,
                label: "Item \(i)",
                color: "navy",
                image_data: (imageFrom.map { i >= $0 } ?? false) ? sampleImageBase64() : nil
            )
        }
        return WardrobeFitPairCategory(category: "trouser", count: count, items: items)
    }

    func testViewAllCopyMatchesSpec() {
        XCTAssertEqual(WardrobeFitEvaluateCopy.viewAll(5), "View all (5)")
        XCTAssertEqual(WardrobeFitEvaluateCopy.showLess, "Show less")
    }

    func testCategoryWithMoreThanThreeShowsThreeAndViewAll() {
        let row = Self.pairRow(count: 5)
        let visible = WardrobeFitPairExpansion.visibleItems(for: row, expanded: false)
        XCTAssertEqual(visible.map(\.id), [1, 2, 3])
        XCTAssertTrue(WardrobeFitPairExpansion.showsToggle(count: row.count))
        XCTAssertEqual(WardrobeFitPairExpansion.toggleTitle(count: row.count, expanded: false), "View all (5)")
    }

    func testExpandShowsAllAndShowLessThenCollapsesToThree() {
        let row = Self.pairRow(count: 6)
        var expanded: Set<String> = []

        expanded.insert(row.category)
        let isExpanded = expanded.contains(row.category)
        XCTAssertEqual(
            WardrobeFitPairExpansion.visibleItems(for: row, expanded: isExpanded).map(\.id),
            [1, 2, 3, 4, 5, 6]
        )
        XCTAssertEqual(WardrobeFitPairExpansion.toggleTitle(count: row.count, expanded: isExpanded), "Show less")

        expanded.remove(row.category)
        let collapsed = expanded.contains(row.category)
        XCTAssertEqual(WardrobeFitPairExpansion.visibleItems(for: row, expanded: collapsed).count, 3)
        XCTAssertEqual(WardrobeFitPairExpansion.toggleTitle(count: row.count, expanded: collapsed), "View all (6)")
    }

    func testCategoryWithThreeOrFewerHasNoToggle() {
        for n in 1...3 {
            let row = Self.pairRow(count: n)
            XCTAssertFalse(WardrobeFitPairExpansion.showsToggle(count: row.count))
            XCTAssertEqual(WardrobeFitPairExpansion.visibleItems(for: row, expanded: false).count, n)
        }
    }

    func testRevealedItemWithImageOpensViewer() throws {
        // Items 4+ have image data; 1–3 don't.
        let row = Self.pairRow(count: 5, imageFrom: 4)
        let collapsed = WardrobeFitPairExpansion.visibleItems(for: row, expanded: false)
        XCTAssertFalse(collapsed.contains { $0.id == 4 })

        let expanded = WardrobeFitPairExpansion.visibleItems(for: row, expanded: true)
        let revealed = try XCTUnwrap(expanded.first { $0.id == 4 })
        XCTAssertTrue(WardrobeFitPairExpansion.opensViewer(revealed))
        XCTAssertFalse(WardrobeFitPairExpansion.opensViewer(expanded[0]))

        var viewer = WardrobeFitImageViewer()
        viewer.selectPair(expanded[0])
        XCTAssertFalse(viewer.isOpen)
        viewer.selectPair(revealed)
        XCTAssertTrue(viewer.isOpen)
    }

    // MARK: - Helpers

    private static func sampleImageBase64() -> String {
        sampleImage().pngData()!.base64EncodedString()
    }

    private static func sampleImage() -> UIImage {
        UIGraphicsImageRenderer(size: CGSize(width: 8, height: 8)).image { ctx in
            UIColor.systemBlue.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: 8, height: 8))
        }
    }

    private static func sampleResponse(
        verdict: WardrobeFitVerdict,
        pairs: [WardrobeFitPairCategory]? = nil,
        candidateId: Int? = 42
    ) -> WardrobeFitEvaluateResponse {
        WardrobeFitEvaluateResponse(
            candidate: WardrobeFitCandidate(
                id: candidateId,
                category: "blazer",
                label: "Navy blazer",
                color: "navy",
                image_data: nil
            ),
            goal: WardrobeFitGoal(
                label: "business-casual",
                dress_code: "smart-casual",
                lifestyle_mix: ["work", "everyday"],
                primary_lifestyle: "work",
                style_primary: "classic",
                text_input: ""
            ),
            pairs_with: pairs ?? [
                WardrobeFitPairCategory(
                    category: "trouser",
                    count: 2,
                    items: [
                        WardrobeFitPairItem(id: 12, label: "Charcoal trousers", color: "charcoal", image_data: nil)
                    ]
                )
            ],
            outfit_multiplier: 6,
            verdict: verdict,
            missing_for_goal: WardrobeFitMissing(
                category: "shoes",
                label: "pair of shoes",
                reason: "You still need shoes for this goal.",
                candidate_fills_this_gap: false
            ),
            summary_text: "This blazer works with 2 items you own."
        )
    }
}
