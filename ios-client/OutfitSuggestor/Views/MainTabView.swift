//
//  MainTabView.swift
//  OutfitSuggestor
//
//  Tab navigation: Suggest, Wardrobe, Looks, Profile
//

import SwiftUI

struct GuestTabPlaceholderView: View {
    let title: String
    let context: AuthPromptContext

    @State private var showAuthSheet = false
    @State private var authSheetDestination: GuestAuthSheetDestination = .register

    private var copy: AuthPromptContent {
        AuthPromptCopy.content(for: context)
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [AppTheme.bgPrimary, AppTheme.bgSecondary],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 16) {
                Image(systemName: "person.crop.circle.badge.exclamationmark")
                    .font(.system(size: 48))
                    .foregroundColor(AppTheme.gradientStart)

                Text(copy.headline)
                    .font(.title3.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 28)

                if let subheadline = copy.subheadline {
                    Text(subheadline)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 28)
                }

                Button {
                    authSheetDestination = .register
                    showAuthSheet = true
                } label: {
                    Text("Create account")
                        .font(.headline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
                .buttonStyle(GradientButtonStyle())
                .padding(.horizontal, 32)

                Button {
                    authSheetDestination = .login
                    showAuthSheet = true
                } label: {
                    Text("Sign in")
                        .font(.subheadline.weight(.semibold))
                }
                .foregroundColor(AppTheme.gradientStart)
            }
        }
        .navigationTitle(title)
        .sheet(isPresented: $showAuthSheet) {
            GuestAuthSheetView(context: context, destination: authSheetDestination)
        }
    }
}

struct MainTabView: View {
    @StateObject private var viewModel = OutfitViewModel()
    @ObservedObject private var auth = AuthService.shared
    @ObservedObject private var routeCoordinator = RouteCoordinator.shared

    private var isAdmin: Bool { auth.currentUser?.is_admin == true }

    var body: some View {
        TabView(selection: $routeCoordinator.selectedTab) {
            NavigationStack {
                MainFlowView(
                    viewModel: viewModel,
                    onRequestHistory: { routeCoordinator.selectedTab = .history },
                    onNavigateToProfile: { routeCoordinator.selectedTab = .profile }
                )
            }
            .tabItem { Label("Suggest", systemImage: "sparkles") }
            .tag(AppRoute.TabIndex.suggest)

            NavigationStack {
                if auth.isAuthenticated {
                    WardrobeListView(
                        initialCategoryFilter: routeCoordinator.wardrobeCategoryFilter,
                        onConsumeCategoryFilter: { routeCoordinator.wardrobeCategoryFilter = nil },
                        onGetSuggestionFromItem: { item in
                            if viewModel.preloadWardrobeItemForSuggestion(item: item) {
                                routeCoordinator.selectedTab = .suggest
                            }
                        },
                        onSelectHistorySuggestion: { entry in
                            viewModel.loadFromHistory(entry)
                            routeCoordinator.selectedTab = .suggest
                        }
                    )
                } else {
                    GuestTabPlaceholderView(
                        title: "Wardrobe",
                        context: .wardrobe
                    )
                }
            }
            .tabItem { Label("Wardrobe", systemImage: "tshirt") }
            .tag(AppRoute.TabIndex.wardrobe)

            NavigationStack {
                if auth.isAuthenticated {
                    HistoryListView { entry in
                        viewModel.loadFromHistory(entry)
                        routeCoordinator.selectedTab = .suggest
                    }
                } else {
                    GuestTabPlaceholderView(
                        title: "Looks",
                        context: .history
                    )
                }
            }
            .tabItem { Label("Looks", systemImage: "clock.arrow.circlepath") }
            .tag(AppRoute.TabIndex.history)

            NavigationStack(path: $routeCoordinator.profilePath) {
                SettingsView()
                    .navigationDestination(for: AppRoute.ProfileDestination.self) { destination in
                        routeCoordinator.profileDestinationView(for: destination)
                    }
            }
            .tabItem { Label("Profile", systemImage: "person.crop.circle") }
            .tag(AppRoute.TabIndex.profile)
        }
        .environmentObject(viewModel)
        .tint(AppTheme.accent)
        .preferredColorScheme(.dark)
        .onChange(of: auth.isAuthenticated) { isAuthenticated in
            if isAuthenticated {
                routeCoordinator.selectedTab = .suggest
            } else if routeCoordinator.selectedTab == .wardrobe || routeCoordinator.selectedTab == .history {
                routeCoordinator.selectedTab = .suggest
            }
        }
    }
}
