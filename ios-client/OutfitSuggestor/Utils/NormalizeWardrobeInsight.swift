//
//  NormalizeWardrobeInsight.swift
//  OutfitSuggestor
//
//  Maps WardrobeGapAnalysisResponse → WardrobeInsightResult (web parity).
//

import Foundation

enum NormalizeWardrobeInsight {
    private static let categoryOrder = ["shirt", "trouser", "blazer", "sweater", "jacket", "shoes", "belt"]
    private static let displayNames: [String: String] = [
        "shirt": "Shirts",
        "trouser": "Trousers",
        "shoes": "Shoes",
        "blazer": "Blazers",
        "sweater": "Sweaters",
        "jacket": "Jackets",
        "tie": "Ties",
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
        "sweater": ["crew neck", "v-neck", "cardigan", "merino", "cable knit"],
        "jacket": ["bomber", "denim jacket", "field jacket", "lightweight shell", "harrington"],
        "tie": ["silk", "knit tie", "classic width", "textured", "solid"],
        "shoes": ["loafers", "clean sneakers", "derby shoes", "driving shoes", "minimal leather sneakers"],
        "belt": ["leather", "braided", "reversible", "formal leather", "casual leather"],
    ]

    static let priorityMissingPreviewLimit = 10

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

    static func stylePriority(for style: String, in priorities: [String: String]) -> String? {
        if let exact = priorities[style] { return exact }
        let needle = style.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !needle.isEmpty else { return nil }
        return priorities.first {
            $0.key.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == needle
        }?.value
    }

    static func attachedStylePriorities(
        from raw: [String: String]?,
        styles: [String]
    ) -> [String: String] {
        guard let raw, !raw.isEmpty else { return [:] }
        var result: [String: String] = [:]
        for style in styles {
            if let value = stylePriority(for: style, in: raw) {
                result[style] = value
            }
        }
        return result
    }

    static func sortStylesByPriority(_ styles: [String], priorities: [String: String]) -> [String] {
        styles.sorted { lhs, rhs in
            let leftRank = stylePriorityRank(for: stylePriority(for: lhs, in: priorities))
            let rightRank = stylePriorityRank(for: stylePriority(for: rhs, in: priorities))
            if leftRank != rightRank { return leftRank < rightRank }
            return lhs.lowercased() < rhs.lowercased()
        }
    }

    /// Priority missing preview: Essential then Useful, capped at `limit` (default 10).
    /// Skip (and untagged, when any priorities exist) stay hidden until Show all.
    /// With no priorities, returns the first `limit` catalog tags.
    static func priorityMissingPreview(
        _ styles: [String],
        priorities: [String: String],
        limit: Int = priorityMissingPreviewLimit
    ) -> [String] {
        let sorted = sortStylesByPriority(styles, priorities: priorities)
        let hasPriorities = styles.contains { stylePriority(for: $0, in: priorities) != nil }
        if !hasPriorities {
            return Array(sorted.prefix(limit))
        }
        let ranked = sorted.filter { style in
            let rank = stylePriorityRank(for: stylePriority(for: style, in: priorities))
            return rank == 0 || rank == 1
        }
        return Array(ranked.prefix(limit))
    }

    static func shoppingListStyles(category: String, recommendedStyles: [String]) -> [String] {
        filterStyles(for: category, styles: recommendedStyles)
    }

