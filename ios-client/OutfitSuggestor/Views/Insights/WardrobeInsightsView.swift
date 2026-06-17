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
    @State private var showShoppingList = false

    var body: some View {
        VStack(spacing: 24) {
            InsightSummaryCardView(
                score: result.score,
                topPriorities: result.topPriorities,
                showShoppingList: showShoppingList,
                onViewShoppingList: { showShoppingList.toggle() }
            )

            if WardrobeInsightsPresentation.shouldShowShoppingListTable(showShoppingList: showShoppingList) {
                ShoppingListTableView(categoryHealth: result.categoryHealth)
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
        .accessibilityIdentifier("insights.results")
    }
}
