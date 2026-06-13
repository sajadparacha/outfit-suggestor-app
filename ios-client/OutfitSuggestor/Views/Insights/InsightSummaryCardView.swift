//
//  InsightSummaryCardView.swift
//  OutfitSuggestor
//

import SwiftUI

struct InsightSummaryCardView: View {
    let score: WardrobeInsightScore
    let topPriorities: [WardrobeInsightPriority]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 20) {
                ScoreRingView(value: score.value, label: score.label.rawValue)
                VStack(alignment: .leading, spacing: 6) {
                    Text(score.label.rawValue)
                        .font(.title3.weight(.bold))
                        .foregroundColor(AppTheme.textPrimary)
                    Text(score.summary)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            if !topPriorities.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text(InsightsCopy.topPrioritiesTitle)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                        .textCase(.uppercase)
                    ForEach(topPriorities) { priority in
                        HStack(alignment: .top, spacing: 8) {
                            Text("\(priority.rank).")
                                .font(.subheadline.weight(.bold))
                                .foregroundColor(AppTheme.accent)
                            Text(priority.name.capitalized)
                                .font(.subheadline)
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            InsightsPriorityBadge(priority: priority.priority)
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(AppTheme.surface)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(AppTheme.border, lineWidth: 1))
        .cornerRadius(14)
        .padding(.horizontal)
        .accessibilityIdentifier("insights.summaryCard")
    }
}

private struct ScoreRingView: View {
    let value: Int
    let label: String

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.12), lineWidth: 8)
            Circle()
                .trim(from: 0, to: CGFloat(value) / 100)
                .stroke(AppTheme.accentGradient, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 2) {
                Text("\(value)")
                    .font(.title2.weight(.bold))
                    .foregroundColor(AppTheme.textPrimary)
                Text(label)
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
            }
        }
        .frame(width: 88, height: 88)
        .accessibilityIdentifier("insights.scoreRing")
    }
}
