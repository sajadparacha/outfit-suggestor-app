//
//  ReportsViewModel.swift
//  OutfitSuggestor
//
//  Admin reports state, filters, and API orchestration.
//

import Foundation

enum ReportTab: String, CaseIterable, Identifiable {
    case overview = "Overview"
    case utilization = "Utilization"
    case users = "Users"
    case searches = "Searches"

    var id: String { rawValue }
}

struct ReportFilters: Equatable {
    var startDate = ""
    var endDate = ""
    var user = ""
    var country = ""
    var operationType = ""
    var endpoint = ""

    static let empty = ReportFilters()
}

enum ReportsCopy {
    static let nonAdminMessage = "Admin privileges are required to view reports."
    static let readyPrompt = "Ready when you are. Set your filters above, then click Search to load reports."
    static let noDataMessage = "No data for the selected filters."
    static let searchingLabel = "Searching…"
    static let searchButton = "Search"
    static let clearButton = "Clear"
    static let headerTitle = "Admin Reports"
    static let headerSubtitle = "Access logs and usage analytics (admin-only)"
}

enum ReportsQueryBuilder {
    static func optionalDate(_ value: String) -> String? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    static func userFilterQueryItems(from user: String) -> [URLQueryItem] {
        let trimmed = user.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }
        if let userId = Int(trimmed) {
            return [URLQueryItem(name: "user_id", value: "\(userId)")]
        }
        return [URLQueryItem(name: "user", value: trimmed)]
    }

    static func timelineQueryItems(filters: ReportFilters, groupBy: String = "day") -> [URLQueryItem] {
        var items = [URLQueryItem(name: "group_by", value: groupBy)]
        if let start = optionalDate(filters.startDate) {
            items.append(URLQueryItem(name: "start_date", value: start))
        }
        if let end = optionalDate(filters.endDate) {
            items.append(URLQueryItem(name: "end_date", value: end))
        }
        if let country = optionalDate(filters.country) {
            items.append(URLQueryItem(name: "country", value: country))
        }
        items.append(contentsOf: userFilterQueryItems(from: filters.user))
        return items
    }

    static func searchReportsQueryItems(filters: ReportFilters) -> [URLQueryItem] {
        var items: [URLQueryItem] = []
        if let start = optionalDate(filters.startDate) {
            items.append(URLQueryItem(name: "start_date", value: start))
        }
        if let end = optionalDate(filters.endDate) {
            items.append(URLQueryItem(name: "end_date", value: end))
        }
        items.append(contentsOf: userFilterQueryItems(from: filters.user))
        return items
    }

    static func accessLogsParams(filters: ReportFilters) -> APIService.AccessLogsParams {
        var params = APIService.AccessLogsParams(limit: 100, offset: 0)
        params.startDate = optionalDate(filters.startDate)
        params.endDate = optionalDate(filters.endDate)
        params.user = optionalDate(filters.user)
        params.country = optionalDate(filters.country)
        params.operationType = optionalDate(filters.operationType)
        params.endpoint = optionalDate(filters.endpoint)
        return params
    }

    static func searchReportsParams(filters: ReportFilters) -> APIService.SearchReportsParams {
        var params = APIService.SearchReportsParams()
        params.startDate = optionalDate(filters.startDate)
        params.endDate = optionalDate(filters.endDate)
        params.userId = parsedUserId(from: filters.user)
        if params.userId == nil, let user = optionalDate(filters.user) {
            params.user = user
        }
        return params
    }

    static func parsedUserId(from user: String) -> Int? {
        let trimmed = user.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let value = Int(trimmed) else { return nil }
        return value
    }

    static func queryValue(named name: String, in items: [URLQueryItem]) -> String? {
        items.first(where: { $0.name == name })?.value
    }
}

@MainActor
final class ReportsViewModel: ObservableObject {
    @Published var selectedTab: ReportTab = .overview
    @Published var filters = ReportFilters.empty
    @Published var stats: AccessLogStatsResponse?
    @Published var timeline: AccessLogTimelineResponse?
    @Published var usage: AccessLogUsageBreakdown?
    @Published var searchReports: SearchReportsResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var hasSearched = false

    var isAdmin: Bool

    init(isAdmin: Bool) {
        self.isAdmin = isAdmin
    }

    func clear() {
        filters = .empty
        stats = nil
        timeline = nil
        usage = nil
        searchReports = nil
        errorMessage = nil
        hasSearched = false
    }

    func dismissError() {
        errorMessage = nil
    }

    func search() async {
        guard isAdmin else {
            errorMessage = ReportsCopy.nonAdminMessage
            return
        }

        isLoading = true
        errorMessage = nil

        let start = ReportsQueryBuilder.optionalDate(filters.startDate)
        let end = ReportsQueryBuilder.optionalDate(filters.endDate)
        let country = ReportsQueryBuilder.optionalDate(filters.country)
        let userId = ReportsQueryBuilder.parsedUserId(from: filters.user)
        let user = userId == nil ? ReportsQueryBuilder.optionalDate(filters.user) : nil
        let searchParams = ReportsQueryBuilder.searchReportsParams(filters: filters)

        do {
            async let statsTask = APIService.shared.getAccessLogStats(
                startDate: start,
                endDate: end,
                user: user,
                userId: userId
            )
            async let timelineTask = APIService.shared.getAccessLogTimeline(
                startDate: start,
                endDate: end,
                groupBy: "day",
                city: nil,
                country: country,
                user: user,
                userId: userId
            )
            async let usageTask = APIService.shared.getAccessLogUsage(
                startDate: start,
                endDate: end,
                user: user,
                userId: userId
            )
            async let searchTask = APIService.shared.getSearchReports(params: searchParams)

            let (loadedStats, loadedTimeline, loadedUsage, loadedSearch) = try await (
                statsTask,
                timelineTask,
                usageTask,
                searchTask
            )

            stats = loadedStats
            timeline = loadedTimeline
            usage = loadedUsage
            searchReports = loadedSearch
            hasSearched = true
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }
}
