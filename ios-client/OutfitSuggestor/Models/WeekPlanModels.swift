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
    /// Slot key → wardrobe item id (pins kept across generate/regenerate).
    var pinned_items: [String: Int] = [:]

    enum CodingKeys: String, CodingKey {
        case day_of_week, enabled, occasion, style, use_wardrobe_only, pinned_items
    }
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
    var ai_prompt: String?
    var ai_raw_response: String?
    var cost: OutfitCost?

    enum CodingKeys: String, CodingKey {
        case summary, generated_at, shirt, trouser, blazer, shoes, belt, reasoning
        case sweater, outerwear, tie
        case shirt_id, trouser_id, blazer_id, shoes_id, belt_id
        case sweater_id, outerwear_id, tie_id
        case matching_wardrobe_items, model_image, wardrobe_item_ids
        case ai_prompt, ai_raw_response, cost
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
        wardrobe_item_ids: [Int] = [],
        ai_prompt: String? = nil,
        ai_raw_response: String? = nil,
        cost: OutfitCost? = nil
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
        self.ai_prompt = ai_prompt
        self.ai_raw_response = ai_raw_response
        self.cost = cost
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
        ai_prompt = try c.decodeIfPresent(String.self, forKey: .ai_prompt)
        ai_raw_response = try c.decodeIfPresent(String.self, forKey: .ai_raw_response)
        cost = try c.decodeIfPresent(OutfitCost.self, forKey: .cost)
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
    /// Slot key → wardrobe item id (pins kept across generate/regenerate).
    var pinned_items: [String: Int]
    var outfit: WeekPlanOutfitResponse?

    enum CodingKeys: String, CodingKey {
        case day_of_week, enabled, occasion, style, use_wardrobe_only, pinned_items, outfit
    }

    init(
        day_of_week: Int,
        enabled: Bool,
        occasion: String,
        style: String = WeekPlanConstants.defaultStyle,
        use_wardrobe_only: Bool = true,
        pinned_items: [String: Int] = [:],
        outfit: WeekPlanOutfitResponse? = nil
    ) {
        self.day_of_week = day_of_week
        self.enabled = enabled
        self.occasion = occasion
        self.style = style
        self.use_wardrobe_only = use_wardrobe_only
        self.pinned_items = pinned_items
        self.outfit = outfit
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        day_of_week = try c.decode(Int.self, forKey: .day_of_week)
        enabled = try c.decodeIfPresent(Bool.self, forKey: .enabled) ?? false
        occasion = try c.decodeIfPresent(String.self, forKey: .occasion) ?? WeekPlanConstants.defaultOccasion
        style = try c.decodeIfPresent(String.self, forKey: .style) ?? WeekPlanConstants.defaultStyle
        use_wardrobe_only = try c.decodeIfPresent(Bool.self, forKey: .use_wardrobe_only) ?? true
        pinned_items = try c.decodeIfPresent([String: Int].self, forKey: .pinned_items) ?? [:]
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
                    pinned_items: [:],
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

struct WeekPlanHistoryItem: Codable, Equatable, Identifiable {
    var id: Int
    var label: String
    var created_at: String
    var enabled_day_count: Int
}

struct WeekPlanHistoryListResponse: Codable, Equatable {
    var items: [WeekPlanHistoryItem]
}

struct WeekPlanPresetConfigDay: Codable, Equatable {
    var day_of_week: Int
    var enabled: Bool
    var occasion: String
    var style: String
    var use_wardrobe_only: Bool
}

struct WeekPlanPresetConfig: Codable, Equatable {
    var reminder_time: String
    var shared_season: String
    var days: [WeekPlanPresetConfigDay]
}

struct WeekPlanPresetItem: Codable, Equatable, Identifiable {
    var id: Int
    var name: String
    var config: WeekPlanPresetConfig
    var created_at: String
    var updated_at: String
}

struct WeekPlanPresetListResponse: Codable, Equatable {
    var items: [WeekPlanPresetItem]
    var count: Int
    var limit: Int
    var limit_source: String?
}

struct WeekPlanPresetCreateRequest: Codable, Equatable {
    var name: String
    var config: WeekPlanPresetConfig
}

struct WeekPlanPresetUpdateRequest: Codable, Equatable {
    var name: String?
    var config: WeekPlanPresetConfig?
}

struct WeekPlanPresetLimitPatchRequest: Codable, Equatable {
    var limit: Int?
}

struct WeekPlanPresetLimitPatchResponse: Codable, Equatable {
    var user_id: Int
    var week_plan_preset_limit_override: Int?
}

enum WeekPlanPresetConstants {
    static let nameMaxLength = 40
}

enum WeekPlanDayStatus: String, Equatable {
    case ready
    case missing
    case restDay
    case notGenerated

    var label: String {
        switch self {
        case .ready: return WeekPlanCopy.statusReady
        case .missing: return WeekPlanCopy.statusNeedsOutfit
        case .restDay: return WeekPlanCopy.statusNotPlanned
        case .notGenerated: return WeekPlanCopy.statusNeedsOutfit
        }
    }

    /// Exceptional statuses only — Ready is omitted so overview cards stay quiet.
    var exceptionalLabel: String? {
        switch self {
        case .ready: return nil
        case .missing, .notGenerated: return WeekPlanCopy.statusNeedsOutfit
        case .restDay: return WeekPlanCopy.statusNotPlanned
        }
    }
}

enum WeekPlanPrimaryCTA: Equatable {
    case generate
    case save

    var title: String {
        switch self {
        case .generate: return WeekPlanCopy.generateOutfits
        case .save: return WeekPlanCopy.savePlan
        }
    }
}

enum WeekPlanDocumentState: Equatable {
    case generating
    case unsaved
    case lastSaved(Date)
    case saved

    var label: String {
        switch self {
        case .generating: return WeekPlanCopy.documentGenerating
        case .unsaved: return WeekPlanCopy.documentUnsaved
        case .lastSaved(let date):
            return WeekPlanCopy.documentLastSaved(WeekPlanDateFormatting.timeOnly(date))
        case .saved: return WeekPlanCopy.documentSaved
        }
    }
}

enum WeekPlanDateFormatting {
    /// Human-readable absolute date for history / template rows.
    static func humanReadable(_ iso: String) -> String {
        guard let date = parseISO(iso) else { return iso }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        formatter.doesRelativeDateFormatting = true
        return formatter.string(from: date)
    }

    static func timeOnly(_ date: Date) -> String {
        date.formatted(date: .omitted, time: .shortened)
    }

    static func weekRangeLabel(from reference: Date = Date()) -> String {
        var cal = Calendar.current
        cal.firstWeekday = 2
        let weekday = cal.component(.weekday, from: reference)
        let todayDow = (weekday + 5) % 7
        guard let monday = cal.date(byAdding: .day, value: -todayDow, to: reference),
              let sunday = cal.date(byAdding: .day, value: 6, to: monday) else {
            return ""
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "d MMM"
        return "\(formatter.string(from: monday)) – \(formatter.string(from: sunday))"
    }

    static func parseISO(_ iso: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: iso) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: iso)
    }
}

enum WeekPlanMissingAction: Equatable {
    case chooseFromWardrobe(dayOfWeek: Int)
    case findAlternative(dayOfWeek: Int)
    case continueWithout(dayOfWeek: Int)
}

/// Active Week Planner → Wardrobe pick session (Change / Add empty slot).
struct WardrobePickSession: Equatable {
    let dayOfWeek: Int
    /// Outfit field key: shirt, trouser, shoes, belt, blazer, etc. (`accessory` maps to belt).
    let slotKey: String

    var normalizedSlotKey: String {
        let key = slotKey.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return key == "accessory" ? "belt" : key
    }

    var categoryFilter: String { normalizedSlotKey }

    var slotLabel: String {
        switch normalizedSlotKey {
        case "shirt": return "Top"
        case "trouser": return "Bottom"
        case "shoes": return "Shoes"
        case "belt": return "Accessory"
        case "blazer": return "Blazer"
        case "sweater": return "Sweater"
        case "outerwear": return "Outerwear"
        case "tie": return "Tie"
        default:
            return slotKey.prefix(1).uppercased() + slotKey.dropFirst().lowercased()
        }
    }

    var bannerText: String {
        WeekPlanCopy.wardrobePickBanner(slotLabel: slotLabel, dayOfWeek: dayOfWeek)
    }
}

enum WeekPlanCopy {
    static let loading = "Loading your week…"
    static let generating = "Generating outfits…"
    static let emptyDays = "Turn on the days you want to plan."
    static let emptyWardrobe = "Add items to your wardrobe to generate outfits."
    static let savePlan = "Save plan"
    /// Legacy alias — prefer `generateOutfits`.
    static let generateWeek = "Generate outfits"
    static let generateOutfits = "Generate outfits"
    static let regenerate = "Regenerate this day"
    static let regenerateConfirmTitle = "Regenerate this day?"
    static let regenerateConfirmMessage = "This replaces the current outfit for this day."
    static let generateOverwriteTitle = "Generate new outfits?"
    static let generateOverwriteMessage = "This replaces outfits already on your plan."
    static let leaveUnsavedTitle = "Discard unsaved changes?"
    static let leaveUnsavedMessage = "You have unsaved changes that will be lost."
    static let todayTitle = "Today"
    static let reminderLabel = "Reminder"
    static let timezoneLabel = "Timezone"
    static let sharedStyleLabel = "Style for the week"
    static let sharedSeasonLabel = "Season"
    static let navTitle = "Week Planner"
    static let pageTitle = "Week Outfit Planner"
    static let pageSubtitle = "Select days, generate outfits, review each day, then save."
    static let noOutfitsTip =
        "Generate outfits for your week. Add wardrobe items first for closer matches."
    static let useWardrobe = "Use wardrobe"
    static let outfitDetails = "Outfit details"
    static let whyThisOutfitWorks = "Why this outfit works"
    static let addAccessory = "Add accessory"
    static let changeItem = "Change"
    static let pinnedBadge = "Pinned"
    static let unpin = "Unpin"
    static let planned = "Planned"
    static let includeDay = "Include day"
    static let notPlanned = "Not planned"
    static let clearPlan = "Clear plan"
    static let clearConfirmTitle = "Clear this week’s plan?"
    static let clearConfirmMessage = "A copy is saved under Plan history. You can Load it later, or set days and generate again."
    static let clearConfirmDelete = "Clear plan"
    static let previousPlans = "Plan history"
    static let planHistory = "Plan history"
    static let previousPlansHint =
        "Past weekly outfits from clear or regenerate. Load restores a backup. Not the same as Planning templates."
    static let loadPlan = "Load"
    static let viewAll = "View all"
    static let emptyHistory =
        "No plan history yet. Clear plan or regenerate after outfits exist to keep a copy here."
    static let planRestored = "Plan loaded."
    static let planSaved = "Plan saved."
    static let documentSaved = "Saved"
    static let documentUnsaved = "Unsaved changes"
    static let documentGenerating = "Generating…"
    static func documentLastSaved(_ time: String) -> String { "Last saved \(time)" }
    /// Kept for tests / legacy; not shown on overview cards (no Ready spam).
    static let statusReady = "Ready"
    static let statusNeedsOutfit = "Needs outfit"
    static let statusNotPlanned = "Not planned"
    static let statusEdited = "Edited"
    static let statusGenerating = "Generating"
    /// Legacy aliases
    static let statusMissing = "Needs outfit"
    static let statusRestDay = "Not planned"
    static let statusNotGenerated = "Needs outfit"
    static let chooseFromWardrobe = "Choose from wardrobe"
    static let findAlternative = "Find an alternative"
    static let continueWithout = "Continue without"
    static let missingItemsTitle = "Missing items"
    static let missingItemsHint = "Some outfit slots are empty for this day."
    static let wardrobePickCancel = "Cancel"
    static let wardrobePickSelect = "Select"
    static func wardrobePickBanner(slotLabel: String, dayOfWeek: Int) -> String {
        "Choose \(slotLabel) for \(WeekPlanConstants.dayName(for: dayOfWeek))"
    }
    static let weekOverview = "Week overview"
    static let dayDetail = "Selected day"
    static let savedConfigurations = "Planning templates"
    static let planningTemplates = "Planning templates"
    static let savedConfigurationsHint =
        "Prefs only (days, occasions, season) — no outfits. Load one, then Generate outfits. Not the same as Plan history."
    static let saveConfiguration = "Save template…"
    static let updateConfiguration = "Update"
    static let renameConfiguration = "Rename"
    static let deleteConfiguration = "Delete"
    static let loadConfiguration = "Load"
    static let emptyConfigurations =
        "No planning templates yet. Tap Save template… to store your current week setup."
    static let configurationSaved = "Template saved."
    static let configurationUpdated = "Template updated."
    static let configurationRenamed = "Template renamed."
    static let configurationDeleted = "Template deleted."
    static let configurationLoaded = "Template loaded. Tap Generate outfits when ready."
    static let configurationNameRequired = "Enter a name for this template."
    static let configurationApplyTitle = "Load this template?"
    static let configurationApplyMessage =
        "This replaces your current week setup and clears generated outfits."
    static let configurationDeleteTitle = "Delete this template?"
    static let configurationDeleteMessage = "This cannot be undone."
    static let loadHistoryConfirmTitle = "Load this plan?"
    static let loadHistoryConfirmMessage = "This replaces your current week and any unsaved changes."

    static func configurationUsage(count: Int, limit: Int) -> String {
        "\(count) of \(limit) saved"
    }

    static func configurationAtLimit(limit: Int) -> String {
        "You’ve reached your limit of \(limit) planning templates. Delete one to save another."
    }
}

/// Required outfit slots used for missing-item detection (empty strings).
/// Blazer and accessory (belt) are optional — empty means none needed / add later.
enum WeekPlanMissingSlots {
    static let required: [(category: String, label: String, keyPath: KeyPath<WeekPlanOutfitResponse, String>)] = [
        ("shirt", "Shirt", \.shirt),
        ("trouser", "Trousers", \.trouser),
        ("shoes", "Shoes", \.shoes),
    ]

    /// All core text slots used to detect whether an outfit has any content.
    static let contentSlots: [(category: String, label: String, keyPath: KeyPath<WeekPlanOutfitResponse, String>)] = [
        ("shirt", "Shirt", \.shirt),
        ("trouser", "Trousers", \.trouser),
        ("shoes", "Shoes", \.shoes),
        ("belt", "Belt", \.belt),
    ]

    static func missing(for outfit: WeekPlanOutfitResponse) -> [WeekPlanOutfitDisplay.SlotRow] {
        required.compactMap { entry in
            let text = outfit[keyPath: entry.keyPath].trimmingCharacters(in: .whitespacesAndNewlines)
            guard text.isEmpty else { return nil }
            return WeekPlanOutfitDisplay.SlotRow(
                category: entry.category,
                label: entry.label,
                description: ""
            )
        }
    }

    static func status(for day: WeekPlanDayResponse) -> WeekPlanDayStatus {
        guard day.enabled else { return .restDay }
        guard let outfit = day.outfit else { return .notGenerated }
        let hasSummary = !outfit.summary.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let hasAnySlot = contentSlots.contains {
            !outfit[keyPath: $0.keyPath].trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        if !hasSummary && !hasAnySlot { return .notGenerated }
        if !missing(for: outfit).isEmpty { return .missing }
        return .ready
    }
}

/// Presentation helpers for collapsible week-plan outfit UI (summary vs expanded slots).
enum WeekPlanOutfitDisplay {
    struct SlotRow: Equatable {
        let category: String
        let label: String
        let description: String
        /// Empty accessory placeholder (“Add accessory”).
        var isPlaceholder: Bool

        init(category: String, label: String, description: String, isPlaceholder: Bool = false) {
            self.category = category
            self.label = label
            self.description = description
            self.isPlaceholder = isPlaceholder
        }
    }

    /// Four aligned slots: top, bottom, shoes, optional accessory.
    static func fourSlotRows(for day: WeekPlanDayResponse) -> [SlotRow] {
        fourSlotRows(for: day.outfit, pinnedItems: day.pinned_items)
    }

    /// Four aligned slots: top, bottom, shoes, optional accessory.
    static func fourSlotRows(for outfit: WeekPlanOutfitResponse?, pinnedItems: [String: Int] = [:]) -> [SlotRow] {
        func text(_ value: String?) -> String {
            (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        }
        func isPinned(_ slotKey: String) -> Bool {
            pinnedItems[slotKey] != nil
        }
        guard let outfit else {
            return [
                SlotRow(category: "shirt", label: "Top", description: "", isPlaceholder: !isPinned("shirt")),
                SlotRow(category: "trouser", label: "Bottom", description: "", isPlaceholder: !isPinned("trouser")),
                SlotRow(category: "shoes", label: "Shoes", description: "", isPlaceholder: !isPinned("shoes")),
                SlotRow(
                    category: "accessory",
                    label: WeekPlanCopy.addAccessory,
                    description: "",
                    isPlaceholder: !isPinned("belt")
                ),
            ]
        }
        let top = text(outfit.shirt)
        let bottom = text(outfit.trouser)
        let shoes = text(outfit.shoes)
        let accessoryCandidates = [outfit.belt, outfit.tie ?? "", outfit.blazer].map(text).filter { !$0.isEmpty }
        let accessory = accessoryCandidates.first ?? ""

        return [
            SlotRow(
                category: "shirt",
                label: "Top",
                description: top,
                isPlaceholder: top.isEmpty && !isPinned("shirt")
            ),
            SlotRow(
                category: "trouser",
                label: "Bottom",
                description: bottom,
                isPlaceholder: bottom.isEmpty && !isPinned("trouser")
            ),
            SlotRow(
                category: "shoes",
                label: "Shoes",
                description: shoes,
                isPlaceholder: shoes.isEmpty && !isPinned("shoes")
            ),
            SlotRow(
                category: "accessory",
                label: accessory.isEmpty ? WeekPlanCopy.addAccessory : "Accessory",
                description: accessory,
                isPlaceholder: accessory.isEmpty && !isPinned("belt")
            ),
        ]
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

    static func hasAdminDiagnostics(_ outfit: WeekPlanOutfitResponse) -> Bool {
        let hasPrompt = !(outfit.ai_prompt ?? "").isEmpty
        let hasResponse = !(outfit.ai_raw_response ?? "").isEmpty
        return hasPrompt || hasResponse || outfit.cost != nil
    }

    static func slotRows(
        for outfit: WeekPlanOutfitResponse,
        season: String? = nil,
        occasion: String? = nil,
        style: String? = nil
    ) -> [SlotRow] {
        let suggestion = asOutfitSuggestion(outfit)
        let context = OutfitLayerExclusivity.LayerContext(
            season: season,
            occasion: occasion,
            style: style
        )
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
            allowedCategories: OutfitLayerExclusivity.optionalLayerCategories(
                for: suggestion,
                context: context
            )
        ) {
            // Extra guard: never show outerwear text the exclusivity helper would hide
            if item.category == "outerwear",
               OutfitLayerExclusivity.resolveOuterwearDisplayText(
                suggestion: suggestion,
                context: context
               ) == nil {
                continue
            }
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
