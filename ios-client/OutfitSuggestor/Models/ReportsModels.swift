//
//  ReportsModels.swift
//  OutfitSuggestor
//
//  Admin reports DTOs (timeline + search aggregates).
//

import Foundation

// MARK: - Access log timeline

struct AccessLogTimelineResponse: Codable, Equatable {
    let group_by: String?
    let timeline: [TimelinePoint]
}

struct TimelinePoint: Codable, Equatable, Identifiable {
    let period: String
    let count: Int

    var id: String { period }
}

// MARK: - Search reports

struct SearchReportsResponse: Codable, Equatable {
    let total_searches: Int
    let by_occasion: [SearchAggregateItem]
    let by_season: [SearchAggregateItem]
    let by_style: [SearchAggregateItem]
    let timeline: [TimelinePoint]
    let recent: [SearchRecentEntry]
}

struct SearchAggregateItem: Codable, Equatable, Identifiable {
    let occasion: String?
    let season: String?
    let style: String?
    let count: Int

    var id: String {
        occasion ?? season ?? style ?? "\(count)"
    }

    var label: String {
        occasion ?? season ?? style ?? "—"
    }
}

struct SearchRecentEntry: Codable, Equatable, Identifiable {
    let id: Int
    let created_at: String?
    let occasion: String?
    let season: String?
    let style: String?
    let user_id: Int?
    let user_email: String?
    let user_name: String?
}

// MARK: - Usage breakdown (full backend shape)

struct AccessLogUsageBreakdown: Codable, Equatable {
    let ai_calls: UsageAICalls?
    let wardrobe_operations: UsageWardrobeOperations?
    let outfit_history: UsageOutfitHistory?
    let top_users: [UsageTopUser]?
}

struct UsageAICalls: Codable, Equatable {
    let outfit_suggestions: Int?
    let wardrobe_analysis: Int?
    let total: Int?
    let unique_users: Int?
    let average_response_time_ms: Double?
}

struct UsageWardrobeOperations: Codable, Equatable {
    let add: Int?
    let update: Int?
    let delete: Int?
    let view: Int?
    let check_duplicate: Int?
    let summary: Int?
    let total: Int?
    let unique_users: Int?
    let average_response_time_ms: Double?
}

struct UsageOutfitHistory: Codable, Equatable {
    let views: Int?
    let unique_users: Int?
}

struct UsageTopUser: Codable, Equatable, Identifiable {
    let user_id: Int?
    let user_email: String?
    let user_name: String?
    let ai_outfit_suggestions: Int?
    let ai_wardrobe_analysis: Int?
    let wardrobe_add: Int?
    let outfit_history_views: Int?
    let total_operations: Int?

    var id: String {
        if let user_id { return "\(user_id)" }
        return user_email ?? user_name ?? UUID().uuidString
    }
}

struct CityCount: Codable, Equatable, Identifiable {
    let city: String
    let country: String?
    let count: Int

    var id: String { "\(city)-\(country ?? "")" }
}
