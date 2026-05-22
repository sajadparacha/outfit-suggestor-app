//
//  MainTabView.swift
//  OutfitSuggestor
//
//  Tab navigation: Main, History, Wardrobe, Insights, Reports (admin), Settings, Guide, About
//

import SwiftUI

struct MainTabView: View {
    @StateObject private var viewModel = OutfitViewModel()
    @ObservedObject private var auth = AuthService.shared
    @State private var selectedTab = 0
    
    private var isAdmin: Bool { auth.currentUser?.is_admin == true }
    
    var body: some View {
        ZStack {
            TabView(selection: $selectedTab) {
                NavigationView {
                    MainFlowView(
                        viewModel: viewModel,
                        onRequestHistory: auth.isAuthenticated ? { selectedTab = 1 } : nil
                    )
                }
                .tabItem { Label("Suggest", systemImage: "sparkles") }
                .tag(0)
                
                if auth.isAuthenticated {
                    NavigationView {
                        HistoryListView { entry in
                            viewModel.loadFromHistory(entry)
                            selectedTab = 0
                        }
                    }
                    .tabItem { Label("History", systemImage: "clock.arrow.circlepath") }
                    .tag(1)
                }
                
                if auth.isAuthenticated {
                    NavigationView {
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
                    }
                    .tabItem { Label("Wardrobe", systemImage: "tshirt") }
                    .tag(2)
                }
                
                if auth.isAuthenticated {
                    NavigationView {
                        InsightsView()
                    }
                    .tabItem { Label("Insights", systemImage: "chart.bar.xaxis") }
                    .tag(3)
                }
                
                if isAdmin {
                    NavigationView {
                        ReportsView()
                    }
                    .tabItem { Label("Reports", systemImage: "chart.bar") }
                    .tag(4)
                }
                
                NavigationView {
                    SettingsView()
                }
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(6)
                
                NavigationView {
                    UserGuideView()
                }
                .tabItem { Label("Guide", systemImage: "book") }
                .tag(7)
                
                NavigationView {
                    AboutView()
                }
                .tabItem { Label("About", systemImage: "info.circle") }
                .tag(8)
            }
            .allowsHitTesting(!viewModel.isLoading)

            if viewModel.isLoading {
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
            if !isAuthenticated && selectedTab != 0 && selectedTab != 6 && selectedTab != 7 && selectedTab != 8 {
                selectedTab = 0
            }
        }
    }
}
