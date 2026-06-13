//
//  MissingItemCardView.swift
//  OutfitSuggestor
//

import SwiftUI

struct MissingItemCardView: View {
    let item: WardrobeInsightMissingItem
    let defaultStyle: String
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.name.capitalized)
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)
                    InsightsPriorityBadge(priority: item.priority)
                }
                Spacer()
            }

            Text(item.reason)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)

            InsightsColorSwatchRow(
                title: InsightsCopy.bestColorsLabel,
                colors: item.bestColors,
                category: item.category,
                defaultStyle: defaultStyle,
                stylesToTry: item.worksWith
            )

            if !item.worksWith.isEmpty {
                InsightsStyleChipRow(
                    title: InsightsCopy.worksWithLabel,
                    styles: item.worksWith
                )
            }

            InsightsSecondaryButton(title: InsightsCopy.shopSimilarButton) {
                InsightsShoppingSearch.open(
                    category: item.category,
                    colors: item.bestColors,
                    styles: [],
                    defaultStyle: defaultStyle,
                    openURL: openURL
                )
            }
            .accessibilityIdentifier("insights.shopSimilar.\(item.id)")
        }
        .padding(14)
        .glassCard()
    }
}
