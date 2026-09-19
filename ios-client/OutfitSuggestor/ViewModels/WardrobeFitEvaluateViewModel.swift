//
//  WardrobeFitEvaluateViewModel.swift
//  OutfitSuggestor
//
//  State and API orchestration for wardrobe fit evaluate.
//

import Foundation
import Combine

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

    static let defaultDressCode = "smart-casual"
    static let defaultLifestyleMix = ["work", "everyday"]
    static let defaultPrimaryLifestyle = "work"
    static let defaultStylePrimary = "classic"

    private let evaluate: (WardrobeFitEvaluateRequest) async throws -> WardrobeFitEvaluateResponse

    init(
        evaluate: @escaping (WardrobeFitEvaluateRequest) async throws -> WardrobeFitEvaluateResponse = {
            try await APIService.shared.evaluateWardrobeFit(request: $0)
        }
    ) {
        self.evaluate = evaluate
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
        resetGoalToDefaults()
        showGoalEditor = false
        result = nil
        errorMessage = nil
        isPresented = true
        Task { await runEvaluate() }
    }

    func dismiss() {
        isPresented = false
        result = nil
        errorMessage = nil
        sourceItem = nil
        showGoalEditor = false
    }

    func resetGoalToDefaults() {
        dressCode = Self.defaultDressCode
        lifestyleMix = Self.defaultLifestyleMix
        primaryLifestyle = Self.defaultPrimaryLifestyle
        stylePrimary = Self.defaultStylePrimary
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
        await runEvaluate()
    }

    func runEvaluate() async {
        guard let item = sourceItem else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        let request = WardrobeFitEvaluateRequest(
            wardrobe_item_id: item.id,
            dress_code: dressCode,
            lifestyle_mix: lifestyleMix,
            primary_lifestyle: primaryLifestyle,
            style_primary: stylePrimary,
            text_input: textInput
        )

        do {
            result = try await evaluate(request)
        } catch {
            result = nil
            errorMessage = WardrobeFitEvaluateCopy.error
        }
    }
}
