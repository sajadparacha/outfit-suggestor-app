//
//  ShoppingListTableView.swift
//  OutfitSuggestor
//

import SwiftUI

struct ShoppingListTableView: View {
    let categoryHealth: [WardrobeInsightCategoryHealth]
    @Environment(\.openURL) private var openURL

    private var rows: [ShoppingListRow] {
        BuildShoppingListRows.build(from: categoryHealth)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(InsightsCopy.shoppingListTitle)
                    .font(.headline)
                    .foregroundColor(AppTheme.textPrimary)
                Text(InsightsCopy.shoppingListIntro)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
            }
            .padding(.horizontal)

            if rows.isEmpty {
                Text(InsightsCopy.shoppingListEmptyMessage)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .glassCard()
                    .padding(.horizontal)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    shoppingTable
                        .padding(.horizontal)
                }

                HStack(spacing: 12) {
                    ShareLink(item: BuildShoppingListRows.buildCsv(rows)) {
                        Text(InsightsCopy.exportCsvButton)
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(AppTheme.textPrimary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(AppTheme.surface)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(AppTheme.border, lineWidth: 1)
                            )
                    }
                    .accessibilityIdentifier("shopping.list.exportCsv")

                    InsightsPrimaryButton(
                        InsightsCopy.sendWhatsAppButton,
                        systemImage: "message.fill"
                    ) {
                        if let url = BuildShoppingListRows.whatsAppURL(for: rows) {
                            openURL(url)
                        }
                    }
                    .accessibilityIdentifier("shopping.list.sendWhatsApp")
                }
                .padding(.horizontal)
            }
        }
        .accessibilityIdentifier("shopping.list.table")
    }

    private var shoppingTable: some View {
        VStack(spacing: 0) {
            tableHeader
            ForEach(rows, id: \.key) { row in
                tableRow(row)
            }
        }
        .background(AppTheme.bgSecondary.opacity(0.6))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(AppTheme.border, lineWidth: 1)
        )
    }

    private var tableHeader: some View {
        HStack(spacing: 0) {
            headerCell(InsightsCopy.shoppingListColumnCategory, width: 100)
            headerCell(InsightsCopy.shoppingListColumnStyle, width: 120)
            headerCell(InsightsCopy.shoppingListColumnColor, width: 100)
        }
        .background(Color.white.opacity(0.03))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(AppTheme.border)
                .frame(height: 1)
        }
    }

    private func headerCell(_ title: String, width: CGFloat) -> some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundColor(AppTheme.textSecondary)
            .frame(width: width, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
    }

    private func tableRow(_ row: ShoppingListRow) -> some View {
        HStack(spacing: 0) {
            bodyCell(row.category, width: 100, primary: true)
            bodyCell(row.style, width: 120, primary: false)
            bodyCell(row.color, width: 100, primary: false)
        }
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(AppTheme.border)
                .frame(height: 1)
        }
        .accessibilityIdentifier("shopping.list.row.\(row.categoryKey)")
    }

    private func bodyCell(_ text: String, width: CGFloat, primary: Bool) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundColor(primary ? AppTheme.textPrimary : AppTheme.textSecondary)
            .frame(width: width, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
    }
}
