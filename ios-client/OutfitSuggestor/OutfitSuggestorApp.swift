//
//  OutfitSuggestorApp.swift
//  OutfitSuggestor
//
//  Main app entry point. RootView shows Login/Register when not authenticated,
//  then MainTabView (Suggest, History, Wardrobe, Settings, About) when logged in.
//

import SwiftUI

@main
struct OutfitSuggestorApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()  // Login/Register first, then main app when authenticated
        }
    }
}

