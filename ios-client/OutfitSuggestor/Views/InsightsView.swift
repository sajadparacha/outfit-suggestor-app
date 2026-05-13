//
//  InsightsView.swift
//  OutfitSuggestor
//
//  Wardrobe Gap Analysis / Insights view
//  Analyzes what colors, styles, and items are missing from the user's wardrobe
//

import SwiftUI

struct InsightsView: View {
    @ObservedObject private var auth = AuthService.shared
    @State private var occasion = "casual"
    @State private var season = "all"
    @State private var style = "modern"
    @State private var textInput = ""
    @State private var analysisMode = "free"
    @State private var result: WardrobeGapAnalysisResponse?
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    private let occasions = ["casual", "business", "formal", "party", "date", "sports"]
    private let seasons = ["all", "spring", "summer", "fall", "winter"]
    private let styles = ["business casual", "casual", "modern", "classic", "trendy", "minimalist", "bold", "vintage"]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "chart.bar.xaxis")
                        .font(.largeTitle)
                        .foregroundColor(AppTheme.accent)
                    Text("Wardrobe Insights")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("Analyze your wardrobe to find gaps in colors, styles, and see what to buy next.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                
                // Filters
                VStack(spacing: 12) {
                    Picker("Occasion", selection: $occasion) {
                        ForEach(occasions, id: \.self) { Text($0.capitalized).tag($0) }
                    }
                    Picker("Season", selection: $season) {
                        ForEach(seasons, id: \.self) { Text($0.capitalized).tag($0) }
                    }
                    Picker("Style", selection: $style) {
                        ForEach(styles, id: \.self) { Text($0.capitalized).tag($0) }
                    }
                }
                .pickerStyle(.menu)
                .padding(.horizontal)
                
                TextField("Additional preferences (optional)", text: $textInput)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal)
                
                // Analysis mode
                Picker("Analysis Mode", selection: $analysisMode) {
                    Text("Free (Rules-based)").tag("free")
                    Text("Premium (ChatGPT)").tag("premium")
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                
                // Analyze button
                Button(action: { Task { await analyze() } }) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Label("Analyze My Wardrobe", systemImage: "sparkle.magnifyingglass")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(isLoading ? Color.gray : AppTheme.accent)
                .foregroundColor(.white)
                .cornerRadius(12)
                .padding(.horizontal)
                .disabled(isLoading)
                
                if let error = errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                        .padding(.horizontal)
                }
                
                // Results
                if let result = result {
                    GapAnalysisResultView(result: result, isAdmin: auth.currentUser?.is_admin == true)
                }
                
                Spacer(minLength: 50)
            }
            .padding(.vertical)
        }
        .navigationTitle("Insights")
        .navigationBarTitleDisplayMode(.large)
    }
    
    private func analyze() async {
        isLoading = true
        errorMessage = nil
        do {
            let request = WardrobeGapAnalysisRequest(
                occasion: occasion,
                season: season,
                style: style,
                text_input: textInput,
                analysis_mode: analysisMode
            )
            result = try await APIService.shared.analyzeWardrobeGaps(request: request)
        } catch let error as APIServiceError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Gap Analysis Result

struct GapAnalysisResultView: View {
    let result: WardrobeGapAnalysisResponse
    let isAdmin: Bool
    
    private let categoryOrder = ["shirt", "trouser", "blazer", "shoes", "belt"]
    
    private var orderedCategories: [String] {
        let fromResponse = Array(result.analysis_by_category.keys)
        let extras = fromResponse.filter { !categoryOrder.contains($0) }
        return (categoryOrder + extras).filter { result.analysis_by_category[$0] != nil }
    }
    
    var body: some View {
        VStack(spacing: 16) {
            // Context
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(result.occasion.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.teal.opacity(0.2))
                        .cornerRadius(8)
                    Text(result.season.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.indigo.opacity(0.2))
                        .cornerRadius(8)
                    Text(result.style.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.purple.opacity(0.2))
                        .cornerRadius(8)
                }
                
                if let mode = result.analysis_mode {
                    Text("Mode: \(mode.capitalized)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Text(result.overall_summary)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(AppTheme.border, lineWidth: 1)
            )
            .cornerRadius(12)
            .padding(.horizontal)

            if isAdmin, let cost = result.cost {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Analysis Cost")
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)
                    Text("ChatGPT: \(formatCost(cost.gpt4_cost ?? 0))")
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
                    Text("Total: \(formatCost(cost.total_cost ?? 0))")
                        .font(.headline)
                        .foregroundColor(AppTheme.accent)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(AppTheme.accentSoft)
                .cornerRadius(12)
                .padding(.horizontal)
            }

            if isAdmin {
                if let prompt = result.ai_prompt, !prompt.isEmpty {
                    AdminInsightsPanel(title: "Input Prompt", content: prompt)
                        .padding(.horizontal)
                }
                if let raw = result.ai_raw_response, !raw.isEmpty {
                    AdminInsightsPanel(title: "AI Response", content: raw)
                        .padding(.horizontal)
                }
            }
            
            // Per-category cards
            ForEach(orderedCategories, id: \.self) { category in
                if let entry = result.analysis_by_category[category] {
                    CategoryGapCard(entry: entry)
                        .padding(.horizontal)
                }
            }
        }
    }
}

struct CategoryGapCard: View {
    let entry: WardrobeCategoryGap
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(entry.category.capitalized)
                    .font(.headline)
            }
            
            if !entry.owned_colors.isEmpty {
                ChipSection(title: "Owned Colors", items: entry.owned_colors, color: .green)
            }
            if !entry.missing_colors.isEmpty {
                ChipSection(title: "Missing Colors", items: entry.missing_colors, color: .red)
            }
            if !entry.owned_styles.isEmpty {
                ChipSection(title: "Owned Styles", items: entry.owned_styles, color: .blue)
            }
            if !entry.missing_styles.isEmpty {
                ChipSection(title: "Missing Styles", items: entry.missing_styles, color: .orange)
            }
            if !entry.recommended_purchases.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Buy Next")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                    ForEach(entry.recommended_purchases, id: \.self) { rec in
                        HStack(alignment: .top) {
                            Text("•")
                            Text(rec)
                                .font(.subheadline)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
}

private struct AdminInsightsPanel: View {
    let title: String
    let content: String

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
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(AppTheme.border, lineWidth: 1)
            )
        }
        .padding()
        .background(AppTheme.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .cornerRadius(12)
    }
}

private func formatCost(_ value: Double) -> String {
    if value < 0.01 { return String(format: "$%.4f", value) }
    if value < 0.1 { return String(format: "$%.3f", value) }
    return String(format: "$%.2f", value)
}

struct ChipSection: View {
    let title: String
    let items: [String]
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            FlowLayout(spacing: 6) {
                ForEach(items, id: \.self) { item in
                    Text(item.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(color.opacity(0.15))
                        .foregroundColor(color)
                        .cornerRadius(8)
                }
            }
        }
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 6
    
    init(spacing: CGFloat = 6) {
        self.spacing = spacing
    }
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        return result.size
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        for (index, offset) in result.offsets.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + offset.x, y: bounds.minY + offset.y), proposal: .unspecified)
        }
    }
    
    private func computeLayout(proposal: ProposedViewSize, subviews: Subviews) -> (offsets: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var offsets: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var totalHeight: CGFloat = 0
        var totalWidth: CGFloat = 0
        
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth, currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            offsets.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
            totalWidth = max(totalWidth, currentX - spacing)
            totalHeight = max(totalHeight, currentY + lineHeight)
        }
        
        return (offsets, CGSize(width: totalWidth, height: totalHeight))
    }
}
