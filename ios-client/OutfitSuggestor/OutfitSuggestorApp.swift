//
//  OutfitSuggestorApp.swift
//  OutfitSuggestor
//
//  Main app entry point. RootView shows Login/Register when not authenticated,
//  then MainTabView (Suggest, History, Wardrobe, Settings, About) when logged in.
//

import GoogleSignIn
import SwiftUI

@main
struct OutfitSuggestorApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .onOpenURL { url in
                    if GIDSignIn.sharedInstance.handle(url) {
                        return
                    }
                    RouteCoordinator.shared.handleOpenURL(url)
                }
        }
    }
}
