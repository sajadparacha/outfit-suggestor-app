import XCTest
@testable import OutfitSuggestor

final class InsightsLifestylePreferencesTests: XCTestCase {
    func testDefaultsMatchSpec() {
        let lifestyle = InsightsLifestyle.default
        XCTAssertEqual(lifestyle.mix, ["work", "everyday"])
        XCTAssertEqual(lifestyle.primaryLifestyle, "work")
        XCTAssertEqual(lifestyle.dressCodes, ["smart-casual"])
        XCTAssertEqual(lifestyle.climates, [])
        XCTAssertEqual(lifestyle.stylePrimaries, ["classic"])
        XCTAssertEqual(lifestyle.primaryStyle, "classic")
        XCTAssertEqual(lifestyle.styleAccents, [])
        XCTAssertTrue(lifestyle.hasNoAccents)
        XCTAssertNil(lifestyle.eventFocus)
    }

    func testMixCannotExceedThree() {
        var lifestyle = InsightsLifestyle.default
        lifestyle.tapMix("social")
        XCTAssertEqual(lifestyle.mix, ["work", "everyday", "social"])
        lifestyle.tapMix("formal")
        XCTAssertEqual(lifestyle.mix, ["work", "everyday", "social"])
        XCTAssertFalse(lifestyle.canAddMixChip)
        lifestyle.tapMix("sport")
        XCTAssertEqual(Set(lifestyle.mix), Set(["work", "everyday", "social"]))
    }

    func testTapSelectedNonPrimaryMakesPrimary() {
        var lifestyle = InsightsLifestyle.default
        XCTAssertEqual(lifestyle.primaryLifestyle, "work")
        lifestyle.tapMix("everyday")
        XCTAssertEqual(lifestyle.mix, ["everyday", "work"])
        XCTAssertEqual(lifestyle.primaryLifestyle, "everyday")
    }

    func testTapPrimaryDeselectsWhenAnotherRemains() {
        var lifestyle = InsightsLifestyle.default
        lifestyle.tapMix("work")
        XCTAssertEqual(lifestyle.mix, ["everyday"])
        XCTAssertEqual(lifestyle.primaryLifestyle, "everyday")
    }

    func testTapPrimaryDoesNotDeselectWhenOnlyOneRemains() {
        var lifestyle = InsightsLifestyle.default
        lifestyle.tapMix("work")
        lifestyle.tapMix("everyday")
        XCTAssertEqual(lifestyle.mix, ["everyday"])
        lifestyle.tapMix("everyday")
        XCTAssertEqual(lifestyle.mix, ["everyday"])
        XCTAssertEqual(lifestyle.primaryLifestyle, "everyday")
    }

    func testStylePrimariesHideBohoRomanticTrendy() {
        let primaryValues = Set(InsightsLifestyle.stylePrimaryOptions.map(\.value))
        XCTAssertTrue(InsightsLifestyle.hiddenPrimaryStyles.isDisjoint(with: primaryValues))
        for hidden in InsightsLifestyle.hiddenPrimaryStyles {
            XCTAssertFalse(primaryValues.contains(hidden))
        }
        XCTAssertTrue(primaryValues.contains("classic"))
        XCTAssertTrue(primaryValues.contains("smart-casual"))
    }

    func testDressCodeLastOneStays() {
        var lifestyle = InsightsLifestyle.default
        XCTAssertEqual(lifestyle.dressCodes, ["smart-casual"])
        lifestyle.tapDressCode("smart-casual")
        XCTAssertEqual(lifestyle.dressCodes, ["smart-casual"])

        lifestyle.tapDressCode("casual")
        XCTAssertEqual(lifestyle.dressCodes, ["smart-casual", "casual"])
        lifestyle.tapDressCode("casual")
        XCTAssertEqual(lifestyle.dressCodes, ["smart-casual"])
        lifestyle.tapDressCode("smart-casual")
        XCTAssertEqual(lifestyle.dressCodes, ["smart-casual"])
    }

    func testClimatesAllowMultipleAndDeselect() {
        var lifestyle = InsightsLifestyle.default
        XCTAssertEqual(lifestyle.climates, [])
        lifestyle.tapClimate("hot")
        lifestyle.tapClimate("cold")
        XCTAssertEqual(lifestyle.climates, ["hot", "cold"])
        lifestyle.tapClimate("hot")
        XCTAssertEqual(lifestyle.climates, ["cold"])
        lifestyle.tapClimate("cold")
        XCTAssertEqual(lifestyle.climates, [])
    }

