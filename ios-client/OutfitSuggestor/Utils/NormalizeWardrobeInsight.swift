//
//  NormalizeWardrobeInsight.swift
//  OutfitSuggestor
//
//  Maps WardrobeGapAnalysisResponse → WardrobeInsightResult (web parity).
//

import Foundation

enum NormalizeWardrobeInsight {
    private static let categoryOrder = ["shirt", "trouser", "shoes", "blazer", "belt"]
    private static let displayNames: [String: String] = [
        "shirt": "Shirts",
        "trouser": "Trousers",
        "shoes": "Shoes",
        "blazer": "Blazers",
        "belt": "Belts",
        "colors": "Colors",
        "styles": "Styles",
    ]
    private static let neutralColors: Set<String> = [
        "black", "white", "navy", "gray", "grey", "beige", "tan", "brown", "charcoal", "cream",
    ]
    private static let formalStyles: Set<String> = [
        "formal", "business", "smart", "tailored", "classic", "professional",
    ]
    /// Mirrors backend `WardrobeService.STYLE_LIBRARY` — category-scoped style allowlist.
    private static let categoryStyleLibrary: [String: [String]] = [
        "shirt": ["oxford", "linen", "textured", "smart casual", "overshirt"],
        "trouser": ["chino", "slim-fit", "relaxed-fit", "tailored", "straight-leg"],
        "blazer": ["unstructured", "lightweight", "casual blazer", "linen blazer", "soft shoulder"],
        "shoes": ["loafers", "clean sneakers", "derby shoes", "driving shoes", "minimal leather sneakers"],
        "belt": ["leather", "braided", "reversible", "formal leather", "casual leather"],
    ]

    static func filterStyles(for category: String, styles: [String]) -> [String] {
        let allowed = Set(
            (categoryStyleLibrary[category] ?? [])
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
                .filter { !$0.isEmpty }
        )
        if allowed.isEmpty { return styles }

        var seen = Set<String>()
        var filtered: [String] = []
        for styleTag in styles {
            let tag = styleTag.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            guard !tag.isEmpty, allowed.contains(tag), !seen.contains(tag) else { continue }
            seen.insert(tag)
            filtered.append(styleTag)
        }
        return filtered
    }

    static func normalize(_ response: WardrobeGapAnalysisResponse) -> WardrobeInsightResult {
        let orderedKeys = orderedCategories(from: response)
        let scoreValue = computeScore(response: response, orderedKeys: orderedKeys)
        let summary = response.summaryText?.nonEmpty ?? response.overall_summary
        let priorities = buildTopPriorities(response: response, orderedKeys: orderedKeys)
        let missingItems = buildMissingItems(response: response, orderedKeys: orderedKeys)
        let categoryHealth = buildCategoryHealth(response: response, orderedKeys: orderedKeys)
        let diagnostics = WardrobeInsightDiagnostics(
            missingCategories: orderedKeys.compactMap { key in
                guard response.analysis_by_category[key]?.item_count == 0 else { return nil }
                return displayNames[key] ?? key.capitalized
            },
            colorsToAdd: uniqueMissingColors(response: response, orderedKeys: orderedKeys),
            stylesToTry: uniqueMissingStyles(response: response, orderedKeys: orderedKeys)
        )

        return WardrobeInsightResult(
            context: WardrobeInsightContext(
                occasion: response.occasion,
                season: response.season,
                style: response.style
            ),
            score: WardrobeInsightScore(
                value: scoreValue,
                label: scoreLabel(for: scoreValue),
                summary: summary
            ),
            topPriorities: Array(priorities.prefix(3)),
            missingItems: missingItems,
            categoryHealth: categoryHealth,
            diagnostics: diagnostics,
            admin: WardrobeInsightAdminData(
                aiPrompt: response.ai_prompt,
                aiRawResponse: response.ai_raw_response,
                cost: response.cost
            )
        )
    }

    static func scoreLabel(for value: Int) -> WardrobeScoreLabel {
        switch value {
        case ..<40: return .weak
        case 40..<60: return .fair
        case 60..<80: return .good
        default: return .strong
        }
    }

    // MARK: - Score

