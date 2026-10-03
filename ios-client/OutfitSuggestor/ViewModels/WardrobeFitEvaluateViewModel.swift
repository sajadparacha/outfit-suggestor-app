//
//  WardrobeFitEvaluateViewModel.swift
//  OutfitSuggestor
//
//  State and API orchestration for wardrobe fit evaluate.
//

import Foundation
import Combine
import UIKit

struct WardrobeFitGoalPrefs: Codable, Equatable {
    var dressCode: String
    var lifestyleMix: [String]
    var primaryLifestyle: String
    var stylePrimary: String

    static let lastGoalKey = "wardrobeFitLastGoal"

    static let `default` = WardrobeFitGoalPrefs(
        dressCode: "smart-casual",
        lifestyleMix: ["work", "everyday"],
        primaryLifestyle: "work",
        stylePrimary: "classic"
    )

    init(dressCode: String, lifestyleMix: [String], primaryLifestyle: String, stylePrimary: String) {
        self.dressCode = dressCode
        self.lifestyleMix = lifestyleMix
        self.primaryLifestyle = primaryLifestyle
        self.stylePrimary = stylePrimary
    }

    init(insights: InsightsLifestyle) {
        let mix = insights.normalizedMix()
        self.init(
            dressCode: insights.normalizedDressCodes().first ?? Self.default.dressCode,
            lifestyleMix: mix,
            primaryLifestyle: mix.first ?? Self.default.primaryLifestyle,
            stylePrimary: insights.normalizedStylePrimaries().first ?? Self.default.stylePrimary
        )
    }

    /// Priority: last-used fit goal > saved Insights preferences > defaults.
    static func resolveInitial(defaults: UserDefaults) -> WardrobeFitGoalPrefs {
        if let data = defaults.data(forKey: lastGoalKey),
           let last = try? JSONDecoder().decode(WardrobeFitGoalPrefs.self, from: data) {
            return last
        }
        if let insights = InsightsLifestyleStore.load(from: defaults) {
            return WardrobeFitGoalPrefs(insights: insights)
        }
        return .default
    }

    func saveAsLastGoal(to defaults: UserDefaults) {
        guard let data = try? JSONEncoder().encode(self) else { return }
        defaults.set(data, forKey: Self.lastGoalKey)
    }
}

@MainActor
final class WardrobeFitEvaluateViewModel: ObservableObject {
    @Published var isPresented = false
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var result: WardrobeFitEvaluateResponse?
    @Published var sourceItem: WardrobeItem?
    @Published var showGoalEditor = false

    @Published var dressCode: String = WardrobeFitEvaluateViewModel.defaultDressCode
    @Published var lifestyleMix: [String] = WardrobeFitEvaluateViewModel.defaultLifestyleMix
    @Published var primaryLifestyle: String = WardrobeFitEvaluateViewModel.defaultPrimaryLifestyle
    @Published var stylePrimary: String = WardrobeFitEvaluateViewModel.defaultStylePrimary
    @Published var textInput: String = ""

    /// Check before you buy: local photo used as the candidate thumb (never saved).
    @Published var candidateImage: UIImage?
    @Published var analyzedAttributes: WardrobeAnalyzeResponse?

    static let defaultDressCode = WardrobeFitGoalPrefs.default.dressCode
    static let defaultLifestyleMix = WardrobeFitGoalPrefs.default.lifestyleMix
    static let defaultPrimaryLifestyle = WardrobeFitGoalPrefs.default.primaryLifestyle
    static let defaultStylePrimary = WardrobeFitGoalPrefs.default.stylePrimary

    private let evaluate: (WardrobeFitEvaluateRequest) async throws -> WardrobeFitEvaluateResponse
    private let analyze: (UIImage) async throws -> WardrobeAnalyzeResponse
    private let defaults: UserDefaults

    init(
        defaults: UserDefaults = .standard,
        evaluate: @escaping (WardrobeFitEvaluateRequest) async throws -> WardrobeFitEvaluateResponse = {
            try await APIService.shared.evaluateWardrobeFit(request: $0)
        },
        analyze: @escaping (UIImage) async throws -> WardrobeAnalyzeResponse = {
            try await APIService.shared.analyzeWardrobeImage(image: $0)
        }
    ) {
        self.defaults = defaults
        self.evaluate = evaluate
        self.analyze = analyze
    }

    var isCheckBeforeBuy: Bool {
        sourceItem == nil && candidateImage != nil
    }

    var loadingMessage: String {
        isCheckBeforeBuy ? WardrobeFitEvaluateCopy.checkBeforeBuyLoading : WardrobeFitEvaluateCopy.loading
    }

    var title: String {
        isCheckBeforeBuy ? WardrobeFitEvaluateCopy.checkBeforeBuyAction : WardrobeFitEvaluateCopy.action
    }