    func testStylePrimaryBadgeRulesMatchLifestyleMix() {
        var lifestyle = InsightsLifestyle.default
        XCTAssertEqual(lifestyle.stylePrimaries, ["classic"])
        XCTAssertTrue(lifestyle.isPrimaryStyle("classic"))

        lifestyle.tapStylePrimary("preppy")
        XCTAssertEqual(lifestyle.stylePrimaries, ["classic", "preppy"])
        XCTAssertEqual(lifestyle.primaryStyle, "classic")

        lifestyle.tapStylePrimary("preppy")
        XCTAssertEqual(lifestyle.stylePrimaries, ["preppy", "classic"])
        XCTAssertEqual(lifestyle.primaryStyle, "preppy")

        lifestyle.tapStylePrimary("preppy")
        XCTAssertEqual(lifestyle.stylePrimaries, ["classic"])
        XCTAssertEqual(lifestyle.primaryStyle, "classic")

        lifestyle.tapStylePrimary("classic")
        XCTAssertEqual(lifestyle.stylePrimaries, ["classic"])
        XCTAssertEqual(lifestyle.primaryStyle, "classic")
    }

    func testAccentNoneClearsAndSelectingAccentDeselectsNone() {
        var lifestyle = InsightsLifestyle.default
        XCTAssertTrue(lifestyle.hasNoAccents)

        lifestyle.tapAccent("vintage")
        lifestyle.tapAccent("edgy")
        XCTAssertEqual(lifestyle.styleAccents, ["vintage", "edgy"])
        XCTAssertFalse(lifestyle.hasNoAccents)

        lifestyle.clearAccents()
        XCTAssertEqual(lifestyle.styleAccents, [])
        XCTAssertTrue(lifestyle.hasNoAccents)

        lifestyle.tapAccent("vintage")
        XCTAssertEqual(lifestyle.styleAccents, ["vintage"])
        lifestyle.tapAccent("vintage")
        XCTAssertEqual(lifestyle.styleAccents, [])
        XCTAssertTrue(lifestyle.hasNoAccents)
    }

    func testRequestEncodingIncludesLifestyleFieldsAndNullOptionals() throws {
        let request = InsightsLifestyle.default.makeRequest(textInput: "", analysisMode: "free")
        XCTAssertEqual(request.occasion, "work")
        XCTAssertEqual(request.season, "all-season")
        XCTAssertEqual(request.style, "classic")
        XCTAssertEqual(request.lifestyle_mix, ["work", "everyday"])
        XCTAssertEqual(request.primary_lifestyle, "work")
        XCTAssertEqual(request.dress_code, ["smart-casual"])
        XCTAssertNil(request.climate)
        XCTAssertEqual(request.style_primary, ["classic"])
        XCTAssertNil(request.style_accent)
        XCTAssertNil(request.event_focus)

        let json = try encodedJSON(request)
        XCTAssertEqual(json["lifestyle_mix"] as? [String], ["work", "everyday"])
        XCTAssertEqual(json["primary_lifestyle"] as? String, "work")
        XCTAssertEqual(json["dress_code"] as? [String], ["smart-casual"])
        XCTAssertEqual(json["style_primary"] as? [String], ["classic"])
        XCTAssertEqual(json["occasion"] as? String, "work")
        XCTAssertEqual(json["season"] as? String, "all-season")
        XCTAssertEqual(json["style"] as? String, "classic")
        XCTAssertTrue(json["climate"] is NSNull)
        XCTAssertTrue(json["style_accent"] is NSNull)
        XCTAssertTrue(json["event_focus"] is NSNull)
    }

    func testWorkBusinessDressCodeMapsOccasionToBusiness() throws {
        var lifestyle = InsightsLifestyle.default
        lifestyle.dressCodes = ["business-professional"]
        let request = lifestyle.makeRequest(textInput: "no wool", analysisMode: "premium")
        XCTAssertEqual(request.occasion, "business")
        XCTAssertEqual(request.style_primary, ["classic"])

        let json = try encodedJSON(request)
        XCTAssertEqual(json["occasion"] as? String, "business")
        XCTAssertEqual(json["dress_code"] as? [String], ["business-professional"])
        XCTAssertEqual(json["text_input"] as? String, "no wool")
        XCTAssertEqual(json["analysis_mode"] as? String, "premium")
    }

