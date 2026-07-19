//
//  WeekPlanModels.swift
//  OutfitSuggestor
//
//  Week Outfit Planner DTOs — aligned with backend /api/week-plan.
//

import Foundation

enum WeekPlanConstants {
    static let defaultReminderTime = "07:30"
    static let defaultStyle = "classic"
    static let defaultSeason = "all-season"
    static let defaultOccasion = "everyday"
    /// 0 = Monday … 6 = Sunday
    static let dayNames = [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ]

    static func dayName(for dayOfWeek: Int) -> String {
        guard dayOfWeek >= 0, dayOfWeek < dayNames.count else { return "Day \(dayOfWeek)" }
        return dayNames[dayOfWeek]
    }
}

struct WeekPlanDayInput: Codable, Equatable {
    var day_of_week: Int
    var enabled: Bool
    var occasion: String
    /// Per-day style (season stays shared on the plan).
    var style: String = WeekPlanConstants.defaultStyle
    /// When true (default), generate uses wardrobe only for this day.
    var use_wardrobe_only: Bool = true
}

struct WeekPlanUpsertRequest: Codable, Equatable {
    var reminder_time: String
    var timezone: String
    var shared_style: String
    var shared_season: String
    var days: [WeekPlanDayInput]
}

struct WeekPlanGenerateRequest: Codable, Equatable {
    var day_of_week: Int?
}

struct WeekPlanOutfitResponse: Codable, Identifiable {
    var id: String { summary + (generated_at ?? "") + shirt + trouser }
    var summary: String
    var generated_at: String?
    var shirt: String
    var trouser: String
    var blazer: String
    var shoes: String
    var belt: String
    var reasoning: String
    var sweater: String?
    var outerwear: String?
    var tie: String?
    var shirt_id: Int?
    var trouser_id: Int?
    var blazer_id: Int?
    var shoes_id: Int?
    var belt_id: Int?
    var sweater_id: Int?
    var outerwear_id: Int?
    var tie_id: Int?
    var matching_wardrobe_items: MatchingWardrobeItems?
    var model_image: String?
    var wardrobe_item_ids: [Int]

    enum CodingKeys: String, CodingKey {
        case summary, generated_at, shirt, trouser, blazer, shoes, belt, reasoning
        case sweater, outerwear, tie
        case shirt_id, trouser_id, blazer_id, shoes_id, belt_id
        case sweater_id, outerwear_id, tie_id
        case matching_wardrobe_items, model_image, wardrobe_item_ids
    }

    init(
        summary: String = "",
        generated_at: String? = nil,
        shirt: String = "",
        trouser: String = "",
        blazer: String = "",
        shoes: String = "",
        belt: String = "",
        reasoning: String = "",
        sweater: String? = nil,
        outerwear: String? = nil,
        tie: String? = nil,
        shirt_id: Int? = nil,
        trouser_id: Int? = nil,
        blazer_id: Int? = nil,
        shoes_id: Int? = nil,
        belt_id: Int? = nil,
        sweater_id: Int? = nil,
        outerwear_id: Int? = nil,
        tie_id: Int? = nil,
        matching_wardrobe_items: MatchingWardrobeItems? = nil,
        model_image: String? = nil,
        wardrobe_item_ids: [Int] = []
    ) {
        self.summary = summary
        self.generated_at = generated_at
        self.shirt = shirt
        self.trouser = trouser
        self.blazer = blazer
        self.shoes = shoes
        self.belt = belt
        self.reasoning = reasoning
        self.sweater = sweater
        self.outerwear = outerwear
        self.tie = tie
        self.shirt_id = shirt_id
        self.trouser_id = trouser_id
        self.blazer_id = blazer_id
        self.shoes_id = shoes_id
        self.belt_id = belt_id
        self.sweater_id = sweater_id
        self.outerwear_id = outerwear_id
        self.tie_id = tie_id
        self.matching_wardrobe_items = matching_wardrobe_items
        self.model_image = model_image
        self.wardrobe_item_ids = wardrobe_item_ids
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        summary = try c.decodeIfPresent(String.self, forKey: .summary) ?? ""
        generated_at = try c.decodeIfPresent(String.self, forKey: .generated_at)
        shirt = try c.decodeIfPresent(String.self, forKey: .shirt) ?? ""
        trouser = try c.decodeIfPresent(String.self, forKey: .trouser) ?? ""
        blazer = try c.decodeIfPresent(String.self, forKey: .blazer) ?? ""
        shoes = try c.decodeIfPresent(String.self, forKey: .shoes) ?? ""
        belt = try c.decodeIfPresent(String.self, forKey: .belt) ?? ""
        reasoning = try c.decodeIfPresent(String.self, forKey: .reasoning) ?? ""
        sweater = try c.decodeIfPresent(String.self, forKey: .sweater)
        outerwear = try c.decodeIfPresent(String.self, forKey: .outerwear)
        tie = try c.decodeIfPresent(String.self, forKey: .tie)
        shirt_id = try c.decodeIfPresent(Int.self, forKey: .shirt_id)
        trouser_id = try c.decodeIfPresent(Int.self, forKey: .trouser_id)
        blazer_id = try c.decodeIfPresent(Int.self, forKey: .blazer_id)
        shoes_id = try c.decodeIfPresent(Int.self, forKey: .shoes_id)
        belt_id = try c.decodeIfPresent(Int.self, forKey: .belt_id)
        sweater_id = try c.decodeIfPresent(Int.self, forKey: .sweater_id)
        outerwear_id = try c.decodeIfPresent(Int.self, forKey: .outerwear_id)
        tie_id = try c.decodeIfPresent(Int.self, forKey: .tie_id)
        matching_wardrobe_items = try c.decodeIfPresent(MatchingWardrobeItems.self, forKey: .matching_wardrobe_items)
        model_image = try c.decodeIfPresent(String.self, forKey: .model_image)
        wardrobe_item_ids = try c.decodeIfPresent([Int].self, forKey: .wardrobe_item_ids) ?? []
    }
}