    private static func computeScore(response: WardrobeGapAnalysisResponse, orderedKeys: [String]) -> Int {
        var score = 100
        for key in categoryOrder {
            guard let entry = response.analysis_by_category[key] else {
                score -= 12
                continue
            }
            if entry.item_count == 0 {
                score -= 15
            } else {
                score -= min(entry.missing_colors.count * 3, 12)
                score -= min(entry.missing_styles.count * 3, 10)
            }
        }
        let colorPenalty = min(uniqueMissingColors(response: response, orderedKeys: orderedKeys).count, 8)
        let stylePenalty = min(uniqueMissingStyles(response: response, orderedKeys: orderedKeys).count, 6)
        score -= colorPenalty + stylePenalty
        return max(0, min(100, score))
    }

    // MARK: - Priorities & missing items

    private static func buildTopPriorities(
        response: WardrobeGapAnalysisResponse,
        orderedKeys: [String]
    ) -> [WardrobeInsightPriority] {
        if let list = response.priorityShoppingList, !list.isEmpty {
            return list.map { item in
                WardrobeInsightPriority(
                    id: "priority-\(item.rank)-\(item.category)",
                    rank: item.rank,
                    name: item.itemName,
                    category: item.category,
                    priority: item.priority
                )
            }
        }
        return derivedShoppingItems(response: response, orderedKeys: orderedKeys)
            .enumerated()
            .map { index, item in
                WardrobeInsightPriority(
                    id: "priority-\(index + 1)-\(item.category)",
                    rank: index + 1,
                    name: item.itemName,
                    category: item.category,
                    priority: item.priority
                )
            }
    }

    private static func buildMissingItems(
        response: WardrobeGapAnalysisResponse,
        orderedKeys: [String]
    ) -> [WardrobeInsightMissingItem] {
        let source: [WardrobePriorityShoppingItem]
        if let list = response.priorityShoppingList, !list.isEmpty {
            source = list
        } else {
            source = derivedShoppingItems(response: response, orderedKeys: orderedKeys)
        }

        return source.map { item in
            WardrobeInsightMissingItem(
                id: "missing-\(item.rank)-\(item.category)",
                name: item.itemName,
                category: item.category,
                priority: item.priority,
                reason: item.reason,
                bestColors: item.recommendedColors,
                worksWith: worksWithStyles(from: item)
            )
        }
    }

    private static func derivedShoppingItems(
        response: WardrobeGapAnalysisResponse,
        orderedKeys: [String]
    ) -> [WardrobePriorityShoppingItem] {
        let derived: [(score: Int, item: WardrobePriorityShoppingItem)] = orderedKeys.compactMap { category in
            guard let entry = response.analysis_by_category[category] else { return nil }
            let score = (entry.missing_colors.count * 2) + (entry.missing_styles.count * 2) + (entry.item_count == 0 ? 2 : 0)
            guard score > 0 else { return nil }
            let priority = priorityLabel(forGapScore: score)
            let item = WardrobePriorityShoppingItem(
                rank: 0,
                itemName: "\(entry.missing_colors.first ?? "core") \(entry.missing_styles.first ?? category) \(category)",
                category: category,
                priority: priority,
                recommendedColors: entry.missing_colors,
                recommendedStyles: entry.missing_styles,
                reason: "Improves your \(response.style) \(response.occasion) options for \(response.season).",
                outfitImpact: "Unlocks more complete looks in \(category).",
                actions: ["Shop similar"]
            )
            return (score, item)
        }
        .sorted { $0.score > $1.score }

        return derived.enumerated().map { idx, pair in
            WardrobePriorityShoppingItem(
                rank: idx + 1,
                itemName: pair.item.itemName,
                category: pair.item.category,
                priority: pair.item.priority,
                recommendedColors: pair.item.recommendedColors,
                recommendedStyles: pair.item.recommendedStyles,
                reason: pair.item.reason,
                outfitImpact: pair.item.outfitImpact,
                actions: pair.item.actions
            )
        }
    }

    private static func worksWithStyles(from item: WardrobePriorityShoppingItem) -> [String] {
        let filtered = filterStyles(for: item.category, styles: item.recommendedStyles)
        if filtered.isEmpty {
            return [prettyLabel(item.category)]
        }
        return Array(filtered.prefix(4).map(prettyLabel))
    }

    private static func prettyLabel(_ value: String) -> String {
        value
            .components(separatedBy: CharacterSet(charactersIn: "_ "))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .map { part in
                part.prefix(1).uppercased() + part.dropFirst().lowercased()
            }
            .joined(separator: " ")
    }

    // MARK: - Category health

