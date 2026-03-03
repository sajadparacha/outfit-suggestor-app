//
//  ContentView.swift
//  OutfitSuggestor
//
//  Use RootView so login/register are shown when not authenticated.
//  (RootView shows LoginRegisterChoiceView → LoginView / RegisterView, then MainTabView when logged in.)
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        RootView()
    }
}

// MARK: - Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        RootView()
    }
}