struct WeekPlanDayResponse: Codable, Identifiable {
    var id: Int { day_of_week }
    var day_of_week: Int
    var enabled: Bool
    var occasion: String
    /// Per-day style (season stays shared on the plan).
    var style: String
    /// When true (default), generate uses wardrobe only for this day.
    var use_wardrobe_only: Bool
    var outfit: WeekPlanOutfitResponse?

    enum CodingKeys: String, CodingKey {
        case day_of_week, enabled, occasion, style, use_wardrobe_only, outfit
    }

    init(
        day_of_week: Int,
        enabled: Bool,
        occasion: String,
        style: String = WeekPlanConstants.defaultStyle,
        use_wardrobe_only: Bool = true,
        outfit: WeekPlanOutfitResponse? = nil
    ) {
        self.day_of_week = day_of_week
        self.enabled = enabled
        self.occasion = occasion
        self.style = style
        self.use_wardrobe_only = use_wardrobe_only
        self.outfit = outfit
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        day_of_week = try c.decode(Int.self, forKey: .day_of_week)
        enabled = try c.decodeIfPresent(Bool.self, forKey: .enabled) ?? false
        occasion = try c.decodeIfPresent(String.self, forKey: .occasion) ?? WeekPlanConstants.defaultOccasion
        style = try c.decodeIfPresent(String.self, forKey: .style) ?? WeekPlanConstants.defaultStyle
        use_wardrobe_only = try c.decodeIfPresent(Bool.self, forKey: .use_wardrobe_only) ?? true
        outfit = try c.decodeIfPresent(WeekPlanOutfitResponse.self, forKey: .outfit)
    }
}

struct WeekPlanResponse: Codable {
    var reminder_time: String
    var timezone: String
    var shared_style: String
    var shared_season: String
    var days: [WeekPlanDayResponse]
    var wardrobe_empty: Bool
    var message: String?

    static func empty(timezone: String = TimeZone.current.identifier) -> WeekPlanResponse {
        WeekPlanResponse(
            reminder_time: WeekPlanConstants.defaultReminderTime,
            timezone: timezone,
            shared_style: WeekPlanConstants.defaultStyle,
            shared_season: WeekPlanConstants.defaultSeason,
            days: (0..<7).map {
                WeekPlanDayResponse(
                    day_of_week: $0,
                    enabled: false,
                    occasion: WeekPlanConstants.defaultOccasion,
                    style: WeekPlanConstants.defaultStyle,
                    use_wardrobe_only: true,
                    outfit: nil
                )
            },
            wardrobe_empty: false,
            message: nil
        )
    }
}

struct WeekPlanTodayResponse: Codable {
    var day_of_week: Int
    var enabled: Bool
    var occasion: String?
    var style: String?
    /// When true (default), generate uses wardrobe only for this day.
    var use_wardrobe_only: Bool
    var outfit: WeekPlanOutfitResponse?
    var reminder_time: String
    var timezone: String
    var has_plan: Bool
    var message: String?

    enum CodingKeys: String, CodingKey {
        case day_of_week, enabled, occasion, style, use_wardrobe_only, outfit
        case reminder_time, timezone, has_plan, message
    }