    private static func buildCategoryHealth(
        response: WardrobeGapAnalysisResponse,
        orderedKeys: [String]
    ) -> [WardrobeInsightCategoryHealth] {
        var health: [WardrobeInsightCategoryHealth] = categoryOrder.map { key in
            let entry = response.analysis_by_category[key]
            let display = displayNames[key] ?? key.capitalized
            let status = categoryStatus(entry: entry)
            let insight = categoryInsight(for: key, response: response, entry: entry)
            return WardrobeInsightCategoryHealth(
                id: key,
                category: display,
                status: status,
                summary: categorySummary(entry: entry, status: status),
                details: clothingCategoryDetails(entry: entry),
                ownedColors: entry?.owned_colors ?? [],
                ownedStyles: filterStyles(for: key, styles: entry?.owned_styles ?? []),
                missingColors: entry?.missing_colors ?? [],
                missingStyles: filterStyles(for: key, styles: entry?.missing_styles ?? []),
                recommendedStep: insight?.recommendation ?? entry?.recommended_purchases.first ?? "Add one versatile \(display.lowercased()) item first."
            )
        }

        let ownedColors = uniqueOwnedColors(response: response, orderedKeys: orderedKeys)
        let missingColors = uniqueMissingColors(response: response, orderedKeys: orderedKeys)
        let colorsStatus = colorsAggregateStatus(missingColors: missingColors)
        health.append(
            WardrobeInsightCategoryHealth(
                id: "colors",
                category: "Colors",
                status: colorsStatus,
                summary: colorsSummary(status: colorsStatus, count: missingColors.count),
                details: "Owned: \(ownedColors.count) colors. Missing: \(missingColors.count) colors.",
                ownedColors: ownedColors,
                ownedStyles: [],
                missingColors: missingColors,
                missingStyles: [],
                recommendedStep: colorsStatus == .needsNeutrals
                    ? "Start with versatile neutrals like navy, white, or gray."
                    : "Add one or two core colors that pair with your existing wardrobe."
            )
        )

        let ownedStyles = uniqueOwnedStyles(response: response, orderedKeys: orderedKeys)
        let missingStyles = uniqueMissingStyles(response: response, orderedKeys: orderedKeys)
        let stylesStatus = stylesAggregateStatus(missingStyles: missingStyles, requestedStyle: response.style)
        health.append(
            WardrobeInsightCategoryHealth(
                id: "styles",
                category: "Styles",
                status: stylesStatus,
                summary: stylesSummary(status: stylesStatus, count: missingStyles.count),
                details: "Owned: \(ownedStyles.count) styles. Missing: \(missingStyles.count) styles.",
                ownedColors: [],
                ownedStyles: ownedStyles,
                missingColors: [],
                missingStyles: missingStyles,
                recommendedStep: stylesStatus == .tooCasual
                    ? "Add smarter pieces to balance casual items for \(response.occasion) occasions."
                    : "Try one new style direction that complements your \(response.style) preference."
            )
        )

        return health
    }

    private static func categoryStatus(entry: WardrobeCategoryGap?) -> WardrobeCoverageStatus {
        guard let entry else { return .missing }
        if entry.item_count == 0 { return .missing }
        let gapScore = (entry.missing_colors.count * 2) + (entry.missing_styles.count * 2)
        if gapScore >= 8 { return .weak }
        if gapScore >= 4 { return .medium }
        return .good
    }

    private static func colorsAggregateStatus(missingColors: [String]) -> WardrobeCoverageStatus {
        let missingNeutrals = missingColors.filter { neutralColors.contains($0.lowercased()) }
        if missingNeutrals.count >= 3 { return .needsNeutrals }
        if missingColors.isEmpty { return .good }
        if missingColors.count >= 5 { return .weak }
        if missingColors.count >= 2 { return .medium }
        return .good
    }

    private static func stylesAggregateStatus(missingStyles: [String], requestedStyle: String) -> WardrobeCoverageStatus {
        let normalizedRequest = requestedStyle.lowercased()
        let wantsFormal = formalStyles.contains { normalizedRequest.contains($0) }
        if wantsFormal && missingStyles.count >= 2 { return .tooCasual }
        if missingStyles.isEmpty { return .good }
        if missingStyles.count >= 4 { return .weak }
        if missingStyles.count >= 2 { return .medium }
        return .good
    }

    private static func categorySummary(entry: WardrobeCategoryGap?, status: WardrobeCoverageStatus) -> String {
        switch status {
        case .missing:
            return "No items in this category yet."
        case .weak:
            return "Gaps are limiting outfit combinations."
        case .medium:
            return "Decent coverage with room to improve."
        case .good:
            return "Strong coverage for your goals."
        case .needsNeutrals, .tooCasual:
            return entry?.recommended_purchases.first ?? "Review recommendations below."
        }
    }