    private static func stylePriorityRank(for label: String?) -> Int {
        switch label?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
        case "essential": return 0
        case "useful": return 1
        case "skip": return 2
        default: return 3
        }
    }

    static func normalize(_ response: WardrobeGapAnalysisResponse) -> WardrobeInsightResult {
        let orderedKeys = orderedCategories(from: response)
        let scoreValue = computeScore(response: response, orderedKeys: orderedKeys)
        let summary = response.summaryText?.nonEmpty ?? response.overall_summary
        let shoppingItems = mergedShoppingItems(response: response, orderedKeys: orderedKeys)
        let priorities = buildTopPriorities(from: shoppingItems)
        let missingItems = buildMissingItems(from: shoppingItems)
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
        let clothingKeys = orderedKeys.filter { $0 != "colors" && $0 != "styles" }
        for key in clothingKeys {
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

    private static func mergedShoppingItems(
        response: WardrobeGapAnalysisResponse,
        orderedKeys: [String]
    ) -> [WardrobePriorityShoppingItem] {
        if let list = response.priorityShoppingList, !list.isEmpty {
            return appendOmittedGapCategories(
                to: list,
                response: response,
                orderedKeys: orderedKeys
            )
        }
        return derivedShoppingItems(response: response, orderedKeys: orderedKeys)
    }

    private static func appendOmittedGapCategories(
        to list: [WardrobePriorityShoppingItem],
        response: WardrobeGapAnalysisResponse,
        orderedKeys: [String]
    ) -> [WardrobePriorityShoppingItem] {
        let clothingKeys = orderedKeys.filter { $0 != "colors" && $0 != "styles" }
        let existing = Set(
            list.map { $0.category.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
        )
        var merged = list
        var nextRank = (list.map(\.rank).max() ?? 0) + 1

        for category in clothingKeys {
            let key = category.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            guard !existing.contains(key) else { continue }
            guard let entry = response.analysis_by_category[category] else { continue }
            guard let gap = remainingActionableGap(category: category, entry: entry) else { continue }
            let gapScore = (gap.colors.count * 2) + (gap.styles.count * 2) + (entry.item_count == 0 ? 2 : 0)
            merged.append(
                makeDerivedShoppingItem(
                    category: category,
                    response: response,
                    missingColors: gap.colors,
                    rankedStyles: gap.styles,
                    rank: nextRank,
                    gapScore: gapScore
                )
            )
            nextRank += 1
        }
        return merged
    }

    /// Remaining missing colors, or Essential/Useful (via `priorityMissingPreview`) missing styles.
    private static func remainingActionableGap(
        category: String,
        entry: WardrobeCategoryGap
    ) -> (colors: [String], styles: [String])? {
        let missingColors = exclusiveMissingColors(
            owned: entry.owned_colors,
            missing: entry.missing_colors
        )
        let libraryMissing = filterStyles(
            for: category,
            styles: exclusiveMissingStyles(owned: entry.owned_styles, missing: entry.missing_styles)
        )
        let stylePriorities = attachedStylePriorities(from: entry.style_priorities, styles: libraryMissing)
        let rankedStyles = priorityMissingPreview(
            libraryMissing,
            priorities: stylePriorities,
            limit: max(libraryMissing.count, 1)
        )
        guard !missingColors.isEmpty || !rankedStyles.isEmpty else { return nil }
        return (missingColors, rankedStyles)
    }

    private static func buildTopPriorities(
        from items: [WardrobePriorityShoppingItem]
    ) -> [WardrobeInsightPriority] {
        items.map { item in
            WardrobeInsightPriority(
                id: "priority-\(item.rank)-\(item.category)",
                rank: item.rank,
                name: item.itemName,
                category: item.category,
                priority: item.priority
            )
        }
    }

    private static func buildMissingItems(
        from items: [WardrobePriorityShoppingItem]
    ) -> [WardrobeInsightMissingItem] {
        items.map { item in
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
            guard category != "colors", category != "styles" else { return nil }
            guard let entry = response.analysis_by_category[category] else { return nil }
            let missingColors = exclusiveMissingColors(
                owned: entry.owned_colors,
                missing: entry.missing_colors
            )
            let libraryMissing = filterStyles(
                for: category,
                styles: exclusiveMissingStyles(owned: entry.owned_styles, missing: entry.missing_styles)
            )
            let stylePriorities = attachedStylePriorities(from: entry.style_priorities, styles: libraryMissing)
            let rankedStyles = priorityMissingPreview(
                libraryMissing,
                priorities: stylePriorities,
                limit: max(libraryMissing.count, 1)
            )
            let score = (missingColors.count * 2) + (libraryMissing.count * 2) + (entry.item_count == 0 ? 2 : 0)
            guard score > 0 else { return nil }
            return (
                score,
                makeDerivedShoppingItem(
                    category: category,
                    response: response,
                    missingColors: missingColors,
                    rankedStyles: rankedStyles,
                    rank: 0,
                    gapScore: score
                )
            )
        }
        .sorted { $0.score > $1.score }

        return derived.enumerated().map { idx, pair in
            rerankedShoppingItem(pair.item, rank: idx + 1)
        }
    }

    private static func makeDerivedShoppingItem(
        category: String,
        response: WardrobeGapAnalysisResponse,
        missingColors: [String],
        rankedStyles: [String],
        rank: Int,
        gapScore: Int
    ) -> WardrobePriorityShoppingItem {
        return WardrobePriorityShoppingItem(
            rank: rank,
            itemName: displayNames[category] ?? prettyLabel(category),
            category: category,
            priority: priorityLabel(forGapScore: gapScore),
            recommendedColors: missingColors,
            recommendedStyles: rankedStyles,
            reason: "Improves your \(response.style) \(response.occasion) options for \(response.season).",
            outfitImpact: "Unlocks more complete looks in \(category).",
            actions: ["Shop similar"]
        )
    }

    private static func rerankedShoppingItem(
        _ item: WardrobePriorityShoppingItem,
        rank: Int
    ) -> WardrobePriorityShoppingItem {
        WardrobePriorityShoppingItem(
            rank: rank,
            itemName: item.itemName,
            category: item.category,
            priority: item.priority,
            recommendedColors: item.recommendedColors,
            recommendedStyles: item.recommendedStyles,
            reason: item.reason,
            outfitImpact: item.outfitImpact,
            actions: item.actions
        )
    }

    private static func worksWithStyles(from item: WardrobePriorityShoppingItem) -> [String] {
        let filtered = shoppingListStyles(category: item.category, recommendedStyles: item.recommendedStyles)
        if filtered.isEmpty {
            return [prettyLabel(item.category)]
        }
        return filtered.map(prettyLabel)
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
        let clothingKeys = orderedKeys.filter { $0 != "colors" && $0 != "styles" }
        var health: [WardrobeInsightCategoryHealth] = clothingKeys.map { key in
            let entry = response.analysis_by_category[key]
            let display = displayNames[key] ?? key.capitalized
            let status = categoryStatus(entry: entry)
            let insight = categoryInsight(for: key, response: response, entry: entry)
            let ownedColors = entry?.owned_colors ?? []
            let ownedStyles = filterStyles(for: key, styles: entry?.owned_styles ?? [])
            let missingColors = exclusiveMissingColors(
                owned: ownedColors,
                missing: entry?.missing_colors ?? []
            )
            let missingStyles = filterStyles(
                for: key,
                styles: exclusiveMissingStyles(
                    owned: entry?.owned_styles ?? [],
                    missing: entry?.missing_styles ?? []
                )
            )
            let stylePriorities = attachedStylePriorities(from: entry?.style_priorities, styles: missingStyles)
            let sortedMissing = sortStylesByPriority(missingStyles, priorities: stylePriorities)
            let fallbackStep = insight?.recommendation
                ?? entry?.recommended_purchases.first
                ?? "Add one versatile \(display.lowercased()) item first."
            return WardrobeInsightCategoryHealth(
                id: key,
                category: display,
                status: status,
                summary: categorySummary(entry: entry, status: status),
                details: clothingCategoryDetails(
                    ownedColors: ownedColors,
                    ownedStyles: ownedStyles,
                    missingColors: missingColors,
                    missingStyles: sortedMissing
                ),
                ownedColors: ownedColors,
                ownedStyles: ownedStyles,
                missingColors: missingColors,
                missingStyles: sortedMissing,
                recommendedStep: recommendedStepFromCatalog(
                    missingStyles: sortedMissing,
                    stylePriorities: stylePriorities,
                    fallback: fallbackStep
                ),
                stylePriorities: stylePriorities
            )
        }

        let ownedColors = uniqueOwnedColors(response: response, orderedKeys: orderedKeys)
        let missingColors = exclusiveMissingColors(
            owned: ownedColors,
            missing: uniqueMissingColors(response: response, orderedKeys: orderedKeys)
        )
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
        let missingStyles = exclusiveMissingStyles(
            owned: ownedStyles,
            missing: uniqueMissingStyles(response: response, orderedKeys: orderedKeys)
        )
        let stylePriorities = mergedStylePriorities(
            response: response,
            orderedKeys: orderedKeys,
            styles: missingStyles
        )
        let sortedMissing = sortStylesByPriority(missingStyles, priorities: stylePriorities)
        let stylesStatus = stylesAggregateStatus(missingStyles: sortedMissing, requestedStyle: response.style)
        let stylesFallback = stylesStatus == .tooCasual
            ? "Add smarter pieces to balance casual items for \(response.occasion) occasions."
            : "Try one new style direction that complements your \(response.style) preference."
        health.append(
            WardrobeInsightCategoryHealth(
                id: "styles",
                category: "Styles",
                status: stylesStatus,
                summary: stylesSummary(status: stylesStatus, count: sortedMissing.count),
                details: "Owned: \(ownedStyles.count) styles. Missing: \(sortedMissing.count) styles.",
                ownedColors: [],
                ownedStyles: ownedStyles,
                missingColors: [],
                missingStyles: sortedMissing,
                recommendedStep: recommendedStepFromCatalog(
                    missingStyles: sortedMissing,
                    stylePriorities: stylePriorities,
                    fallback: stylesFallback
                ),
                stylePriorities: stylePriorities
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

    /// Clothing categories only (excludes aggregate colors/styles keys).
    private static func clothingCategoryKeys(from response: WardrobeGapAnalysisResponse) -> [String] {
        orderedCategories(from: response).filter { $0 != "colors" && $0 != "styles" }
    }

    /// Trim, lowercase, collapse whitespace/hyphens, `grey`→`gray`. Does not alias navy↔blue or charcoal↔gray.
    private static func colorDisplayKey(_ value: String) -> String {
        var key = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        key = key.replacingOccurrences(of: #"[\s\-]+"#, with: "", options: .regularExpression)
        return key.replacingOccurrences(of: "grey", with: "gray")
    }

    private static func styleDisplayKey(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private static func exclusiveMissingColors(owned: [String], missing: [String]) -> [String] {
        let ownedKeys = Set(owned.map(colorDisplayKey).filter { !$0.isEmpty })
        return missing.filter { color in
            let key = colorDisplayKey(color)
            return !key.isEmpty && !ownedKeys.contains(key)
        }
    }

    private static func exclusiveMissingStyles(owned: [String], missing: [String]) -> [String] {
        let ownedKeys = Set(owned.map(styleDisplayKey).filter { !$0.isEmpty })
        return missing.filter { style in
            let key = styleDisplayKey(style)
            return !key.isEmpty && !ownedKeys.contains(key)
        }
    }

    private static func uniqueColorStrings(_ values: [String]) -> [String] {
        var seen = Set<String>()
        var result: [String] = []
        for value in values {
            let key = colorDisplayKey(value)
            guard !key.isEmpty, !seen.contains(key) else { continue }
            seen.insert(key)
            result.append(value)
        }
        return result.sorted { colorDisplayKey($0) < colorDisplayKey($1) }
    }

    private static func uniqueOwnedColors(response: WardrobeGapAnalysisResponse, orderedKeys: [String]) -> [String] {
        uniqueColorStrings(
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
        let owned = uniqueOwnedColors(response: response, orderedKeys: orderedKeys)
        let perCategory = uniqueColorStrings(
            orderedKeys.flatMap { key in
                let entry = response.analysis_by_category[key]
                return exclusiveMissingColors(
                    owned: entry?.owned_colors ?? [],
                    missing: entry?.missing_colors ?? []
                )
            }
        )
        return exclusiveMissingColors(owned: owned, missing: perCategory)
    }

    private static func uniqueMissingStyles(response: WardrobeGapAnalysisResponse, orderedKeys: [String]) -> [String] {
        let owned = uniqueOwnedStyles(response: response, orderedKeys: orderedKeys)
        let perCategory = uniqueStrings(
            orderedKeys.flatMap { key in
                let entry = response.analysis_by_category[key]
                return filterStyles(
                    for: key,
                    styles: exclusiveMissingStyles(
                        owned: entry?.owned_styles ?? [],
                        missing: entry?.missing_styles ?? []
                    )
                )
            }
        )
        return exclusiveMissingStyles(owned: owned, missing: perCategory)
    }

    private static func mergedStylePriorities(
        response: WardrobeGapAnalysisResponse,
        orderedKeys: [String],
        styles: [String]
    ) -> [String: String] {
        var raw: [String: String] = [:]
        for key in orderedKeys {
            guard let priorities = response.analysis_by_category[key]?.style_priorities else { continue }
            for (tag, label) in priorities {
                let normalized = tag.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
                guard !normalized.isEmpty else { continue }
                if let existing = raw[normalized],
                   stylePriorityRank(for: existing) <= stylePriorityRank(for: label) {
                    continue
                }
                raw[normalized] = label
            }
        }
        return attachedStylePriorities(from: raw, styles: styles)
    }

    private static func recommendedStepFromCatalog(
        missingStyles: [String],
        stylePriorities: [String: String],
        fallback: String
    ) -> String {
        guard let first = priorityMissingPreview(
            missingStyles,
            priorities: stylePriorities,
            limit: 1
        ).first else {
            return fallback
        }
        return "Add \(prettyLabel(first)) next."
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

    private static func clothingCategoryDetails(
        ownedColors: [String],
        ownedStyles: [String],
        missingColors: [String],
        missingStyles: [String]
    ) -> String {
        "Owned: \(ownedColors.count) colors, \(ownedStyles.count) styles. Missing: \(missingColors.count) colors, \(missingStyles.count) styles."
    }

}

private extension String {
    var nonEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
