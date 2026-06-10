//
//  AiProgressPanelView.swift
//  OutfitSuggestor
//
//  Non-blocking staged progress panel for long AI operations.
//

import SwiftUI

struct AiProgressPanelView: View {
    let operationType: AiOperationType
    let message: String?
    let onCancel: () -> Void

    @StateObject private var tracker = StagedAiProgressTracker()

    private var steps: [AiProgressStep] {
        AiProgressSteps.steps(for: operationType)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(AiProgressSteps.title(for: operationType))
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)
                        .accessibilityIdentifier("ai.progressTitle")
                    Text("Elapsed \(AiProgressSteps.formatDuration(seconds: tracker.elapsedSeconds)) · Usually ~\(AiProgressSteps.formatDuration(seconds: tracker.estimatedTotalSeconds)) total")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
                Spacer(minLength: 8)
                Button("Cancel", action: onCancel)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.08))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .stroke(AppTheme.border, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    .accessibilityIdentifier("ai.progressCancelButton")
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.12))
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [AppTheme.gradientStart, AppTheme.gradientEnd],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * CGFloat(tracker.progressPercent) / 100)
                        .animation(.easeInOut(duration: 0.7), value: tracker.progressPercent)
                }
            }
            .frame(height: 6)

            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                    HStack(spacing: 10) {
                        stepIndicator(index: index)
                        Text(step.label)
                            .font(.subheadline)
                            .foregroundColor(stepTextColor(index: index))
                    }
                }
            }

            if let message, !message.isEmpty {
                Text(message)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            }

            if tracker.showSlowHint {
                Text("Still working — complex outfits can take a bit longer. You can cancel anytime.")
                    .font(.caption)
                    .foregroundColor(Color(red: 1, green: 0.92, blue: 0.75))
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.orange.opacity(0.15))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(Color.orange.opacity(0.25), lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
        }
        .padding(18)
        .background(Color(red: 0.04, green: 0.06, blue: 0.12).opacity(0.96))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: Color.black.opacity(0.45), radius: 24, y: 10)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("ai.progressPanel")
        .onAppear {
            tracker.start(operation: operationType, message: message)
        }
        .onDisappear {
            tracker.stop()
        }
        .onChange(of: message) { newMessage in
            tracker.updateMessage(newMessage)
        }
        .onChange(of: operationType) { newType in
            tracker.start(operation: newType, message: message)
        }
    }

    @ViewBuilder
    private func stepIndicator(index: Int) -> some View {
        if index < tracker.activeStepIndex {
            Text("✓")
                .font(.caption2.weight(.bold))
                .foregroundColor(Color.green.opacity(0.85))
                .frame(width: 20, height: 20)
                .background(Color.green.opacity(0.18))
                .clipShape(Circle())
        } else if index == tracker.activeStepIndex {
            Circle()
                .fill(AppTheme.accent)
                .frame(width: 8, height: 8)
                .frame(width: 20, height: 20)
                .background(AppTheme.accent.opacity(0.18))
                .clipShape(Circle())
        } else {
            Text("·")
                .font(.caption.weight(.bold))
                .foregroundColor(AppTheme.textSecondary.opacity(0.6))
                .frame(width: 20, height: 20)
                .background(Color.white.opacity(0.06))
                .clipShape(Circle())
        }
    }

    private func stepTextColor(index: Int) -> Color {
        if index < tracker.activeStepIndex {
            return AppTheme.textSecondary
        }
        if index == tracker.activeStepIndex {
            return AppTheme.textPrimary
        }
        return AppTheme.textSecondary.opacity(0.65)
    }
}
