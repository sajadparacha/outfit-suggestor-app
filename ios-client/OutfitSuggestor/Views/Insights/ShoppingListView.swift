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

    private var rows: [WardrobeInsightShoppingListRow] {
        WardrobeInsightShoppingList.buildRows(from: result)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(InsightsCopy.shoppingListTitle)
                            .font(.title2.bold())
                            .foregroundColor(AppTheme.textPrimary)
                        Text("Analyzed for \(result.context.occasion.capitalized) / \(result.context.season.capitalized) / \(result.context.style.capitalized)")
                            .font(.subheadline)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

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
        .sheet(isPresented: $showingShareSheet) {
            ActivityShareSheet(items: shareItems)
        }
    }

    private var exportActions: some View {
        VStack(spacing: 10) {
            InsightsPrimaryButton(InsightsCopy.exportToWhatsAppButton, systemImage: "message.fill") {
                exportToWhatsApp()
            }
            .accessibilityIdentifier("insights.shoppingList.exportWhatsApp")

            InsightsSecondaryButton(title: InsightsCopy.exportAsPDFButton) {
                exportPDF()
            }
            .accessibilityIdentifier("insights.shoppingList.exportPDF")
        }
    }

    private var shoppingListHeader: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(InsightsCopy.shoppingListItemColumn)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(InsightsCopy.shoppingListTupleColumn)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(InsightsCopy.shoppingListGoogleColumn)
                .frame(width: 112, alignment: .leading)
        }
        .font(.caption.weight(.semibold))
        .foregroundColor(AppTheme.textSecondary)
        .textCase(.uppercase)
        .padding(.horizontal, 12)
        .accessibilityIdentifier("insights.shoppingList.header")
    }

    private func shoppingListRow(_ row: WardrobeInsightShoppingListRow) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(InsightsCopy.shoppingListItemColumn)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                    Text(row.item)
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: 4) {
                    Text(InsightsCopy.shoppingListTupleColumn)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                    Text(row.styleColorTuples)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textPrimary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button {
                if let url = row.googleShoppingURL {
                    openURL(url)
                }
            } label: {
                Label(InsightsCopy.shoppingListGoogleColumn, systemImage: "cart.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.accent)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("insights.shoppingList.google.\(row.id)")
        }
        .padding(12)
        .glassCard()
    }

    private func exportToWhatsApp() {
        exportError = nil
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

    private func exportPDF() {
        exportError = nil
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
