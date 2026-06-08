//
//  AiProgressSteps.swift
//  OutfitSuggestor
//
//  Staged progress definitions for long-running AI operations.
//

import Foundation
import Combine

enum AiOperationType: Equatable {
    case outfitSuggestion
    case outfitWithPreview
    case wardrobeOutfit
    case wardrobeAnalysis
}

struct AiProgressStep: Identifiable, Equatable {
    let id: String
    let label: String
    let durationMs: Int
}

enum AiProgressSteps {
    static func steps(for operation: AiOperationType) -> [AiProgressStep] {
        switch operation {
        case .outfitSuggestion:
            return [
                AiProgressStep(id: "prepare", label: "Preparing your image", durationMs: 2500),
                AiProgressStep(id: "analyze", label: "Analyzing your item", durationMs: 8000),
                AiProgressStep(id: "match", label: "Matching colors and style", durationMs: 10000),
                AiProgressStep(id: "build", label: "Building outfit recommendation", durationMs: 15000),
            ]
        case .outfitWithPreview:
            return [
                AiProgressStep(id: "prepare", label: "Preparing your image", durationMs: 2500),
                AiProgressStep(id: "analyze", label: "Analyzing your item", durationMs: 8000),
                AiProgressStep(id: "match", label: "Matching colors and style", durationMs: 10000),
                AiProgressStep(id: "build", label: "Building outfit recommendation", durationMs: 12000),
                AiProgressStep(id: "preview", label: "Generating preview", durationMs: 20000),
            ]
        case .wardrobeOutfit:
            return [
                AiProgressStep(id: "scan", label: "Scanning your wardrobe", durationMs: 4000),
                AiProgressStep(id: "match", label: "Matching colors and style", durationMs: 8000),
                AiProgressStep(id: "build", label: "Building outfit recommendation", durationMs: 12000),
            ]
        case .wardrobeAnalysis:
            return [
                AiProgressStep(id: "review", label: "Reviewing your wardrobe", durationMs: 5000),
                AiProgressStep(id: "gaps", label: "Identifying gaps", durationMs: 10000),
                AiProgressStep(id: "recommend", label: "Preparing recommendations", durationMs: 15000),
            ]
        }
    }

    static func title(for operation: AiOperationType) -> String {
        switch operation {
        case .outfitSuggestion, .outfitWithPreview:
            return "Creating your outfit"
        case .wardrobeOutfit:
            return "Building from your wardrobe"
        case .wardrobeAnalysis:
            return "Analyzing your wardrobe"
        }
    }

    static func estimatedTotalSeconds(for operation: AiOperationType) -> Int {
        let totalMs = steps(for: operation).reduce(0) { $0 + $1.durationMs }
        return max(1, totalMs / 1000)
    }

    static func formatDuration(seconds: Int) -> String {
        if seconds < 60 { return "\(seconds)s" }
        let mins = seconds / 60
        let secs = seconds % 60
        return secs > 0 ? "\(mins)m \(secs)s" : "\(mins)m"
    }

    static func stepIndex(for message: String?, steps: [AiProgressStep]) -> Int {
        guard let message else { return 0 }
        let lower = message.lowercased()
        if lower.contains("compress") || lower.contains("prepar") { return 0 }
        if lower.contains("analyz") || lower.contains("review") { return min(1, steps.count - 1) }
        if lower.contains("match") || lower.contains("color") || lower.contains("scan") { return min(2, steps.count - 1) }
        if lower.contains("different") || lower.contains("generating ai") || lower.contains("creating your outfit") {
            return min(3, steps.count - 1)
        }
        if lower.contains("preview") || lower.contains("model") { return steps.count - 1 }
        if lower.contains("premium") || lower.contains("chatgpt") || lower.contains("free rules") {
            return min(1, steps.count - 1)
        }
        if lower.contains("gap") || lower.contains("identif") { return min(1, steps.count - 1) }
        return 0
    }
}

@MainActor
final class StagedAiProgressTracker: ObservableObject {
    @Published private(set) var activeStepIndex = 0
    @Published private(set) var elapsedSeconds = 0

    private var timer: Timer?
    private var sessionStartedAt = Date()
    private var stepStartedAt = Date()
    private var operation: AiOperationType = .outfitSuggestion
    private var steps: [AiProgressStep] = []

    var progressPercent: Int {
        min(95, Int(((Double(activeStepIndex) + 0.35) / Double(max(steps.count, 1))) * 100))
    }

    var estimatedTotalSeconds: Int {
        AiProgressSteps.estimatedTotalSeconds(for: operation)
    }

    var estimatedRemainingSeconds: Int {
        max(0, estimatedTotalSeconds - elapsedSeconds)
    }

    var showSlowHint: Bool {
        elapsedSeconds >= 45
    }

    func start(operation: AiOperationType, message: String?) {
        stop()
        self.operation = operation
        self.steps = AiProgressSteps.steps(for: operation)
        sessionStartedAt = Date()
        stepStartedAt = Date()
        activeStepIndex = AiProgressSteps.stepIndex(for: message, steps: steps)
        elapsedSeconds = 0

        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.tick()
            }
        }
    }

    func updateMessage(_ message: String?) {
        let messageIndex = AiProgressSteps.stepIndex(for: message, steps: steps)
        activeStepIndex = max(activeStepIndex, messageIndex)
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        activeStepIndex = 0
        elapsedSeconds = 0
    }

    private func tick() {
        elapsedSeconds = Int(Date().timeIntervalSince(sessionStartedAt))
        guard activeStepIndex < steps.count else { return }
        let currentStep = steps[activeStepIndex]
        let stepElapsedMs = Int(Date().timeIntervalSince(stepStartedAt) * 1000)
        if stepElapsedMs >= currentStep.durationMs, activeStepIndex < steps.count - 1 {
            stepStartedAt = Date()
            activeStepIndex += 1
        }
    }
}
