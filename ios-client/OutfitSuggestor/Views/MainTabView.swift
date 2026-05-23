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
    @ObservedObject private var requestActivity = AppRequestActivity.shared
    @State private var selectedTab = 0
    
    private var isAdmin: Bool { auth.currentUser?.is_admin == true }
    
    var body: some View {
        ZStack {
            TabView(selection: $selectedTab) {
                NavigationStack {
                    MainFlowView(
                        viewModel: viewModel,
                        onRequestHistory: auth.isAuthenticated ? { selectedTab = 1 } : nil
                    )
                }
                .tabItem { Label("Suggest", systemImage: "sparkles") }
                .tag(0)
                
                if auth.isAuthenticated {
                    NavigationStack {
                        HistoryListView { entry in
                            viewModel.loadFromHistory(entry)
                            selectedTab = 0
                        }
                    }
                    .tabItem { Label("History", systemImage: "clock.arrow.circlepath") }
                    .tag(1)
                }
                
                if auth.isAuthenticated {
                    NavigationStack {
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
                    NavigationStack {
                        InsightsView()
                    }
                    .tabItem { Label("Insights", systemImage: "chart.bar.xaxis") }
                    .tag(3)
                }
                
                if isAdmin {
                    NavigationStack {
                        ReportsView()
                    }
                    .tabItem { Label("Reports", systemImage: "chart.bar") }
                    .tag(4)
                }
                
                NavigationStack {
                    SettingsView()
                }
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(6)
                
                NavigationStack {
                    UserGuideView()
                }
                .tabItem { Label("Guide", systemImage: "book") }
                .tag(7)
                
                NavigationStack {
                    AboutView()
                }
                .tabItem { Label("About", systemImage: "info.circle") }
                .tag(8)
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
            if !isAuthenticated && selectedTab != 0 && selectedTab != 6 && selectedTab != 7 && selectedTab != 8 {
                selectedTab = 0
            }
        }
    }
}
