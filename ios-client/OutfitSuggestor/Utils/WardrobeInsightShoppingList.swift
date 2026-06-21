//
//  WardrobeInsightShoppingList.swift
//  OutfitSuggestor
//
//  Shopping-list row construction and export helpers for Wardrobe Insights.
//

import Foundation
#if canImport(UIKit)
import UIKit
#endif

struct ShoppingStyleColorTuple: Equatable {
    let style: String
    let color: String
}

struct ShoppingComboLink: Equatable {
    let label: String
    let url: URL?
}

struct WardrobeInsightShoppingListRow: Identifiable, Equatable {
    let id: String
    let item: String
    let category: String
    let priority: String
    let styles: [String]
    let colors: [String]
    let tuples: [ShoppingStyleColorTuple]
    let styleColorTuples: String
    let lookForText: String
    let comboLinks: [ShoppingComboLink]
    let searchAllURL: URL?
    let exportURL: URL?
}

enum WardrobeInsightShoppingList {
    static let shoppingListSearchAllLimit = 3

    static func buildRows(from result: WardrobeInsightResult) -> [WardrobeInsightShoppingListRow] {
        let missingRows = result.missingItems.map { missingItem in
            buildRow(
                id: missingItem.id,
                name: missingItem.name,
                category: missingItem.category,
                priority: missingItem.priority,
                styles: missingItem.worksWith,
                colors: missingItem.bestColors
            )
        }

        if !missingRows.isEmpty {
            return missingRows
        }

        return result.topPriorities.map { priority in
            buildRow(
                id: priority.id,
                name: priority.name,
                category: priority.category,
                priority: priority.priority,
                styles: [],
                colors: []
            )
        }
    }

    static func buildStyleColorTuples(styles: [String], colors: [String]) -> [ShoppingStyleColorTuple] {
        let normalizedStyles = uniquePrettyValues(styles, fallback: "Classic")
        let normalizedColors = uniquePrettyValues(colors, fallback: "Neutral")
        return normalizedStyles.flatMap { style in
            normalizedColors.map { color in
                ShoppingStyleColorTuple(style: style, color: color)
            }
        }
    }

    static func formatTuples(styles: [String], colors: [String]) -> String {
        formatStyleColorTuples(buildStyleColorTuples(styles: styles, colors: colors))
    }

    static func formatStyleColorTuples(_ tuples: [ShoppingStyleColorTuple]) -> String {
        tuples.map { "(\($0.style), \($0.color))" }.joined(separator: ", ")
    }

    static func cleanShoppingItemLabel(name: String, category: String) -> String {
        let categoryLabel = displayCategoryLabel(category)
        let words = prettyLabel(name).split(separator: " ").map(String.init)

        var deduped: [String] = []
        var seen = Set<String>()
        for word in words {
            let lower = word.lowercased()
            guard !seen.contains(lower) else { continue }
            seen.insert(lower)
            deduped.append(word)
        }

        let dedupedName = deduped.joined(separator: " ")
        if dedupedName.isEmpty { return categoryLabel }

        let nameLower = dedupedName.lowercased()
        let categoryLower = categoryLabel.lowercased()
        let categorySingular = categoryLower.hasSuffix("s") ? String(categoryLower.dropLast()) : categoryLower

        if nameLower == categoryLower || nameLower == categorySingular {
            return categoryLabel
        }

        let hadDuplicate = words.count != deduped.count
        if hadDuplicate {
            let nonCategoryWords = deduped.filter {
                let word = $0.lowercased()
                return word != categorySingular && word != categoryLower
            }
            if nonCategoryWords.count <= 1 {
                return categoryLabel
            }
        }

        return dedupedName
    }

    static func formatLookForText(styles: [String], colors: [String]) -> String {
        let normalizedStyles = normalizedLabels(styles, fallback: "Classic")
        let normalizedColors = normalizedLabels(colors, fallback: "Neutral")

        if normalizedStyles.count == 1 {
            let style = normalizedStyles[0].lowercased()
            let colorPhrase = formatOrList(normalizedColors.map { $0.lowercased() })
            return capitalizeFirst("\(style) \(colorPhrase)")
        }

        var phrases: [String] = []
        for (index, style) in normalizedStyles.enumerated() {
            let styleLower = style.lowercased()
            if index == 0 {
                let colorPhrase = formatOrList(normalizedColors.map { $0.lowercased() })
                phrases.append("\(colorPhrase) \(styleLower)")
            } else {
                let color = normalizedColors.first?.lowercased() ?? ""
                if color.isEmpty {
                    phrases.append(styleLower)
                } else {
                    phrases.append("\(styleLower) \(color) OK")
                }
            }
        }
        return capitalizeFirst(phrases.joined(separator: "; "))
    }

