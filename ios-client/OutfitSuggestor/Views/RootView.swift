//
//  RootView.swift
//  OutfitSuggestor
//
//  Shows Login/Register when not authenticated, MainTabView when authenticated.
//

import SwiftUI

struct RootView: View {
    @ObservedObject var auth = AuthService.shared
    
    var body: some View {
        Group {
            if auth.isAuthenticated {
                MainTabView()
            } else {
                NavigationView {
                    LoginRegisterChoiceView()
                }
            }
        }
    }
}

struct LoginRegisterChoiceView: View {
    var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(spacing: 24) {
                Text("AI Outfit Suggestor").font(.title.bold())
                Text("Log in to save history, manage wardrobe, and use random picks.")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                NavigationLink(destination: LoginView()) {
                    Text("Log in").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                NavigationLink(destination: RegisterView()) {
                    Text("Sign up").frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
            .padding()
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .navigationTitle("Welcome")
    }
}
