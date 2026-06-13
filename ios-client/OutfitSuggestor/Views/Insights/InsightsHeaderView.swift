//
//  InsightsHeaderView.swift
//  OutfitSuggestor
//

import SwiftUI

struct InsightsHeaderView: View {
    let hasResult: Bool
    var onNewAnalysis: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text(InsightsCopy.pageTitle)
                    .font(.title2.weight(.bold))
                    .foregroundColor(AppTheme.textPrimary)
                Text(InsightsCopy.pageSubtitle)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 8)
            if hasResult {
                Button(action: onNewAnalysis) {
                    Text(InsightsCopy.newAnalysisButton)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.accent)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("insights.newAnalysis")
            }
        }
        .padding(.horizontal)
    }
}
