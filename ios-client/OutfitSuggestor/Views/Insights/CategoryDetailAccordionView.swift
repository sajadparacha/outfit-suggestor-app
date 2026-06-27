//
//  CategoryDetailAccordionView.swift
//  OutfitSuggestor
//

import SwiftUI

struct CategoryDetailAccordionView: View {
    let categories: [WardrobeInsightCategoryHealth]
    let defaultStyle: String
    @State private var expandedIds: Set<String> = WardrobeInsightsAccordionLogic.initialExpandedIds

    private static func isClothingCategory(_ categoryId: String) -> Bool {
        categoryId != "colors" && categoryId != "styles"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            InsightsSectionHeader(
                title: InsightsCopy.categoryDetailsTitle,
                subtitle: InsightsCopy.categoryDetailsSubtitle
            )
            .padding(.horizontal)

            VStack(spacing: 8) {
                ForEach(categories) { category in
                    DisclosureGroup(
                        isExpanded: Binding(
                            get: { expandedIds.contains(category.id) },
                            set: { isExpanded in
                                if isExpanded {
                                    expandedIds.insert(category.id)
                                } else {
                                    expandedIds.remove(category.id)
                                }
                            }
                        )
                    ) {
                        expandedContent(for: category)
                            .padding(.top, 8)
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: WardrobeCategoryIcon.symbolName(for: category.id))
                                .foregroundColor(AppTheme.accent)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(category.category)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundColor(AppTheme.textPrimary)
                                Text(category.summary)
                                    .font(.caption)
                                    .foregroundColor(AppTheme.textSecondary)
                                    .lineLimit(1)
                            }
                            Spacer()
                            InsightsStatusBadge(status: category.status)
                        }
                    }
                    .padding(12)
                    .glassCard()
                    .accessibilityIdentifier("insights.categoryAccordion.\(category.id)")
                }
            }
            .padding(.horizontal)
        }
        .accessibilityIdentifier("insights.categoryDetails")
    }

    @ViewBuilder
    private func expandedContent(for category: WardrobeInsightCategoryHealth) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(category.details)
                .font(.subheadline)
                .foregroundColor(AppTheme.textPrimary)
                .accessibilityIdentifier("insights.categoryDetails.summary.\(category.id)")

            if Self.isClothingCategory(category.id) || category.id == "colors" {
                if Self.isClothingCategory(category.id) || !category.ownedColors.isEmpty {
                    InsightsColorSwatchRow(
                        title: InsightsCopy.ownedColorsLabel,
                        colors: category.ownedColors,
                        emptyMessage: InsightsCopy.noOwnedColorsMessage
                    )
                }
                InsightsColorSwatchRow(
                    title: InsightsCopy.missingColorsLabel,
                    colors: category.missingColors,
                    category: missingColorSearchCategory(for: category),
                    defaultStyle: defaultStyle,
                    stylesToTry: category.missingStyles,
                    emptyMessage: InsightsCopy.noMissingColorsMessage
                )
            }

            if Self.isClothingCategory(category.id) || category.id == "styles" {
                if Self.isClothingCategory(category.id) || !category.ownedStyles.isEmpty {
                    InsightsStyleChipRow(
                        title: InsightsCopy.ownedStylesLabel,
                        styles: category.ownedStyles,
                        emptyMessage: InsightsCopy.noOwnedStylesMessage
                    )
                }
                InsightsStyleChipRow(
                    title: InsightsCopy.missingStylesLabel,
                    styles: category.missingStyles,
                    emptyMessage: InsightsCopy.noMissingStylesMessage
                )
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(InsightsCopy.recommendedNextStepLabel)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
                    .textCase(.uppercase)
                Text(category.recommendedStep)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textPrimary)
            }
        }
    }

    private func missingColorSearchCategory(for category: WardrobeInsightCategoryHealth) -> String? {
        guard !category.missingColors.isEmpty else { return nil }
        if Self.isClothingCategory(category.id) {
            return category.id
        }
        if category.id == "colors" {
            return "shirt"
        }
        return nil
    }
}
