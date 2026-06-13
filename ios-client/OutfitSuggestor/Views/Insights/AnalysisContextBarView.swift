//
//  AnalysisContextBarView.swift
//  OutfitSuggestor
//

import SwiftUI

struct AnalysisContextBarView: View {
    let context: WardrobeInsightContext
    var onChangePreferences: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(InsightsCopy.analyzedForLabel)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
                    .textCase(.uppercase)
                Spacer()
                Button(action: onChangePreferences) {
                    Text(InsightsCopy.changePreferencesButton)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.accent)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("insights.changePreferences")
            }

            InsightsFlowLayout(spacing: 8) {
                contextTag(context.occasion)
                contextTag(context.season)
                contextTag(context.style)
            }
        }
        .padding(14)
        .glassCard()
        .padding(.horizontal)
        .accessibilityIdentifier("insights.contextBar")
    }

    private func contextTag(_ value: String) -> some View {
        Text(value.capitalized)
            .font(.caption.weight(.semibold))
            .foregroundColor(AppTheme.textPrimary)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(AppTheme.accentSoft)
            .cornerRadius(8)
    }
}
