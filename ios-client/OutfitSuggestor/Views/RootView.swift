//
//  RootView.swift
//  OutfitSuggestor
//
//  Root shell. Main app is available in guest mode; auth unlocks extra features.
//

import SwiftUI

struct RootView: View {
    @ObservedObject var auth = AuthService.shared
    
    var body: some View {
        if auth.isBootstrapping {
            ZStack {
                LinearGradient(
                    colors: [AppTheme.bgPrimary, AppTheme.bgSecondary],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                ProgressView("Restoring session...")
                    .foregroundColor(AppTheme.textPrimary)
            }
        } else {
            MainTabView()
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
