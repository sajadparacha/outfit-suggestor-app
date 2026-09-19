import XCTest
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

    // MARK: - Helpers

    private static func sampleResponse(
        verdict: WardrobeFitVerdict,
        pairs: [WardrobeFitPairCategory]? = nil
    ) -> WardrobeFitEvaluateResponse {
        WardrobeFitEvaluateResponse(
            candidate: WardrobeFitCandidate(
                id: 42,
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
