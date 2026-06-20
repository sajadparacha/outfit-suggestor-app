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

struct WardrobeInsightShoppingListRow: Identifiable, Equatable {
    let id: String
    let item: String
    let category: String
    let styles: [String]
    let colors: [String]
    let styleColorTuples: String
    let googleShoppingURL: URL?
}

enum WardrobeInsightShoppingList {
    static func buildRows(from result: WardrobeInsightResult) -> [WardrobeInsightShoppingListRow] {
        let missingRows = result.missingItems.map { missingItem in
            let styles = normalizedLabels(missingItem.worksWith, fallback: "Classic")
            let colors = normalizedLabels(missingItem.bestColors, fallback: "Neutral")
            let itemLabel = displayItemLabel(name: missingItem.name, category: missingItem.category)
            let tuples = formatTuples(styles: styles, colors: colors)

            return WardrobeInsightShoppingListRow(
                id: missingItem.id,
                item: itemLabel,
                category: displayCategoryLabel(missingItem.category),
                styles: styles,
                colors: colors,
                styleColorTuples: tuples,
                googleShoppingURL: googleShoppingURL(
                    item: itemLabel,
                    category: missingItem.category,
                    styles: styles,
                    colors: colors
                )
            )
        }

        if !missingRows.isEmpty {
            return missingRows
        }

        return result.topPriorities.map { priority in
            let styles = ["Classic"]
            let colors = ["Neutral"]
            let itemLabel = displayItemLabel(name: priority.name, category: priority.category)
            return WardrobeInsightShoppingListRow(
                id: priority.id,
                item: itemLabel,
                category: displayCategoryLabel(priority.category),
                styles: styles,
                colors: colors,
                styleColorTuples: formatTuples(styles: styles, colors: colors),
                googleShoppingURL: googleShoppingURL(
                    item: itemLabel,
                    category: priority.category,
                    styles: styles,
                    colors: colors
                )
            )
        }
    }

    static func formatTuples(styles: [String], colors: [String]) -> String {
        let normalizedStyles = normalizedLabels(styles, fallback: "Classic")
        let normalizedColors = normalizedLabels(colors, fallback: "Neutral")
        return normalizedStyles
            .flatMap { style in normalizedColors.map { color in "(\(style), \(color))" } }
            .joined(separator: ", ")
    }

    static func shareText(rows: [WardrobeInsightShoppingListRow], context: WardrobeInsightContext) -> String {
        var lines = [
            "Wardrobe Insights Shopping List",
            "Analyzed for \(context.occasion.capitalized) / \(context.season.capitalized) / \(context.style.capitalized)",
            "",
        ]

        if rows.isEmpty {
            lines.append(InsightsCopy.shoppingListEmptyMessage)
        } else {
            lines.append(contentsOf: rows.map { "\($0.item): \($0.styleColorTuples) - Google Shopping: \($0.googleShoppingURL?.absoluteString ?? "")" })
        }

        return lines.joined(separator: "\n")
    }

    static func whatsappURL(for text: String) -> URL? {
        var components = URLComponents(string: "whatsapp://send")
        components?.queryItems = [URLQueryItem(name: "text", value: text)]
        return components?.url
    }

    static func googleShoppingURL(item: String, category: String, styles: [String], colors: [String]) -> URL? {
        let tupleText = formatTuples(styles: styles, colors: colors)
        let query = "Show me men \(item) \(displayCategoryLabel(category)) \(tupleText)"
        var components = URLComponents(string: "https://www.google.com/search")
        components?.queryItems = [
            URLQueryItem(name: "tbm", value: "shop"),
            URLQueryItem(name: "q", value: query),
        ]
        return components?.url
    }

#if canImport(UIKit)
    static func pdfData(rows: [WardrobeInsightShoppingListRow], context: WardrobeInsightContext) -> Data {
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
            let headingAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 12),
                .foregroundColor: UIColor.darkGray,
            ]
            let bodyAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11),
                .foregroundColor: UIColor.black,
            ]

            y = draw("Wardrobe Insights Shopping List", at: y, margin: margin, width: bodyWidth, attributes: titleAttributes)
            y = draw(
                "Analyzed for \(context.occasion.capitalized) / \(context.season.capitalized) / \(context.style.capitalized)",
                at: y + 8,
                margin: margin,
                width: bodyWidth,
                attributes: bodyAttributes
            )
            y += 18
            let headerY = y
            let itemHeaderEnd = draw("Item", at: headerY, margin: margin, width: 140, attributes: headingAttributes)
            let tuplesHeaderEnd = draw("Style & color tuples", at: headerY, margin: margin + 150, width: 250, attributes: headingAttributes)
            let shoppingHeaderEnd = draw("Google Shopping", at: headerY, margin: margin + 410, width: 110, attributes: headingAttributes)
            y = max(itemHeaderEnd, tuplesHeaderEnd, shoppingHeaderEnd) + 8

            if rows.isEmpty {
                _ = draw(InsightsCopy.shoppingListEmptyMessage, at: y, margin: margin, width: bodyWidth, attributes: bodyAttributes)
            } else {
                for row in rows {
                    if y > pageBounds.height - 88 {
                        pdfContext.beginPage()
                        y = 44
                    }
                    let rowStart = y
                    let itemEnd = draw(row.item, at: rowStart, margin: margin, width: 140, attributes: bodyAttributes)
                    let tuplesEnd = draw(row.styleColorTuples, at: rowStart, margin: margin + 150, width: 250, attributes: bodyAttributes)
                    let linkEnd = draw(row.googleShoppingURL?.absoluteString ?? "", at: rowStart, margin: margin + 410, width: 110, attributes: bodyAttributes)
                    y = max(itemEnd, tuplesEnd, linkEnd) + 10
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
        let rect = CGRect(x: margin, y: y, width: width, height: CGFloat.greatestFiniteMagnitude)
        let bounding = text.boundingRect(
            with: CGSize(width: width, height: CGFloat.greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: attributes,
            context: nil
        )
        text.draw(in: CGRect(x: rect.minX, y: rect.minY, width: width, height: ceil(bounding.height)), withAttributes: attributes)
        return y + ceil(bounding.height)
    }
#endif

    private static func normalizedLabels(_ values: [String], fallback: String) -> [String] {
        let labels = values
            .map(prettyLabel)
            .filter { !$0.isEmpty }
        return labels.isEmpty ? [fallback] : labels
    }

    private static func displayItemLabel(name: String, category: String) -> String {
        let label = prettyLabel(name)
        return label.isEmpty ? displayCategoryLabel(category) : label
    }

    private static func displayCategoryLabel(_ category: String) -> String {
        switch category.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
        case "shirt", "shirts": return "Shirt"
        case "trouser", "trousers": return "Trouser"
        case "shoe", "shoes": return "Shoes"
        case "blazer", "blazers": return "Blazer"
        case "belt", "belts": return "Belt"
        default: return prettyLabel(category)
        }
    }

    private static func prettyLabel(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .components(separatedBy: CharacterSet(charactersIn: "_- "))
            .filter { !$0.isEmpty }
            .map { part in part.prefix(1).uppercased() + part.dropFirst().lowercased() }
            .joined(separator: " ")
    }
}
