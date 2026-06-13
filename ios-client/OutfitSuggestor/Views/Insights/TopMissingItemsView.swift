//
//  TopMissingItemsView.swift
//  OutfitSuggestor
//

import SwiftUI

struct TopMissingItemsView: View {
    let items: [WardrobeInsightMissingItem]
    let defaultStyle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            InsightsSectionHeader(
                title: InsightsCopy.topItemsTitle,
                subtitle: InsightsCopy.topItemsSubtitle
            )
            .padding(.horizontal)

            if items.isEmpty {
                Text("Your wardrobe has strong coverage. No urgent purchases needed.")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .padding(.horizontal)
            } else {
                VStack(spacing: 12) {
                    ForEach(items) { item in
                        MissingItemCardView(
                            item: item,
                            defaultStyle: defaultStyle
                        )
                    }
                }
                .padding(.horizontal)
            }
        }
        .accessibilityIdentifier("insights.topMissingItems")
    }
}
