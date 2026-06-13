//
//  CoverageStatusCardView.swift
//  OutfitSuggestor
//

import SwiftUI

struct CoverageStatusCardView: View {
    let health: WardrobeInsightCategoryHealth

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: WardrobeCategoryIcon.symbolName(for: health.id))
                    .font(.title3)
                    .foregroundStyle(AppTheme.accentGradient)
                Text(health.category)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            InsightsStatusBadge(status: health.status)
            Text(health.summary)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, minHeight: 120, alignment: .topLeading)
        .glassCard()
        .accessibilityIdentifier("insights.coverage.\(health.id)")
    }
}