    func testWorkWithAnyFormalDressCodeAmongManyMapsOccasionToBusiness() {
        var lifestyle = InsightsLifestyle.default
        lifestyle.tapDressCode("formal")
        let request = lifestyle.makeRequest(textInput: "", analysisMode: "free")
        XCTAssertEqual(request.dress_code, ["smart-casual", "formal"])
        XCTAssertEqual(request.occasion, "business")
    }

    func testClimateAndAccentEncodeDerivedSeasonAndStyle() throws {
        var lifestyle = InsightsLifestyle.default
        lifestyle.tapClimate("hot")
        lifestyle.tapAccent("vintage")
        lifestyle.eventFocus = "wedding-guest"
        let request = lifestyle.makeRequest(textInput: "", analysisMode: "free")
        XCTAssertEqual(request.season, "summer")
        XCTAssertEqual(request.style, "classic")
        XCTAssertEqual(request.climate, ["hot"])
        XCTAssertEqual(request.style_accent, ["vintage"])
        XCTAssertEqual(request.event_focus, "wedding-guest")

        let json = try encodedJSON(request)
        XCTAssertEqual(json["climate"] as? [String], ["hot"])
        XCTAssertEqual(json["style_accent"] as? [String], ["vintage"])
        XCTAssertEqual(json["event_focus"] as? String, "wedding-guest")
        XCTAssertEqual(json["season"] as? String, "summer")
        XCTAssertEqual(json["dress_code"] as? [String], ["smart-casual"])
        XCTAssertEqual(json["style_primary"] as? [String], ["classic"])
    }

    func testMixedClimatesEncodeAsAllSeasonArray() throws {
        var lifestyle = InsightsLifestyle.default
        lifestyle.tapClimate("hot")
        lifestyle.tapClimate("cold")
        let request = lifestyle.makeRequest(textInput: "", analysisMode: "free")
        XCTAssertEqual(request.season, "all-season")
        XCTAssertEqual(request.climate, ["hot", "cold"])

        let json = try encodedJSON(request)
        XCTAssertEqual(json["climate"] as? [String], ["hot", "cold"])
        XCTAssertEqual(json["season"] as? String, "all-season")
    }

    func testOnlyColdClimateEncodesWinter() {
        var lifestyle = InsightsLifestyle.default
        lifestyle.tapClimate("cold")
        let request = lifestyle.makeRequest(textInput: "", analysisMode: "free")
        XCTAssertEqual(request.season, "winter")
        XCTAssertEqual(request.climate, ["cold"])
    }

    func testCanonicalStyleUsesFirstPrimary() {
        var lifestyle = InsightsLifestyle.default
        lifestyle.tapStylePrimary("preppy")
        lifestyle.tapStylePrimary("preppy")
        let request = lifestyle.makeRequest(textInput: "", analysisMode: "free")
        XCTAssertEqual(request.style_primary, ["preppy", "classic"])
        XCTAssertEqual(request.style, "preppy")
    }

    func testInsightsOnlyNoteIsNotSharedWithSuggest() {
        XCTAssertEqual(
            InsightsCopy.lifestyleOnlyNote,
            "Lifestyle mix is for Insights only. Extra notes are constraints (budget, fabrics, dress-code limits) — not extra occasions or styles."
        )
        XCTAssertFalse(InsightsCopy.lifestyleOnlyNote.contains("Shared with Suggest"))
        XCTAssertEqual(
            InsightsCopy.preferencesIntro,
            "Tell us where this wardrobe needs to work, how formal that life is, and your main look."
        )
    }

    func testNotesPlaceholderAndHelperAreConstraints() {
        XCTAssertEqual(
            InsightsCopy.notesPlaceholder,
            "e.g. budget under $100, no wool, conservative office, no logos."
        )
        XCTAssertTrue(InsightsCopy.notesPlaceholder.lowercased().contains("budget"))
        XCTAssertEqual(
            InsightsCopy.notesHelper,
            "Use notes for limits, not extra occasions or styles."
        )
        XCTAssertTrue(InsightsCopy.notesHelper.lowercased().contains("limits"))
    }

    private func encodedJSON(_ request: WardrobeGapAnalysisRequest) throws -> [String: Any] {
        let data = try JSONEncoder().encode(request)
        let object = try JSONSerialization.jsonObject(with: data)
        guard let json = object as? [String: Any] else {
            XCTFail("Expected JSON object")
            return [:]
        }
        return json
    }
}
