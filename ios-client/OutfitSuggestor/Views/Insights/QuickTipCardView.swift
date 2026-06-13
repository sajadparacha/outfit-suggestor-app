//
//  QuickTipCardView.swift
//  OutfitSuggestor
//

import SwiftUI

struct QuickTipCardView: View {
    var isAdmin: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(InsightsCopy.quickTipText)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            NavigationLink(destination: UserGuideView(isAdmin: isAdmin)) {
                Text(InsightsCopy.viewStyleGuideButton)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(AppTheme.accentSoft)
                    .cornerRadius(12)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("insights.viewStyleGuide")
        }
        .padding(14)
        .glassCard()
        .padding(.horizontal)
        .accessibilityIdentifier("insights.quickTip")
    }
}