    init(
        day_of_week: Int,
        enabled: Bool,
        occasion: String? = nil,
        style: String? = nil,
        use_wardrobe_only: Bool = true,
        outfit: WeekPlanOutfitResponse? = nil,
        reminder_time: String,
        timezone: String,
        has_plan: Bool,
        message: String? = nil
    ) {
        self.day_of_week = day_of_week
        self.enabled = enabled
        self.occasion = occasion
        self.style = style
        self.use_wardrobe_only = use_wardrobe_only
        self.outfit = outfit
        self.reminder_time = reminder_time
        self.timezone = timezone
        self.has_plan = has_plan
        self.message = message
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        day_of_week = try c.decode(Int.self, forKey: .day_of_week)
        enabled = try c.decodeIfPresent(Bool.self, forKey: .enabled) ?? false
        occasion = try c.decodeIfPresent(String.self, forKey: .occasion)
        style = try c.decodeIfPresent(String.self, forKey: .style)
        use_wardrobe_only = try c.decodeIfPresent(Bool.self, forKey: .use_wardrobe_only) ?? true
        outfit = try c.decodeIfPresent(WeekPlanOutfitResponse.self, forKey: .outfit)
        reminder_time = try c.decodeIfPresent(String.self, forKey: .reminder_time)
            ?? WeekPlanConstants.defaultReminderTime
        timezone = try c.decodeIfPresent(String.self, forKey: .timezone) ?? "UTC"
        has_plan = try c.decodeIfPresent(Bool.self, forKey: .has_plan) ?? false
        message = try c.decodeIfPresent(String.self, forKey: .message)
    }
}

struct WeekPlanDeleteResponse: Codable, Equatable {
    var deleted: Bool
}

enum WeekPlanCopy {
    static let loading = "Loading your week…"
    static let generating = "Generating outfits…"
    static let emptyDays = "Turn on the days you want to plan."
    static let emptyWardrobe = "Add items to your wardrobe to generate outfits."
    static let savePlan = "Save plan"
    static let generateWeek = "Generate week"
    static let regenerate = "Regenerate"
    static let todayTitle = "Today"
    static let reminderLabel = "Daily reminder"
    static let sharedStyleLabel = "Style for the week"
    static let sharedSeasonLabel = "Shared season"
    static let navTitle = "Week Planner"
    static let useWardrobe = "Use wardrobe"
    static let outfitDetails = "Outfit details"
    static let clearPlan = "Clear plan"
    static let clearConfirmTitle = "Delete this week’s plan and outfits?"
    static let clearConfirmMessage = "This cannot be undone. You’ll need to set days and generate again."
    static let clearConfirmDelete = "Delete plan"
}

/// Presentation helpers for collapsible week-plan outfit UI (summary vs expanded slots).
enum WeekPlanOutfitDisplay {
    struct SlotRow: Equatable {
        let category: String
        let label: String
        let description: String
    }

    static func summaryLine(for outfit: WeekPlanOutfitResponse) -> String {
        let trimmed = outfit.summary.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed
    }

    static func hasExpandableDetails(_ outfit: WeekPlanOutfitResponse) -> Bool {
        !summaryLine(for: outfit).isEmpty
            || !slotRows(for: outfit).isEmpty
            || !outfit.reasoning.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    static func slotRows(for outfit: WeekPlanOutfitResponse) -> [SlotRow] {
        let suggestion = asOutfitSuggestion(outfit)
        var rows: [SlotRow] = []

        func append(category: String, label: String, text: String?) {
            let trimmed = (text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { return }
            rows.append(SlotRow(category: category, label: label, description: trimmed))
        }

        append(category: "shirt", label: "Shirt", text: outfit.shirt)
        append(category: "trouser", label: "Trousers", text: outfit.trouser)
        if OutfitLayerExclusivity.shouldShowBlazerCard(suggestion: suggestion) {
            append(category: "blazer", label: "Blazer", text: outfit.blazer)
        }
        append(category: "shoes", label: "Shoes", text: outfit.shoes)
        append(category: "belt", label: "Belt", text: outfit.belt)
        for item in OutfitOptionalLayers.items(
            for: suggestion,
            allowedCategories: OutfitLayerExclusivity.optionalLayerCategories(for: suggestion)
        ) {
            append(category: item.category, label: item.label, text: item.description)
        }
        return rows
    }

    static func hasMatchingItem(outfit: WeekPlanOutfitResponse, category: String) -> Bool {
        OutfitItemThumbnail.resolveMatchingItem(
            suggestion: asOutfitSuggestion(outfit),
            category: category
        ) != nil
    }

    static func sourceTag(outfit: WeekPlanOutfitResponse, category: String) -> String {
        OutfitItemCardSourceTag.resolve(
            category: category,
            suggestion: asOutfitSuggestion(outfit),
            uploadImage: nil
        )
    }

    static func asOutfitSuggestion(_ outfit: WeekPlanOutfitResponse) -> OutfitSuggestion {
        OutfitSuggestion(
            shirt: outfit.shirt,
            trouser: outfit.trouser,
            blazer: outfit.blazer,
            shoes: outfit.shoes,
            belt: outfit.belt,
            reasoning: outfit.reasoning,
            model_image: outfit.model_image,
            matching_wardrobe_items: outfit.matching_wardrobe_items,
            sweater: outfit.sweater,
            outerwear: outfit.outerwear,
            tie: outfit.tie,
            shirt_id: outfit.shirt_id,
            trouser_id: outfit.trouser_id,
            blazer_id: outfit.blazer_id,
            shoes_id: outfit.shoes_id,
            belt_id: outfit.belt_id,
            sweater_id: outfit.sweater_id,
            outerwear_id: outfit.outerwear_id,
            tie_id: outfit.tie_id
        )
    }
}
