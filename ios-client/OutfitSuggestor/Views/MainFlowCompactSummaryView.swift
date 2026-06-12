//
//  MainFlowCompactSummaryView.swift
//  OutfitSuggestor
//
//  Compact summary of user inputs after outfit generation.
//

import SwiftUI
import UIKit

struct MainFlowCompactSummaryView: View {
    let filters: OutfitFilters
    let preferenceText: String
    let inputPanelImage: UIImage?
    var inputPanelSource: OutfitViewModel.InputPanelSource = .none
    var sourceWardrobeItem: OutfitViewModel.WardrobeSourceContext?

    private var previewCaption: String? {
        if inputPanelSource == .history {
            return MainFlowUxCopy.fromHistory
        }
        if let source = sourceWardrobeItem {
            return "Wardrobe · \(source.category.capitalized)"
        }
        return nil
    }

    private var contextLine: String {
        OutfitContextLine.format(
            occasion: filters.occasion,
            season: filters.season,
            style: filters.style
        )
    }

    private var occasionLabel: String {
        Occasion.allCases.first { $0.apiValue == filters.occasion }?.rawValue
            ?? filters.occasion.capitalized
    }

    private var seasonLabel: String {
        Season.allCases.first { $0.apiValue == filters.season }?.rawValue
            ?? filters.season.capitalized
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(MainFlowUxCopy.compactSummaryTitle)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
                .textCase(.uppercase)

            if let image = inputPanelImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 112)
                    .frame(maxWidth: .infinity)
                    .padding(8)
                    .background(Color.white.opacity(0.04))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(AppTheme.border, lineWidth: 1)
                    )

                if let caption = previewCaption {
                    Text(caption)
                        .font(.caption2)
                        .foregroundColor(AppTheme.textSecondary)
                        .lineLimit(1)
                        .accessibilityIdentifier("main.compactSummary.previewCaption")
                }
            }

            Text(contextLine)
                .font(.subheadline.weight(.medium))
                .foregroundColor(AppTheme.accent)

            VStack(spacing: 8) {
                summaryRow(label: "Occasion", value: occasionLabel)
                summaryRow(label: "Season", value: seasonLabel)
                if !preferenceText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Notes")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                        Text(preferenceText)
                            .font(.subheadline)
                            .foregroundColor(AppTheme.textPrimary)
                            .lineLimit(2)
                    }
                }
            }
        }
        .padding(14)
        .glassCard()
        .accessibilityIdentifier("main.compactSummary")
    }

    @ViewBuilder
    private func summaryRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.subheadline)
                .foregroundColor(AppTheme.textPrimary)
        }
    }
}
