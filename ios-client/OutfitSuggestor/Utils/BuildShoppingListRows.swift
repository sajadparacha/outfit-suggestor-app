//
//  BuildShoppingListRows.swift
//  OutfitSuggestor
//
//  Derives shopping table rows from category health (web parity).
//

import Foundation

struct ShoppingListRow: Equatable {
    let categoryKey: String
    let category: String
    let style: String
    let color: String
    let key: String
}

enum BuildShoppingListRows {
    static let categoryOrder = [
        "shirt", "trouser", "blazer", "jacket", "shoes", "belt", "sweater",
    ]

    static let emptyCell = "—"

    private static let clothingCategoryIds = Set(categoryOrder)

    private static let categoryLabels: [String: String] = [
        "shirt": "Shirt",
        "trouser": "Pant",
        "blazer": "Jacket",
        "jacket": "Jacket",
        "shoes": "Shoes",
        "belt": "Belt",
        "sweater": "Sweater",
    ]

    static func build(from categoryHealth: [WardrobeInsightCategoryHealth]) -> [ShoppingListRow] {
        let byId = Dictionary(uniqueKeysWithValues: categoryHealth.map { ($0.id, $0) })

        return categoryOrder.compactMap { categoryKey -> ShoppingListRow? in
            guard clothingCategoryIds.contains(categoryKey),
                  let item = byId[categoryKey],
                  shouldIncludeRow(item)
            else { return nil }

            return buildRowForCategory(categoryKey: categoryKey, item: item)
        }
    }

    static func buildCsv(_ rows: [ShoppingListRow]) -> String {
        let header = "Category,Style,Color"
        let body = rows.map { row in
            [
                escapeCsv(row.category),
                escapeCsv(row.style == emptyCell ? "" : row.style),
                escapeCsv(row.color == emptyCell ? "" : row.color),
            ].joined(separator: ",")
        }
        return ([header] + body).joined(separator: "\n")
    }

    static func buildWhatsAppMessage(_ rows: [ShoppingListRow]) -> String {
        let bullets = rows.map { row -> String in
            let stylePart = row.style != emptyCell ? row.style : nil
            let colorPart = row.color != emptyCell ? row.color : nil

            let detail: String
            switch (stylePart, colorPart) {
            case let (style?, color?):
                detail = "\(style); \(color)"
            case let (style?, nil):
                detail = style
            case let (nil, color?):
                detail = color
            default:
                detail = emptyCell
            }

            return "• \(row.category) — \(detail)"
        }

        return (["Shopping list (wardrobe analysis)", ""] + bullets).joined(separator: "\n")
    }

    static func whatsAppURL(for rows: [ShoppingListRow]) -> URL? {
        let message = buildWhatsAppMessage(rows)
        guard var components = URLComponents(string: "https://wa.me/") else { return nil }
        components.queryItems = [URLQueryItem(name: "text", value: message)]
        return components.url
    }

    // MARK: - Private

    private static func buildRowForCategory(
        categoryKey: String,
        item: WardrobeInsightCategoryHealth
    ) -> ShoppingListRow {
        let category = categoryDisplayLabel(categoryKey)
        let style = item.missingStyles.isEmpty
            ? emptyCell
            : item.missingStyles.map(prettyLabel).joined(separator: ", ")
        let color = item.missingColors.isEmpty
            ? emptyCell
            : item.missingColors.map(prettyLabel).joined(separator: ", ")

        return ShoppingListRow(
            categoryKey: categoryKey,
            category: category,
            style: style,
            color: color,
            key: categoryKey
        )
    }

    private static func categoryDisplayLabel(_ categoryKey: String) -> String {
        categoryLabels[categoryKey] ?? prettyLabel(categoryKey)
    }

    private static func shouldIncludeRow(_ item: WardrobeInsightCategoryHealth) -> Bool {
        let hasMissingStyle = !item.missingStyles.isEmpty
        let hasMissingColor = !item.missingColors.isEmpty
        let isWeakOrMissing = item.status == .missing || item.status == .weak
        return hasMissingStyle || hasMissingColor || isWeakOrMissing
    }

    static func prettyLabel(_ value: String) -> String {
        value
            .split(whereSeparator: { $0 == "_" || $0.isWhitespace })
            .filter { !$0.isEmpty }
            .map { part in
                part.prefix(1).uppercased() + part.dropFirst().lowercased()
            }
            .joined(separator: " ")
    }

    private static func escapeCsv(_ value: String) -> String {
        if value.contains(",") || value.contains("\"") || value.contains("\n") {
            return "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
        }
        return value
    }
}
