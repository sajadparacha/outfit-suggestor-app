//
//  MainTabView.swift
//  OutfitSuggestor
//
//  Tab navigation: Main, History, Wardrobe, Insights, Reports (admin), Integration Tests (admin), Settings, Guide, About
//

import SwiftUI

struct MainTabView: View {
    @StateObject private var viewModel = OutfitViewModel()
    @ObservedObject private var auth = AuthService.shared
    @State private var selectedTab = 0
    
    private var isAdmin: Bool { auth.currentUser?.is_admin == true }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationView {
                MainFlowView(viewModel: viewModel)
            }
            .tabItem { Label("Suggest", systemImage: "sparkles") }
            .tag(0)
            
            NavigationView {
                HistoryListView { entry in
                    viewModel.loadFromHistory(entry)
                    selectedTab = 0
                }
            }
            .tabItem { Label("History", systemImage: "clock.arrow.circlepath") }
            .tag(1)
            
            NavigationView {
                WardrobeListView(onGetSuggestionFromItem: { itemId in
                    selectedTab = 0
                    Task { await viewModel.getSuggestionFromWardrobeItem(id: itemId) }
                })
            }
            .tabItem { Label("Wardrobe", systemImage: "tshirt") }
            .tag(2)
            
            NavigationView {
                InsightsView()
            }
            .tabItem { Label("Insights", systemImage: "chart.bar.xaxis") }
            .tag(3)
            
            if isAdmin {
                NavigationView {
                    ReportsView()
                }
                .tabItem { Label("Reports", systemImage: "chart.bar") }
                .tag(4)
                
                NavigationView {
                    IntegrationTestRunnerView()
                }
                .tabItem { Label("Tests", systemImage: "testtube.2") }
                .tag(5)
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
    }
}
