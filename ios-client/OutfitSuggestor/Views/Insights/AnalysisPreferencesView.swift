//
//  AnalysisPreferencesView.swift
//  OutfitSuggestor
//

import SwiftUI

struct AnalysisPreferencesView: View {
    @Binding var filters: OutfitFilters
    @Binding var preferenceText: String
    @Binding var analysisMode: String

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(InsightsCopy.sharedPreferencesNote)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)

            FiltersView(
                filters: $filters,
                preferenceText: $preferenceText,
                layout: .form,
                showWardrobeOnly: false
            )

            VStack(alignment: .leading, spacing: 6) {
                Text(InsightsCopy.modePickerTitle)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                Text(InsightsCopy.modePickerSubtitle)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                Picker(InsightsCopy.modePickerTitle, selection: $analysisMode) {
                    Text(InsightsCopy.quickCheckSegmentLabel).tag("free")
                    Text(InsightsCopy.aiStylistSegmentLabel).tag("premium")
                }
                .pickerStyle(.segmented)
            }
            .accessibilityIdentifier("insights.analysisMode")
        }
        .padding(.horizontal)
        .accessibilityIdentifier("insights.preferencesForm")
    }
}
