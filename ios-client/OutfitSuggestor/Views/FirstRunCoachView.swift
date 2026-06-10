//
//  FirstRunCoachView.swift
//  OutfitSuggestor
//
//  Three-step first-run coach strip above upload on the Suggest flow.
//

import SwiftUI

struct FirstRunCoachView: View {
    let hasImage: Bool
    let hasSuggestion: Bool
    let isRegularWidth: Bool
    var onDismiss: () -> Void

    private var activeStep: FirstRunCoachCopy.Step {
        FirstRunCoachLogic.activeStep(hasImage: hasImage, hasSuggestion: hasSuggestion)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Spacer()
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                        .padding(6)
                }
                .accessibilityLabel("Dismiss coach")
                .accessibilityIdentifier("main.firstRunCoach.dismiss")
            }

            Group {
                if isRegularWidth {
                    HStack(spacing: 10) {
                        ForEach(FirstRunCoachCopy.Step.allCases, id: \.rawValue) { step in
                            stepCard(step)
                        }
                    }
                } else {
                    VStack(spacing: 10) {
                        ForEach(FirstRunCoachCopy.Step.allCases, id: \.rawValue) { step in
                            stepCard(step)
                        }
                    }
                }
            }
        }
        .padding(14)
        .glassCard()
        .padding(.horizontal)
        .accessibilityIdentifier("main.firstRunCoach")
    }

    @ViewBuilder
    private func stepCard(_ step: FirstRunCoachCopy.Step) -> some View {
        let isActive = step == activeStep
        let isCompleted = FirstRunCoachLogic.isStepCompleted(step, hasImage: hasImage, hasSuggestion: hasSuggestion)

        HStack(alignment: .top, spacing: 10) {
            ZStack {
                if isCompleted {
                    Image(systemName: "checkmark")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.white)
                } else {
                    Text("\(step.rawValue)")
                        .font(.caption.weight(.bold))
                        .foregroundColor(isActive ? .white : AppTheme.textSecondary)
                }
            }
            .frame(width: 26, height: 26)
            .background(
                Group {
                    if isCompleted || isActive {
                        AppTheme.accentGradient
                    } else {
                        Color.white.opacity(0.08)
                    }
                }
            )
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(step.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                Text(step.subtitle)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(isActive ? 0.06 : 0.03))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(
                    isActive ? AnyShapeStyle(AppTheme.accentGradient) : AnyShapeStyle(AppTheme.border),
                    lineWidth: isActive ? 2 : 1
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .accessibilityIdentifier(step.accessibilityIdentifier)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(step.title). \(step.subtitle)")
    }
}
