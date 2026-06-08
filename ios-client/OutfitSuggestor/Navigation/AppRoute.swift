//
//  AppRoute.swift
//  OutfitSuggestor
//
//  Canonical route paths aligned with web (react-router) for deep-link parity.
//
//  Route ↔ tab mapping:
//  | Path                      | Tab (index) | Profile stack push      |
//  |---------------------------|-------------|-------------------------|
//  | /                         | Suggest (0) | —                       |
//  | /wardrobe                 | Wardrobe (1)| —                       |
//  | /history                  | Looks (2)   | —                       |
//  | /insights                 | Profile (3) | InsightsView            |
//  | /guide                    | Profile (3) | UserGuideView           |
//  | /about                    | Profile (3) | AboutView               |
//  | /settings                 | Profile (3) | — (root SettingsView)   |
//  | /admin/reports            | Profile (3) | ReportsView             |
//  | /admin/integration-tests  | Profile (3) | AdminIntegrationTest…   |
//
//  Unknown paths redirect to `/`.
//  Query: `/wardrobe?category=shirt` seeds wardrobe category filter.
//

import Foundation

enum AppRoute {
    static let urlScheme = "outfitsuggestor"

    static let home = "/"
    static let wardrobe = "/wardrobe"
    static let history = "/history"
    static let insights = "/insights"
    static let guide = "/guide"
    static let about = "/about"
    static let settings = "/settings"
    static let adminReports = "/admin/reports"
    static let adminIntegrationTests = "/admin/integration-tests"

    static let allPaths: Set<String> = [
        home,
        wardrobe,
        history,
        insights,
        guide,
        about,
        settings,
        adminReports,
        adminIntegrationTests,
    ]

    enum TabIndex: Int, CaseIterable {
        case suggest = 0
        case wardrobe = 1
        case history = 2
        case profile = 3
    }

    enum ProfileDestination: String, Hashable {
        case insights
        case guide
        case about
        case adminReports
        case adminIntegrationTests
    }

    struct ParsedRoute {
        let path: String
        let queryItems: [URLQueryItem]

        var wardrobeCategory: String? {
            queryItems.first(where: { $0.name == "category" })?.value?
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .nonEmpty
        }
    }

    static func parse(_ rawPath: String) -> ParsedRoute {
        let trimmed = rawPath.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalized = trimmed.hasPrefix("/") ? trimmed : "/\(trimmed)"

        guard let questionMark = normalized.firstIndex(of: "?") else {
            return ParsedRoute(path: normalized, queryItems: [])
        }

        let path = String(normalized[..<questionMark])
        let query = String(normalized[normalized.index(after: questionMark)...])
        var components = URLComponents()
        components.query = query
        return ParsedRoute(path: path.isEmpty ? home : path, queryItems: components.queryItems ?? [])
    }

    static func isKnown(path: String) -> Bool {
        allPaths.contains(path)
    }

    static func tabIndex(for path: String) -> TabIndex? {
        switch path {
        case home: return .suggest
        case wardrobe: return .wardrobe
        case history: return .history
        case insights, guide, about, settings, adminReports, adminIntegrationTests: return .profile
        default: return nil
        }
    }

    static func profileDestination(for path: String) -> ProfileDestination? {
        switch path {
        case insights: return .insights
        case guide: return .guide
        case about: return .about
        case adminReports: return .adminReports
        case adminIntegrationTests: return .adminIntegrationTests
        default: return nil
        }
    }

    /// Extracts a canonical path (+ query) from custom-scheme or path-style URLs.
    static func pathFromURL(_ url: URL) -> String {
        if url.scheme?.lowercased() == urlScheme {
            if let host = url.host, !host.isEmpty, host != "/" {
                var path = "/\(host)"
                let urlPath = url.path
                if !urlPath.isEmpty, urlPath != "/" {
                    path += urlPath.hasPrefix("/") ? urlPath : "/\(urlPath)"
                }
                return appendQuery(path, from: url)
            }
            if !url.path.isEmpty {
                let path = url.path.hasPrefix("/") ? url.path : "/\(url.path)"
                return appendQuery(path, from: url)
            }
            return home
        }

        if !url.path.isEmpty {
            let path = url.path.hasPrefix("/") ? url.path : "/\(url.path)"
            return appendQuery(path, from: url)
        }

        return home
    }

    private static func appendQuery(_ path: String, from url: URL) -> String {
        guard let query = url.query, !query.isEmpty else { return path }
        return "\(path)?\(query)"
    }
}

private extension String {
    var nonEmpty: String? {
        isEmpty ? nil : self
    }
}
