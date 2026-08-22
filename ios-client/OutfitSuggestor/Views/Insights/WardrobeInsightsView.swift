//
//  WardrobeInsightsView.swift
//  OutfitSuggestor
//
//  Redesigned insights result layout (post-analysis).
//

import SwiftUI

struct WardrobeInsightsView: View {
    let result: WardrobeInsightResult
    let isAdmin: Bool
    @State private var showingShoppingList = false

    var body: some View {
        VStack(spacing: 24) {
            Text("Insights results")
                .font(.caption2)
                .foregroundStyle(.clear)
                .frame(height: 1)
                .accessibilityIdentifier("insights.results")
                .accessibilityLabel("Insights results")
                .accessibilityAddTraits(.isHeader)

            InsightSummaryCardView(
                score: result.score,
                topPriorities: result.topPriorities
            )

            if WardrobeInsightsPresentation.shouldShowShoppingListAction(hasResult: true) {
                InsightsSecondaryButton(title: InsightsCopy.shoppingListButton) {
                    showingShoppingList = true
                }
                .padding(.horizontal)
                .accessibilityIdentifier("insights.shoppingListButton")
            }

            TopMissingItemsView(
                items: result.missingItems,
                defaultStyle: result.context.style
            )

            WardrobeCoverageGridView(categoryHealth: result.categoryHealth)

            CategoryDetailAccordionView(
                categories: result.categoryHealth,
                defaultStyle: result.context.style
            )

            QuickTipCardView(isAdmin: isAdmin)

            if WardrobeInsightsPresentation.shouldShowAdminDebug(isAdmin: isAdmin) {
                AdminDebugView(admin: result.admin)
            }
        }
        .sheet(isPresented: $showingShoppingList) {
            ShoppingListView(result: result) {
                showingShoppingList = false
            }
        }
    }
}
