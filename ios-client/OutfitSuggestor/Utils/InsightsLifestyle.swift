//
//  InsightsLifestyle.swift
//  OutfitSuggestor
//
//  Insights-only lifestyle mix, dress code, climate, and style.
//  Mapping matches backend/services/wardrobe_gap_context.py.
//

import Foundation

struct InsightsLifestyleOption: Identifiable, Equatable {
    let value: String
    let label: String
    var id: String { value }
}

struct InsightsLifestyle: Equatable {
    static let maxMix = 3

    static let mixOptions: [InsightsLifestyleOption] = [
        .init(value: "work", label: "Work"),
        .init(value: "everyday", label: "Everyday"),
        .init(value: "social", label: "Social / Dinner"),
        .init(value: "formal", label: "Formal"),
        .init(value: "sport", label: "Sport / Outdoor")
    ]

    static let dressCodeOptions: [InsightsLifestyleOption] = [
        .init(value: "casual", label: "Casual"),
        .init(value: "smart-casual", label: "Smart casual"),
        .init(value: "business-professional", label: "Business professional"),
        .init(value: "formal", label: "Formal")
    ]

    static let climateOptions: [InsightsLifestyleOption] = [
        .init(value: "hot", label: "Hot"),
        .init(value: "temperate", label: "Temperate"),
        .init(value: "cold", label: "Cold")
    ]

    /// Insights primaries — Boho / Romantic / Trendy are not offered.
    static let stylePrimaryOptions: [InsightsLifestyleOption] = [
        .init(value: "classic", label: "Classic"),
        .init(value: "smart-casual", label: "Smart Casual"),
        .init(value: "preppy", label: "Preppy"),
        .init(value: "minimal", label: "Minimal"),
        .init(value: "elegant", label: "Elegant"),
        .init(value: "streetwear", label: "Streetwear"),
        .init(value: "sporty", label: "Sporty")
    ]

    static let styleAccentOptions: [InsightsLifestyleOption] = [
        .init(value: "vintage", label: "Vintage"),
        .init(value: "edgy", label: "Edgy"),
        .init(value: "sporty", label: "Sporty"),
        .init(value: "preppy", label: "Preppy")
    ]

    static let hiddenPrimaryStyles: Set<String> = ["boho", "romantic", "trendy"]

    private static let lifestyleValues = Set(mixOptions.map(\.value))
    private static let dressCodeValues = Set(dressCodeOptions.map(\.value))
    private static let climateValues = Set(climateOptions.map(\.value))
    private static let stylePrimaryValues = Set(stylePrimaryOptions.map(\.value))
    private static let styleAccentValues = Set(styleAccentOptions.map(\.value))

    private static let occasionFromLifestyle: [String: String] = [
        "work": "work",
        "everyday": "everyday",
        "social": "dinner-night-out",
        "formal": "formal-event",
        "sport": "workout"
    ]

    /// Primary lifestyle is always `mix[0]`. Default: Work (primary) + Everyday.
    var mix: [String]
    /// At least one. Default: Smart casual.
    var dressCodes: [String]
    /// Optional climates. Year-round is always on in the UI. Default: none.
    var climates: [String]
    /// Primary style is always `stylePrimaries[0]`. Default: Classic.
    var stylePrimaries: [String]
    /// Empty means None. Default: none.
    var styleAccents: [String]
    var eventFocus: String?

    static let `default` = InsightsLifestyle(
        mix: ["work", "everyday"],
        dressCodes: ["smart-casual"],
        climates: [],
        stylePrimaries: ["classic"],
        styleAccents: [],
        eventFocus: nil
    )

    var primaryLifestyle: String { mix.first ?? "work" }

    var primaryStyle: String { stylePrimaries.first ?? "classic" }

    var canAddMixChip: Bool { mix.count < Self.maxMix }

    var hasNoAccents: Bool { styleAccents.isEmpty }

    func isMixSelected(_ value: String) -> Bool {
        mix.contains(value)
    }

    func isPrimary(_ value: String) -> Bool {
        primaryLifestyle == value
    }

    func isDressCodeSelected(_ value: String) -> Bool {
        dressCodes.contains(value)
    }

    func isClimateSelected(_ value: String) -> Bool {
        climates.contains(value)
    }

    func isStylePrimarySelected(_ value: String) -> Bool {
        stylePrimaries.contains(value)
    }

    func isPrimaryStyle(_ value: String) -> Bool {
        primaryStyle == value
    }

    func isAccentSelected(_ value: String) -> Bool {
        styleAccents.contains(value)
    }

    /// Tap unselected → add (if under max).
    /// Tap selected non-primary → make primary.
    /// Tap primary → deselect only if another chip remains (that other becomes primary).
    mutating func tapMix(_ value: String) {
        guard Self.lifestyleValues.contains(value) else { return }
        var list = mix
        tapPrimaryList(&list, value: value, maxCount: Self.maxMix)
        mix = list
    }

    /// Multi-select. At least one required — last selected code stays.
    mutating func tapDressCode(_ value: String) {
        guard Self.dressCodeValues.contains(value) else { return }
        if let index = dressCodes.firstIndex(of: value) {
            guard dressCodes.count > 1 else { return }
            dressCodes.remove(at: index)
        } else {
            dressCodes.append(value)
        }
    }

