//
//  MainTabView.swift
//  OutfitSuggestor
//
//  Tab navigation: Suggest, Wardrobe, Looks, Profile
//

import SwiftUI

struct GuestTabPlaceholderView: View {
    let title: String
    let message: String

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
                Text(message)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 28)

                NavigationLink(destination: LoginView()) {
                    Text("Log in")
                        .font(.headline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
                .buttonStyle(GradientButtonStyle())
                .padding(.horizontal, 32)

                NavigationLink(destination: RegisterView()) {
                    Text("Create account")
                        .font(.subheadline.weight(.semibold))
                }
                .foregroundColor(AppTheme.gradientStart)
            }
        }
        .navigationTitle(title)
    }
}

struct MainTabView: View {
    @StateObject private var viewModel = OutfitViewModel()
    @ObservedObject private var auth = AuthService.shared
    @ObservedObject private var requestActivity = AppRequestActivity.shared
    @State private var selectedTab = 0

    private var isAdmin: Bool { auth.currentUser?.is_admin == true }

    var body: some View {
        ZStack {
            TabView(selection: $selectedTab) {
                NavigationStack {
                    MainFlowView(
                        viewModel: viewModel,
                        onRequestHistory: { selectedTab = 2 },
                        onNavigateToProfile: { selectedTab = 3 }
                    )
                }
                .tabItem { Label("Suggest", systemImage: "sparkles") }
                .tag(0)

                NavigationStack {
                    if auth.isAuthenticated {
                        WardrobeListView(
                            onGetSuggestionFromItem: { itemId in
                                selectedTab = 0
                                Task { await viewModel.getSuggestionFromWardrobeItem(id: itemId) }
                            },
                            onSelectHistorySuggestion: { entry in
                                viewModel.loadFromHistory(entry)
                                selectedTab = 0
                            }
                        )
                    } else {
                        GuestTabPlaceholderView(
                            title: "Wardrobe",
                            message: "Sign in to save clothing items and get wardrobe-aware outfit suggestions."
                        )
                    }
                }
                .tabItem { Label("Wardrobe", systemImage: "tshirt") }
                .tag(1)

                NavigationStack {
                    if auth.isAuthenticated {
                        HistoryListView { entry in
                            viewModel.loadFromHistory(entry)
                            selectedTab = 0
                        }
                    } else {
                        GuestTabPlaceholderView(
                            title: "Looks",
                            message: "Sign in to browse your saved outfit history and reload past looks."
                        )
                    }
                }
                .tabItem { Label("Looks", systemImage: "clock.arrow.circlepath") }
                .tag(2)

                NavigationStack {
                    SettingsView()
                }
                .tabItem { Label("Profile", systemImage: "person.crop.circle") }
                .tag(3)
            }
            .allowsHitTesting(!requestActivity.isBusy)

            if requestActivity.isBusy {
                Color.black.opacity(0.22)
                    .ignoresSafeArea()
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("Global Loading Lock")
                    .accessibilityIdentifier("global.loadingLock")
            }
        }
        .tint(AppTheme.accent)
        .preferredColorScheme(.dark)
        .onChange(of: auth.isAuthenticated) { isAuthenticated in
            if isAuthenticated {
                selectedTab = 0
            } else if selectedTab == 1 || selectedTab == 2 {
                selectedTab = 0
            }
        }
    }
}