    static func buildShoppingSearchURL(category: String, styles: [String], colors: [String]) -> URL? {
        let stylePhrase = formatSearchList(styles.isEmpty ? ["classic"] : styles)
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

    static func comboSearchURL(category: String, style: String, color: String) -> URL? {
        buildShoppingSearchURL(category: category, styles: [style], colors: [color])
    }

    static func searchAllURL(category: String, itemLabel: String, tuples: [ShoppingStyleColorTuple]) -> URL? {
        let limited = Array(tuples.prefix(shoppingListSearchAllLimit))
        guard !limited.isEmpty else { return nil }

        let tupleQuery = limited.map { "\($0.style) \($0.color)" }.joined(separator: " ")
        let query = "Show me men \(categoryForSearch(category)) \(itemLabel) \(tupleQuery)"
            .trimmingCharacters(in: .whitespacesAndNewlines)

        var components = URLComponents(string: "https://www.google.com/search")
        components?.queryItems = [
            URLQueryItem(name: "tbm", value: "shop"),
            URLQueryItem(name: "q", value: query),
        ]
        return components?.url
    }

    static func shareText(
        rows: [WardrobeInsightShoppingListRow],
        context: WardrobeInsightContext,
        checklist: [String: ShoppingListChecklistEntry] = [:]
    ) -> String {
        var lines = [
            "🛍 ClosIQ Shopping List",
            "For: \(formatContextLine(context))",
            "",
        ]

        if rows.isEmpty {
            lines.append(InsightsCopy.shoppingListEmptyMessage)
        } else {
            for (index, row) in rows.enumerated() {
                let bought = checklist[row.id]?.isBought == true
                let checkbox = bought ? "☑" : "☐"
                lines.append("\(index + 1). \(checkbox) \(row.item) (\(row.priority))")
                lines.append("   → \(row.lookForText)")
                if let notes = checklist[row.id]?.notes.trimmingCharacters(in: .whitespacesAndNewlines),
                   !notes.isEmpty {
                    lines.append("   📝 \(notes)")
                }
                if let url = row.exportURL?.absoluteString {
                    lines.append("   🔗 \(url)")
                }
                lines.append("")
            }
        }

        return lines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func whatsappURL(for text: String) -> URL? {
        var components = URLComponents(string: "whatsapp://send")
        components?.queryItems = [URLQueryItem(name: "text", value: text)]
        return components?.url
    }

#if canImport(UIKit)
    static func pdfData(
        rows: [WardrobeInsightShoppingListRow],
        context: WardrobeInsightContext,
        checklist: [String: ShoppingListChecklistEntry] = [:]
    ) -> Data {
        let pageBounds = CGRect(x: 0, y: 0, width: 612, height: 792)
        let renderer = UIGraphicsPDFRenderer(bounds: pageBounds)

        return renderer.pdfData { pdfContext in
            pdfContext.beginPage()
            var y: CGFloat = 44
            let margin: CGFloat = 44
            let bodyWidth = pageBounds.width - (margin * 2)
            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 24),
                .foregroundColor: UIColor.black,
            ]
            let subtitleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12),
                .foregroundColor: UIColor.darkGray,
            ]
            let bodyAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11),
                .foregroundColor: UIColor.black,
            ]

            y = draw("🛍 ClosIQ Shopping List", at: y, margin: margin, width: bodyWidth, attributes: titleAttributes)
            y = draw(
                "For: \(formatContextLine(context))",
                at: y + 8,
                margin: margin,
                width: bodyWidth,
                attributes: subtitleAttributes
            )
            y += 18

            if rows.isEmpty {
                _ = draw(InsightsCopy.shoppingListEmptyMessage, at: y, margin: margin, width: bodyWidth, attributes: bodyAttributes)
            } else {
                for (index, row) in rows.enumerated() {
                    if y > pageBounds.height - 120 {
                        pdfContext.beginPage()
                        y = 44
                    }

                    let bought = checklist[row.id]?.isBought == true
                    let checkbox = bought ? "☑" : "☐"
                    y = draw(
                        "\(index + 1). \(checkbox) \(row.item) (\(row.priority))",
                        at: y,
                        margin: margin,
                        width: bodyWidth,
                        attributes: bodyAttributes
                    )
                    y = draw(
                        "   → \(row.lookForText)",
                        at: y + 4,
                        margin: margin,
                        width: bodyWidth,
                        attributes: bodyAttributes
                    )

                    if let notes = checklist[row.id]?.notes.trimmingCharacters(in: .whitespacesAndNewlines),
                       !notes.isEmpty {
                        y = draw(
                            "   Notes: \(notes)",
                            at: y + 4,
                            margin: margin,
                            width: bodyWidth,
                            attributes: bodyAttributes
                        )
                    }

                    if let url = row.exportURL?.absoluteString {
                        y = draw(
                            "   🔗 \(url)",
                            at: y + 4,
                            margin: margin,
                            width: bodyWidth,
                            attributes: bodyAttributes
                        )
                    }

                    y += 12
                }
            }
        }
    }

    private static func draw(
        _ text: String,
        at y: CGFloat,
        margin: CGFloat,
        width: CGFloat,
        attributes: [NSAttributedString.Key: Any]
    ) -> CGFloat {
        let bounding = text.boundingRect(
            with: CGSize(width: width, height: CGFloat.greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: attributes,
            context: nil
        )
        text.draw(
            in: CGRect(x: margin, y: y, width: width, height: ceil(bounding.height)),
            withAttributes: attributes
        )
        return y + ceil(bounding.height)
    }
#endif

    private static func buildRow(
        id: String,
        name: String,
        category: String,
        priority: String,
        styles: [String],
        colors: [String]
    ) -> WardrobeInsightShoppingListRow {
        let normalizedStyles = normalizedLabels(styles, fallback: "Classic")
        let normalizedColors = normalizedLabels(colors, fallback: "Neutral")
        let itemLabel = cleanShoppingItemLabel(name: name, category: category)
        let tuples = buildStyleColorTuples(styles: styles, colors: colors)
        let comboLinks = tuples.map { tuple in
            ShoppingComboLink(
                label: "\(tuple.style) · \(tuple.color)",
                url: comboSearchURL(category: category, style: tuple.style, color: tuple.color)
            )
        }
        let searchAll = searchAllURL(category: category, itemLabel: itemLabel, tuples: tuples)
        let exportURL = searchAll ?? comboLinks.first?.url

        return WardrobeInsightShoppingListRow(
            id: id,
            item: itemLabel,
            category: displayCategoryLabel(category),
            priority: prettyLabel(priority),
            styles: normalizedStyles,
            colors: normalizedColors,
            tuples: tuples,
            styleColorTuples: formatStyleColorTuples(tuples),
            lookForText: formatLookForText(styles: styles, colors: colors),
            comboLinks: comboLinks,
            searchAllURL: searchAll,
            exportURL: exportURL
        )
    }

    private static func formatContextLine(_ context: WardrobeInsightContext) -> String {
        [
            prettyLabel(context.occasion),
            prettyLabel(context.season),
            prettyLabel(context.style),
        ].joined(separator: " · ")
    }

    private static func formatOrList(_ items: [String]) -> String {
        guard !items.isEmpty else { return "neutral" }
        if items.count == 1 { return items[0] }
        if items.count == 2 { return "\(items[0]) or \(items[1])" }
        return "\(items.dropLast().joined(separator: ", ")), or \(items.last!)"
    }

    private static func formatSearchList(_ items: [String]) -> String {
        let labels = items.map { prettyLabel($0) }.filter { !$0.isEmpty }
        guard !labels.isEmpty else { return "Neutral" }
        if labels.count == 1 { return labels[0] }
        if labels.count == 2 { return "\(labels[0]) and \(labels[1])" }
        return "\(labels.dropLast().joined(separator: ", ")), and \(labels.last!)"
    }

    private static func capitalizeFirst(_ text: String) -> String {
        guard let first = text.first else { return text }
        return first.uppercased() + text.dropFirst()
    }

    private static func uniquePrettyValues(_ values: [String], fallback: String) -> [String] {
        var seen = Set<String>()
        var normalized: [String] = []

        for value in values {
            let label = prettyLabel(value.trimmingCharacters(in: .whitespacesAndNewlines))
            let key = label.lowercased()
            if !label.isEmpty, !seen.contains(key) {
                seen.insert(key)
                normalized.append(label)
            }
        }

        return normalized.isEmpty ? [prettyLabel(fallback)] : normalized
    }

    private static func normalizedLabels(_ values: [String], fallback: String) -> [String] {
        uniquePrettyValues(values, fallback: fallback)
    }

    private static func categoryForSearch(_ rawCategory: String) -> String {
        let lower = rawCategory.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch lower {
        case "shirt", "shirts": return "shirts"
        case "trouser", "trousers": return "trousers"
        case "shoe", "shoes": return "shoes"
        case "blazer", "blazers": return "blazers"
        case "belt", "belts": return "belts"
        default: return lower
        }
    }

    private static func displayCategoryLabel(_ category: String) -> String {
        switch category.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
        case "shirt", "shirts": return "Shirt"
        case "trouser", "trousers": return "Trousers"
        case "shoe", "shoes": return "Shoes"
        case "blazer", "blazers": return "Blazer"
        case "belt", "belts": return "Belt"
        default: return prettyLabel(category)
        }
    }

    static func prettyLabel(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .components(separatedBy: CharacterSet(charactersIn: "_- "))
            .filter { !$0.isEmpty }
            .map { part in part.prefix(1).uppercased() + part.dropFirst().lowercased() }
            .joined(separator: " ")
    }
}
