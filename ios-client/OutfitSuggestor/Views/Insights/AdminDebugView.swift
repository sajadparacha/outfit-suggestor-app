//
//  AdminDebugView.swift
//  OutfitSuggestor
//

import SwiftUI

struct AdminDebugView: View {
    let admin: WardrobeInsightAdminData?
    @State private var isExpanded = true

    var body: some View {
        VStack(spacing: 10) {
            Button(action: { isExpanded.toggle() }) {
                HStack(spacing: 10) {
                    Text(InsightsCopy.adminDiagnosticsTitle)
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                }
                .padding()
                .glassCard()
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("insights.adminDiagnostics")

            if isExpanded {
                Text(InsightsCopy.adminDiagnosticsSubtitle)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)

                if let cost = admin?.cost {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(InsightsCopy.analysisCostTitle)
                            .font(.headline)
                            .foregroundColor(AppTheme.textPrimary)
                        Text("ChatGPT: \(formatInsightsCost(cost.gpt4_cost ?? 0))")
                            .font(.subheadline)
                            .foregroundColor(AppTheme.textSecondary)
                        if let input = cost.input_tokens {
                            Text("Input tokens: \(input)")
                                .font(.caption)
                                .foregroundColor(AppTheme.textSecondary)
                        }
                        if let output = cost.output_tokens {
                            Text("Output tokens: \(output)")
                                .font(.caption)
                                .foregroundColor(AppTheme.textSecondary)
                        }
                        Text("Total: \(formatInsightsCost(cost.total_cost ?? 0))")
                            .font(.headline)
                            .foregroundColor(AppTheme.accent)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(AppTheme.accentSoft)
                    .cornerRadius(12)
                    .padding(.horizontal)
                    .accessibilityIdentifier("insights.analysisCost")
                } else {
                    adminPlaceholderCard(title: InsightsCopy.analysisCostTitle)
                }

                AdminInsightsTextPanel(
                    title: InsightsCopy.inputPromptTitle,
                    content: resolvedContent(admin?.aiPrompt),
                    accessibilityIdentifier: "insights.inputPrompt"
                )
                AdminInsightsTextPanel(
                    title: InsightsCopy.aiResponseTitle,
                    content: resolvedContent(admin?.aiRawResponse),
                    accessibilityIdentifier: "insights.aiResponse"
                )
            }
        }
        .accessibilityIdentifier("insights.adminDebug")
    }

    private func resolvedContent(_ value: String?) -> String {
        guard let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else {
            return InsightsCopy.adminUnavailablePlaceholder
        }
        return trimmed
    }

    private func adminPlaceholderCard(title: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)
            Text(InsightsCopy.adminUnavailablePlaceholder)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(AppTheme.accentSoft)
        .cornerRadius(12)
        .padding(.horizontal)
    }
}

private struct AdminInsightsTextPanel: View {
    let title: String
    let content: String
    var accessibilityIdentifier: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
            ScrollView(.vertical, showsIndicators: true) {
                Text(content)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundColor(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(minHeight: 90, maxHeight: 140)
            .padding(8)
            .background(Color.black.opacity(0.25))
            .cornerRadius(8)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.border, lineWidth: 1))
        }
        .padding()
        .glassCard()
        .padding(.horizontal)
        .accessibilityIdentifier(accessibilityIdentifier)
    }
}
