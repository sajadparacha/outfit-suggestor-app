//
//  RouteCoordinator.swift
//  OutfitSuggestor
//
//  Maps canonical web paths to tab selection and Profile-tab navigation stack pushes.
//  See AppRoute.swift for the route ↔ tab table.
//

import SwiftUI

@MainActor
final class RouteCoordinator: ObservableObject {
    static let shared = RouteCoordinator()

    @Published var selectedTab: AppRoute.TabIndex = .suggest
    @Published var profilePath = NavigationPath()
    @Published var wardrobeCategoryFilter: String?

    private init() {}

    func handleOpenURL(_ url: URL) {
        handleIncomingRoute(AppRoute.pathFromURL(url))
    }

    func handleIncomingRoute(_ rawPath: String) {
        let parsed = AppRoute.parse(rawPath)
        let path = AppRoute.isKnown(path: parsed.path) ? parsed.path : AppRoute.home
        applyRoute(path: path, queryItems: parsed.queryItems)
    }

    private func applyRoute(path: String, queryItems: [URLQueryItem]) {
        let auth = AuthService.shared
        let effectivePath = resolvedPath(path, auth: auth)
        let parsed = AppRoute.parse(effectivePath)

        if parsed.path == AppRoute.wardrobe,
           let category = parsed.wardrobeCategory ?? queryItems.first(where: { $0.name == "category" })?.value?.nonEmpty {
            wardrobeCategoryFilter = category
        }

        guard let tab = AppRoute.tabIndex(for: parsed.path) else {
            navigateToHome()
            return
        }

        profilePath = NavigationPath()
        selectedTab = tab

        if let destination = AppRoute.profileDestination(for: parsed.path) {
            guard canShowProfileDestination(destination, auth: auth) else {
                return
            }
            profilePath.append(destination)
        }
    }

    private func resolvedPath(_ path: String, auth: AuthService) -> String {
        switch path {
        case AppRoute.wardrobe, AppRoute.history, AppRoute.insights:
            if !auth.isAuthenticated {
                return AppRoute.home
            }
            return path
        case AppRoute.adminReports, AppRoute.adminIntegrationTests:
            if auth.currentUser?.is_admin != true {
                return AppRoute.home
            }
            return path
        default:
            return path
        }
    }

    private func canShowProfileDestination(_ destination: AppRoute.ProfileDestination, auth: AuthService) -> Bool {
        switch destination {
        case .insights:
            return auth.isAuthenticated
        case .adminReports:
            return auth.currentUser?.is_admin == true
        case .adminIntegrationTests:
            return auth.currentUser?.is_admin == true
        case .guide, .about:
            return true
        }
    }

    private func navigateToHome() {
        profilePath = NavigationPath()
        selectedTab = .suggest
    }

    @ViewBuilder
    func profileDestinationView(for destination: AppRoute.ProfileDestination) -> some View {
        switch destination {
        case .insights:
            InsightsView()
        case .guide:
            UserGuideView(isAdmin: AdminVisibility.isAdmin(user: AuthService.shared.currentUser))
        case .about:
            AboutView(isAdmin: AdminVisibility.isAdmin(user: AuthService.shared.currentUser))
        case .adminReports:
            ReportsView()
        case .adminIntegrationTests:
            AdminIntegrationTestRunnerView()
        }
    }
}

private extension String {
    var nonEmpty: String? {
        isEmpty ? nil : self
    }
}