    var currentGoal: WardrobeFitGoalPrefs {
        WardrobeFitGoalPrefs(
            dressCode: dressCode,
            lifestyleMix: lifestyleMix,
            primaryLifestyle: primaryLifestyle,
            stylePrimary: stylePrimary
        )
    }

    /// The "Missing for your goal" card is shown whenever a result is loaded.
    var showsMissingForGoal: Bool {
        result != nil && !isLoading && errorMessage == nil
    }

    func showsOpenInsights(hasHandler: Bool) -> Bool {
        hasHandler && showsMissingForGoal
    }

    var goalSummaryLine: String {
        let mix = lifestyleMix.joined(separator: " + ")
        let dress = InsightsLifestyle.dressCodeOptions.first { $0.value == dressCode }?.label
            ?? dressCode
        let style = InsightsLifestyle.stylePrimaryOptions.first { $0.value == stylePrimary }?.label
            ?? stylePrimary
        return "\(dress) · \(mix) · \(style)"
    }

    var hasEmptyPairs: Bool {
        guard let result else { return false }
        return result.pairs_with.isEmpty || result.pairs_with.allSatisfy { $0.count == 0 }
    }

    func open(for item: WardrobeItem) {
        sourceItem = item
        candidateImage = nil
        analyzedAttributes = nil
        applyInitialGoal()
        showGoalEditor = false
        result = nil
        errorMessage = nil
        isPresented = true
        Task { await runEvaluate() }
    }

    /// Check before you buy: analyze the photo, then evaluate an attribute-only candidate (no wardrobe_item_id).
    func startCheckBeforeBuy(image: UIImage) {
        Task { await checkBeforeBuy(image: image) }
    }

    func checkBeforeBuy(image: UIImage) async {
        sourceItem = nil
        candidateImage = image
        analyzedAttributes = nil
        resetGoalToDefaults()
        showGoalEditor = false
        result = nil
        errorMessage = nil
        isPresented = true
        await runEvaluate()
    }

    func dismiss() {
        isPresented = false
        result = nil
        errorMessage = nil
        sourceItem = nil
        candidateImage = nil
        analyzedAttributes = nil
        showGoalEditor = false
    }

    func resetGoalToDefaults() {
        dressCode = Self.defaultDressCode
        lifestyleMix = Self.defaultLifestyleMix
        primaryLifestyle = Self.defaultPrimaryLifestyle
        stylePrimary = Self.defaultStylePrimary
        textInput = ""
    }

    func applyInitialGoal() {
        let goal = WardrobeFitGoalPrefs.resolveInitial(defaults: defaults)
        dressCode = goal.dressCode
        lifestyleMix = goal.lifestyleMix
        primaryLifestyle = goal.primaryLifestyle
        stylePrimary = goal.stylePrimary
        textInput = ""
    }

    func setPrimaryLifestyle(_ value: String) {
        primaryLifestyle = value
        lifestyleMix = [value] + lifestyleMix.filter { $0 != value }
        if lifestyleMix.count > InsightsLifestyle.maxMix {
            lifestyleMix = Array(lifestyleMix.prefix(InsightsLifestyle.maxMix))
        }
    }

    func toggleLifestyle(_ value: String) {
        if value == primaryLifestyle { return }
        if let index = lifestyleMix.firstIndex(of: value) {
            lifestyleMix.remove(at: index)
        } else if lifestyleMix.count < InsightsLifestyle.maxMix {
            lifestyleMix.append(value)
        }
    }

    func retry() async {
        await runEvaluate()
    }

    func applyGoalAndReevaluate() async {
        showGoalEditor = false
        currentGoal.saveAsLastGoal(to: defaults)
        await runEvaluate()
    }

    func runEvaluate() async {
        let item = sourceItem
        let image = candidateImage
        guard item != nil || image != nil else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let request: WardrobeFitEvaluateRequest
            if let item {
                request = WardrobeFitEvaluateRequest(
                    wardrobe_item_id: item.id,
                    dress_code: dressCode,
                    lifestyle_mix: lifestyleMix,
                    primary_lifestyle: primaryLifestyle,
                    style_primary: stylePrimary,
                    text_input: textInput
                )
            } else {
                let attributes: WardrobeAnalyzeResponse
                if let cached = analyzedAttributes {
                    attributes = cached
                } else if let image {
                    attributes = try await analyze(image)
                    analyzedAttributes = attributes
                } else {
                    return
                }
                request = WardrobeFitEvaluateRequest(
                    category: attributes.category,
                    color: attributes.color,
                    description: attributes.description,
                    dress_code: dressCode,
                    lifestyle_mix: lifestyleMix,
                    primary_lifestyle: primaryLifestyle,
                    style_primary: stylePrimary,
                    text_input: textInput
                )
            }
            result = try await evaluate(request)
        } catch {
            result = nil
            errorMessage = WardrobeFitEvaluateCopy.error
        }
    }
}
