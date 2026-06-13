//
//  InsightsSharedViews.swift
//  OutfitSuggestor
//
//  Shared SwiftUI helpers for Wardrobe Insights components.
//

import SwiftUI

// MARK: - Shopping search

enum InsightsShoppingSearch {
    static func buildSearchURL(
        category: String,
        colors: [String],
        styles: [String],
        defaultStyle: String
    ) -> URL? {
        let stylePhrase = formatSearchList(styles.isEmpty ? [defaultStyle] : styles)
        let colorPhrase = formatSearchList(colors.isEmpty ? ["neutral"] : colors)
        let categoryPhrase = categoryForSearch(category)
        let query = "Show me men \(categoryPhrase) in \(stylePhrase) style and \(colorPhrase) color"

        var components = URLComponents(string: "https://www.google.com/search")
        components?.queryItems = [
            URLQueryItem(name: "tbm", value: "shop"),
            URLQueryItem(name: "q", value: query),
        ]
        return components?.url
    }

    static func open(
        category: String,
        colors: [String],
        styles: [String],
        defaultStyle: String,
        openURL: OpenURLAction
    ) {
        if let url = buildSearchURL(
            category: category,
            colors: colors,
            styles: styles,
            defaultStyle: defaultStyle
        ) {
            openURL(url)
        }
    }

    static func openColor(
        category: String,
        color: String,
        styles: [String] = [],
        defaultStyle: String,
        openURL: OpenURLAction
    ) {
        open(
            category: category,
            colors: [color],
            styles: styles,
            defaultStyle: defaultStyle,
            openURL: openURL
        )
    }

    private static func formatSearchList(_ items: [String]) -> String {
        let labels = items.map { $0.capitalized }
        guard !labels.isEmpty else { return "neutral" }
        if labels.count == 1 { return labels[0] }
        if labels.count == 2 { return "\(labels[0]) and \(labels[1])" }
        return "\(labels.dropLast().joined(separator: ", ")), and \(labels.last!)"
    }

    private static func categoryForSearch(_ rawCategory: String) -> String {
        let lower = rawCategory.lowercased()
        switch lower {
        case "shirt", "shirts": return "shirts"
        case "trouser", "trousers": return "trousers"
        case "shoe", "shoes": return "shoes"
        case "blazer", "blazers", "belt", "belts": return "\(lower.hasSuffix("s") ? lower : "\(lower)s")"
        default: return lower
        }
    }
}

func formatInsightsCost(_ value: Double) -> String {
    if value < 0.01 { return String(format: "$%.4f", value) }
    if value < 0.1 { return String(format: "$%.3f", value) }
    return String(format: "$%.2f", value)
}

// MARK: - Chip accessibility

enum InsightsChipAccessibility {
    static func colorSwatch(_ color: String) -> String {
        "insights.colorSwatch.\(color)"
    }

    static func styleChip(_ style: String) -> String {
        "insights.styleChip.\(style)"
    }
}

// MARK: - Color swatches

struct InsightsColorSwatchRow: View {
    var title: String? = nil
    let colors: [String]
    var category: String? = nil
    var defaultStyle: String? = nil
    var stylesToTry: [String]? = nil
    var emptyMessage: String? = nil
    @Environment(\.openURL) private var openURL