    /// Multi-select climates. Tapping a selected climate deselects it. Year-round stays on.
    mutating func tapClimate(_ value: String) {
        guard Self.climateValues.contains(value) else { return }
        if let index = climates.firstIndex(of: value) {
            climates.remove(at: index)
        } else {
            climates.append(value)
        }
    }

    /// Same tap rules as lifestyle mix, with no max.
    mutating func tapStylePrimary(_ value: String) {
        guard Self.stylePrimaryValues.contains(value) else { return }
        var list = stylePrimaries
        tapPrimaryList(&list, value: value, maxCount: nil)
        stylePrimaries = list
    }

    /// Selecting an accent deselects None. Tapping a selected accent deselects it.
    mutating func tapAccent(_ value: String) {
        guard Self.styleAccentValues.contains(value) else { return }
        if let index = styleAccents.firstIndex(of: value) {
            styleAccents.remove(at: index)
        } else {
            styleAccents.append(value)
        }
    }

    /// None clears all accents.
    mutating func clearAccents() {
        styleAccents = []
    }

    func makeRequest(textInput: String, analysisMode: String) -> WardrobeGapAnalysisRequest {
        let mix = normalizedMix()
        let primary = mix.first ?? "work"
        let codes = normalizedDressCodes()
        let climateValues = normalizedClimates()
        let primaries = normalizedStylePrimaries()
        let accents = normalizedStyleAccents()
        let event = eventFocus.flatMap { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : $0 }

        return WardrobeGapAnalysisRequest(
            occasion: Self.canonicalOccasion(primary: primary, dressCodes: codes),
            season: Self.canonicalSeason(climates: climateValues),
            style: Self.canonicalStyle(stylePrimary: primaries.first ?? "classic"),
            text_input: textInput,
            analysis_mode: analysisMode,
            lifestyle_mix: mix,
            primary_lifestyle: primary,
            dress_code: codes,
            climate: climateValues.isEmpty ? nil : climateValues,
            style_primary: primaries,
            style_accent: accents.isEmpty ? nil : accents,
            event_focus: event
        )
    }

    func normalizedMix() -> [String] {
        uniqueAllowed(mix, in: Self.lifestyleValues, fallback: ["work", "everyday"], maxCount: Self.maxMix)
    }

    func normalizedDressCodes() -> [String] {
        uniqueAllowed(dressCodes, in: Self.dressCodeValues, fallback: ["smart-casual"], maxCount: nil)
    }

    func normalizedClimates() -> [String] {
        uniqueAllowed(climates, in: Self.climateValues, fallback: [], maxCount: nil)
    }

    func normalizedStylePrimaries() -> [String] {
        uniqueAllowed(stylePrimaries, in: Self.stylePrimaryValues, fallback: ["classic"], maxCount: nil)
    }

    func normalizedStyleAccents() -> [String] {
        uniqueAllowed(styleAccents, in: Self.styleAccentValues, fallback: [], maxCount: nil)
    }

    static func canonicalOccasion(primary: String, dressCodes: [String]) -> String {
        let hasBusinessCode = dressCodes.contains { $0 == "business-professional" || $0 == "formal" }
        if primary == "work" && hasBusinessCode {
            return "business"
        }
        return occasionFromLifestyle[primary] ?? "work"
    }

    static func canonicalSeason(climates: [String]) -> String {
        if climates.count == 1 {
            switch climates[0] {
            case "hot": return "summer"
            case "cold": return "winter"
            default: break
            }
        }
        return "all-season"
    }

    static func canonicalStyle(stylePrimary: String) -> String {
        stylePrimary.isEmpty ? "classic" : stylePrimary
    }

    static func mixLabel(for value: String) -> String {
        mixOptions.first { $0.value == value }?.label ?? value.capitalized
    }

    static func dressCodeLabel(for value: String) -> String {
        dressCodeOptions.first { $0.value == value }?.label ?? value
    }

    static func climateLabel(for value: String) -> String {
        climateOptions.first { $0.value == value }?.label ?? value.capitalized
    }

    static func styleLabel(for value: String) -> String {
        stylePrimaryOptions.first { $0.value == value }?.label
            ?? styleAccentOptions.first { $0.value == value }?.label
            ?? value.capitalized
    }

    /// Shared Primary-badge list: tap unselected to add; tap selected non-primary to make primary;
    /// tap primary deselects only if another remains.
    private mutating func tapPrimaryList(_ list: inout [String], value: String, maxCount: Int?) {
        if let index = list.firstIndex(of: value) {
            if index == 0 {
                guard list.count > 1 else { return }
                list.removeFirst()
            } else {
                list.remove(at: index)
                list.insert(value, at: 0)
            }
        } else {
            if let maxCount, list.count >= maxCount { return }
            list.append(value)
        }
    }

    private func uniqueAllowed(
        _ values: [String],
        in allowed: Set<String>,
        fallback: [String],
        maxCount: Int?
    ) -> [String] {
        var cleaned: [String] = []
        for item in values where allowed.contains(item) && !cleaned.contains(item) {
            cleaned.append(item)
            if let maxCount, cleaned.count == maxCount { break }
        }
        return cleaned.isEmpty ? fallback : cleaned
    }
}
