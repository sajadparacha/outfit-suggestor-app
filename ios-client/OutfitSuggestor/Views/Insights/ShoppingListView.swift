//
//  ShoppingListView.swift
//  OutfitSuggestor
//
//  Wardrobe Insights shopping-list sheet.
//

import SwiftUI
import UIKit

struct ShoppingListView: View {
    let result: WardrobeInsightResult
    let onClose: () -> Void

    @Environment(\.openURL) private var openURL
    @State private var shareItems: [Any] = []
    @State private var showingShareSheet = false
    @State private var exportError: String?
    @State private var copyConfirmation: String?
    @State private var expandedRowIds: Set<String> = []

    private var rows: [WardrobeInsightShoppingListRow] {
        WardrobeInsightShoppingList.buildRows(from: result)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    headerSection

                    if let exportError {
                        Text(exportError)
                            .font(.subheadline)
                            .foregroundColor(.red)
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.10))
                            .cornerRadius(10)
                            .accessibilityIdentifier("insights.shoppingList.error")
                    }

                    if let copyConfirmation {
                        Text(copyConfirmation)
                            .font(.subheadline)
                            .foregroundColor(AppTheme.textSecondary)
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(AppTheme.accent.opacity(0.12))
                            .cornerRadius(10)
                            .accessibilityIdentifier("insights.shoppingList.copyConfirmation")
                    }

                    exportActions

                    if rows.isEmpty {
                        Text(InsightsCopy.shoppingListEmptyMessage)
                            .font(.subheadline)
                            .foregroundColor(AppTheme.textSecondary)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .glassCard()
                            .accessibilityIdentifier("insights.shoppingList.empty")
                    } else {
                        VStack(spacing: 10) {
                            shoppingListHeader
                            ForEach(rows) { row in
                                shoppingListRow(row)
                            }
                        }
                        .accessibilityIdentifier("insights.shoppingList.rows")
                    }
                }
                .padding()
                .adaptiveContent()
            }
            .background(AppTheme.bgPrimary)
            .navigationTitle(InsightsCopy.shoppingListTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close", action: onClose)
                }
            }
        }
        .accessibilityIdentifier("insights.shoppingList")
        .sheet(isPresented: $showingShareSheet) {
            ActivityShareSheet(items: shareItems)
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(InsightsCopy.shoppingListTitle)
                .font(.title2.bold())
                .foregroundColor(AppTheme.textPrimary)
            Text("Analyzed for \(WardrobeInsightShoppingList.prettyLabel(result.context.occasion)) · \(WardrobeInsightShoppingList.prettyLabel(result.context.season)) · \(WardrobeInsightShoppingList.prettyLabel(result.context.style))")
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var exportActions: some View {
        VStack(spacing: 10) {
            InsightsPrimaryButton(InsightsCopy.exportToWhatsAppButton, systemImage: "message.fill") {
                exportToWhatsApp()
            }
            .accessibilityIdentifier("insights.shoppingList.exportWhatsApp")

            InsightsSecondaryButton(title: InsightsCopy.copyListButton) {
                copyList()
            }
            .accessibilityIdentifier("insights.shoppingList.copyList")

            InsightsSecondaryButton(title: InsightsCopy.exportAsPDFButton) {
                exportPDF()
            }
            .accessibilityIdentifier("insights.shoppingList.exportPDF")
        }
    }

    private var shoppingListHeader: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(InsightsCopy.shoppingListBuyColumn)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(InsightsCopy.shoppingListLookForColumn)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(InsightsCopy.shoppingListSearchOnlineColumn)
                .frame(width: 112, alignment: .leading)
        }
        .font(.caption.weight(.semibold))
        .foregroundColor(AppTheme.textSecondary)
        .textCase(.uppercase)
        .padding(.horizontal, 12)
        .accessibilityIdentifier("insights.shoppingList.header")
    }

    private func shoppingListRow(_ row: WardrobeInsightShoppingListRow) -> some View {
        HStack(alignment: .top, spacing: 12) {
            buyColumn(row)
            lookForColumn(row)
            searchOnlineColumn(row)
        }
        .padding(12)
        .glassCard()
        .accessibilityIdentifier("insights.shoppingList.row.\(row.id)")
    }

    private func buyColumn(_ row: WardrobeInsightShoppingListRow) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(InsightsCopy.shoppingListBuyColumn)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
            Text(row.item)
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)
            InsightsPriorityBadge(priority: row.priority)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func lookForColumn(_ row: WardrobeInsightShoppingListRow) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(InsightsCopy.shoppingListLookForColumn)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
            Text(row.lookForText)
                .font(.subheadline)
                .foregroundColor(AppTheme.textPrimary)
                .accessibilityIdentifier("insights.shoppingList.lookFor.\(row.id)")

            if row.tuples.count > 1 {
                Button {
                    toggleExpanded(row.id)
                } label: {
                    Text(
                        expandedRowIds.contains(row.id)
                            ? InsightsCopy.hideOptionsButton
                            : InsightsCopy.seeAllOptionsButton
                    )
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.accent)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("insights.shoppingList.toggleOptions.\(row.id)")

                if expandedRowIds.contains(row.id) {
                    Text(row.styleColorTuples)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .accessibilityIdentifier("insights.shoppingList.tuples.\(row.id)")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func searchOnlineColumn(_ row: WardrobeInsightShoppingListRow) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(InsightsCopy.shoppingListSearchOnlineColumn)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)

            ForEach(Array(row.comboLinks.enumerated()), id: \.offset) { index, combo in
                Button {
                    if let url = combo.url {
                        openURL(url)
                    }
                } label: {
                    Text(combo.label)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.accent)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppTheme.accent.opacity(0.12))
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("insights.shoppingList.combo.\(row.id).\(index)")
            }

            if row.searchAllURL != nil {
                Button {
                    if let url = row.searchAllURL {
                        openURL(url)
                    }
                } label: {
                    Text(InsightsCopy.shoppingListSearchAllButton)
                        .font(.caption.weight(.bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppTheme.accent)
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("insights.shoppingList.searchAll.\(row.id)")
            }
        }
        .frame(width: 112, alignment: .leading)
    }

    private func toggleExpanded(_ rowId: String) {
        if expandedRowIds.contains(rowId) {
            expandedRowIds.remove(rowId)
        } else {
            expandedRowIds.insert(rowId)
        }
    }

    private func exportToWhatsApp() {
        exportError = nil
        copyConfirmation = nil
        let text = WardrobeInsightShoppingList.shareText(rows: rows, context: result.context)
        if let whatsappURL = WardrobeInsightShoppingList.whatsappURL(for: text) {
            openURL(whatsappURL) { accepted in
                if !accepted {
                    presentShareSheet(items: [text])
                }
            }
        } else {
            presentShareSheet(items: [text])
        }
    }

    private func copyList() {
        exportError = nil
        let text = WardrobeInsightShoppingList.shareText(rows: rows, context: result.context)
        UIPasteboard.general.string = text
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        copyConfirmation = InsightsCopy.copiedToClipboardMessage
    }

    private func exportPDF() {
        exportError = nil
        copyConfirmation = nil
        let data = WardrobeInsightShoppingList.pdfData(rows: rows, context: result.context)
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("wardrobe-insights-shopping-list")
            .appendingPathExtension("pdf")

        do {
            try data.write(to: url, options: .atomic)
            presentShareSheet(items: [url])
        } catch {
            exportError = InsightsCopy.shoppingListExportErrorMessage
        }
    }

    private func presentShareSheet(items: [Any]) {
        guard !items.isEmpty else {
            exportError = InsightsCopy.shoppingListExportErrorMessage
            return
        }
        shareItems = items
        showingShareSheet = true
    }
}

struct ActivityShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
