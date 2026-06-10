//
//  CollapsedPreferencesRow.swift
//  OutfitSuggestor
//
//  Collapsed first-run preferences affordance before full FiltersView.
//

import SwiftUI

struct CollapsedPreferencesRow: View {
    var onExpand: () -> Void

    var body: some View {
        Button(action: onExpand) {
            HStack(spacing: 10) {
                Text(FirstRunCoachCopy.collapsedPreferencesLabel)
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(AppTheme.textPrimary)
                    .multilineTextAlignment(.leading)
                Spacer()
                HStack(spacing: 4) {
                    Text(FirstRunCoachCopy.expandButton)
                        .font(.subheadline.weight(.semibold))
                    Image(systemName: "chevron.down")
                        .font(.caption.weight(.semibold))
                }
                .foregroundStyle(AppTheme.accentGradient)
            }
            .padding(14)
            .glassCard()
        }
        .buttonStyle(.plain)
        .padding(.horizontal)
        .accessibilityIdentifier("main.collapsedPreferences")
    }
}