    private var isInteractive: Bool {
        category != nil && defaultStyle != nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let title {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
                    .textCase(.uppercase)
            }
            if colors.isEmpty {
                Text(emptyMessage ?? "Neutral tones recommended.")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            } else {
                InsightsFlowLayout(spacing: 6) {
                    ForEach(colors, id: \.self) { color in
                        if isInteractive, let category, let defaultStyle {
                            Button {
                                InsightsShoppingSearch.openColor(
                                    category: category,
                                    color: color,
                                    styles: stylesToTry ?? [],
                                    defaultStyle: defaultStyle,
                                    openURL: openURL
                                )
                            } label: {
                                colorChipLabel(color)
                            }
                            .buttonStyle(.plain)
                            .accessibilityIdentifier(InsightsChipAccessibility.colorSwatch(color))
                        } else {
                            colorChipLabel(color)
                                .accessibilityIdentifier(InsightsChipAccessibility.colorSwatch(color))
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func colorChipLabel(_ color: String) -> some View {
        HStack(spacing: 6) {
            Circle()
                .fill(Color(insightsHex: InsightsColorHex.value(for: color)))
                .frame(width: 12, height: 12)
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.35), lineWidth: InsightsColorHex.needsLightBorder(color) ? 1 : 0)
                )
            Text(color.capitalized)
                .font(.caption)
                .foregroundColor(AppTheme.textPrimary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.white.opacity(0.06))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.white.opacity(0.15), lineWidth: 1)
        )
    }
}

// MARK: - Style chips

struct InsightsStyleChipRow: View {
    var title: String? = nil
    let styles: [String]
    var emptyMessage: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let title {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
                    .textCase(.uppercase)
            }
            if styles.isEmpty {
                if let emptyMessage {
                    Text(emptyMessage)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
            } else {
                InsightsFlowLayout(spacing: 6) {
                    ForEach(styles, id: \.self) { style in
                        Text(style)
                            .font(.caption)
                            .foregroundColor(AppTheme.accent.opacity(0.9))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(AppTheme.accent.opacity(0.10))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(AppTheme.accent.opacity(0.25), lineWidth: 1)
                            )
                            .accessibilityIdentifier(InsightsChipAccessibility.styleChip(style))
                    }
                }
            }
        }
    }
}

enum InsightsColorHex {
    static func value(for color: String) -> String {
        let normalized = color.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let map: [String: String] = [
            "black": "#111827", "white": "#F8FAFC", "brown": "#8B5A2B", "tan": "#D2B48C",
            "beige": "#D6C6A8", "blue": "#2563EB", "navy": "#1E3A8A", "gray": "#6B7280",
            "grey": "#6B7280", "green": "#15803D", "olive": "#556B2F", "burgundy": "#7F1D1D",
            "red": "#B91C1C", "purple": "#6D28D9", "pink": "#DB2777", "yellow": "#CA8A04",
        ]
        return map[normalized] ?? "#334155"
    }

    static func needsLightBorder(_ color: String) -> Bool {
        let normalized = color.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return normalized == "white" || normalized == "beige" || normalized == "tan"
    }
}

extension Color {
    init(insightsHex: String) {
        let hex = insightsHex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 51, 65, 85)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}

struct InsightsFlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        computeLayout(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        for (index, offset) in result.offsets.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + offset.x, y: bounds.minY + offset.y),
                proposal: .unspecified
            )
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

struct InsightsSectionHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)
            Text(subtitle)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct InsightsSecondaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.accent)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(AppTheme.accentSoft)
                .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

struct InsightsPrimaryButton: View {
    let title: String
    let systemImage: String?
    let action: () -> Void

    init(_ title: String, systemImage: String? = nil, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Group {
                if let systemImage {
                    Label(title, systemImage: systemImage)
                } else {
                    Text(title)
                }
            }
            .font(.headline.weight(.semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(AppTheme.accentGradient)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

struct InsightsPriorityBadge: View {
    let priority: String

    private var tint: Color {
        switch priority.lowercased() {
        case "high": return Color(red: 0.94, green: 0.27, blue: 0.27)
        case "medium": return Color(red: 0.92, green: 0.70, blue: 0.03)
        default: return Color(red: 0.23, green: 0.51, blue: 0.96)
        }
    }

    var body: some View {
        Text(priority)
            .font(.caption.weight(.semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(tint.opacity(0.85))
            .cornerRadius(8)
    }
}

struct InsightsStatusBadge: View {
    let status: WardrobeCoverageStatus

    var body: some View {
        let rgb = WardrobeCoverageStatusStyle.color(for: status)
        Text(status.rawValue)
            .font(.caption.weight(.semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(red: rgb.red, green: rgb.green, blue: rgb.blue).opacity(0.9))
            .cornerRadius(8)
    }
}
