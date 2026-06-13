//
//  WardrobeCoverageGridView.swift
//  OutfitSuggestor
//

import SwiftUI

struct WardrobeCoverageGridView: View {
    let categoryHealth: [WardrobeInsightCategoryHealth]
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private var columns: [GridItem] {
        let _ = horizontalSizeClass
        return Array(
            repeating: GridItem(.flexible(), spacing: 10),
            count: WardrobeInsightsLayout.coverageGridColumnCount
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            InsightsSectionHeader(
                title: InsightsCopy.coverageTitle,
                subtitle: InsightsCopy.coverageSubtitle
            )
            .padding(.horizontal)

            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(categoryHealth) { health in
                    CoverageStatusCardView(health: health)
                }
            }
            .padding(.horizontal)
        }
        .accessibilityIdentifier("insights.coverageGrid")
    }
}