    private static func colorsSummary(status: WardrobeCoverageStatus, count: Int) -> String {
        switch status {
        case .needsNeutrals: return "Add core neutral colors."
        case .missing, .weak: return "\(count) colors would expand your options."
        case .medium: return "A few color additions would help."
        case .good: return "Color palette looks solid."
        case .tooCasual: return "Style balance needs attention."
        }
    }

    private static func stylesSummary(status: WardrobeCoverageStatus, count: Int) -> String {
        switch status {
        case .tooCasual: return "Outfits may skew too casual."
        case .missing, .weak: return "\(count) styles to explore."
        case .medium: return "Some style variety would help."
        case .good: return "Style range looks balanced."
        case .needsNeutrals: return "Neutral pieces would help balance looks."
        }
    }

    // MARK: - Helpers

    private static func orderedCategories(from response: WardrobeGapAnalysisResponse) -> [String] {
        let fromResponse = Array(response.analysis_by_category.keys)
        let extras = fromResponse.filter { !categoryOrder.contains($0) }
        return (categoryOrder + extras).filter { response.analysis_by_category[$0] != nil }
    }

    private static func uniqueOwnedColors(response: WardrobeGapAnalysisResponse, orderedKeys: [String]) -> [String] {
        uniqueStrings(
            orderedKeys.flatMap { response.analysis_by_category[$0]?.owned_colors ?? [] }
        )
    }

    private static func uniqueOwnedStyles(response: WardrobeGapAnalysisResponse, orderedKeys: [String]) -> [String] {
        uniqueStrings(
            orderedKeys.flatMap { key in
                filterStyles(
                    for: key,
                    styles: response.analysis_by_category[key]?.owned_styles ?? []
                )
            }
        )
    }

    private static func uniqueMissingColors(response: WardrobeGapAnalysisResponse, orderedKeys: [String]) -> [String] {
        uniqueStrings(
            orderedKeys.flatMap { response.analysis_by_category[$0]?.missing_colors ?? [] }
        )
    }

    private static func uniqueMissingStyles(response: WardrobeGapAnalysisResponse, orderedKeys: [String]) -> [String] {
        uniqueStrings(
            orderedKeys.flatMap { key in
                filterStyles(
                    for: key,
                    styles: response.analysis_by_category[key]?.missing_styles ?? []
                )
            }
        )
    }

    private static func uniqueStrings(_ values: [String]) -> [String] {
        var seen = Set<String>()
        var result: [String] = []
        for value in values {
            let key = value.lowercased()
            guard !seen.contains(key) else { continue }
            seen.insert(key)
            result.append(value)
        }
        return result.sorted { $0.lowercased() < $1.lowercased() }
    }

    private static func priorityLabel(forGapScore score: Int) -> String {
        if score >= 8 { return "High" }
        if score >= 4 { return "Medium" }
        return "Low"
    }

    private static func categoryInsight(
        for category: String,
        response: WardrobeGapAnalysisResponse,
        entry: WardrobeCategoryGap?
    ) -> WardrobeCategoryInsight? {
        if let insights = response.categoryInsights,
           let match = insights.first(where: { $0.category == category }) {
            return match
        }
        guard let entry else { return nil }
        let gapScore = (entry.missing_colors.count * 2) + (entry.missing_styles.count * 2) + (entry.item_count == 0 ? 2 : 0)
        guard gapScore > 0 else { return nil }
        return WardrobeCategoryInsight(
            category: category,
            missingColors: entry.missing_colors,
            missingStyles: entry.missing_styles,
            priority: priorityLabel(forGapScore: gapScore),
            whyThisMatters: "Adding these \(category) options gives you more \(response.style) \(response.occasion) combinations.",
            recommendation: entry.recommended_purchases.first ?? "Add one versatile \(category) item first.",
            suggestedActions: ["Shop similar"]
        )
    }

    private static func clothingCategoryDetails(entry: WardrobeCategoryGap?) -> String {
        let ownedColors = entry?.owned_colors.count ?? 0
        let ownedStyles = entry?.owned_styles.count ?? 0
        let missingColors = entry?.missing_colors.count ?? 0
        let missingStyles = entry?.missing_styles.count ?? 0
        return "Owned: \(ownedColors) colors, \(ownedStyles) styles. Missing: \(missingColors) colors, \(missingStyles) styles."
    }

}

private extension String {
    var nonEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
