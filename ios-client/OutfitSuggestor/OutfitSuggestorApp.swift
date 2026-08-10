//
//  OutfitSuggestorApp.swift
//  OutfitSuggestor
//
//  Main app entry point. RootView shows Login/Register when not authenticated,
//  then MainTabView (Suggest, History, Wardrobe, Settings, About) when logged in.
//

import SwiftUI
#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

@main
struct OutfitSuggestorApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .onOpenURL { url in
#if canImport(GoogleSignIn)
                    if GIDSignIn.sharedInstance.handle(url) {
                        return
                    }
#endif
                    RouteCoordinator.shared.handleOpenURL(url)
                }
        }
    }
}

