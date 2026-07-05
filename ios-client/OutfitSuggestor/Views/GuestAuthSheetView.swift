//
//  GuestAuthSheetView.swift
//  OutfitSuggestor
//
//  Contextual login/register sheet for guest users.
//

import SwiftUI

enum GuestAuthSheetDestination: Hashable {
    case login
    case register
}

/// Bundles context + destination so `.sheet(item:)` always presents the intended auth screen.
struct GuestAuthSheetPresentation: Identifiable {
    let id = UUID()
    let context: AuthPromptContext
    let destination: GuestAuthSheetDestination
}

struct GuestAuthSheetView: View {
    let context: AuthPromptContext
    let destination: GuestAuthSheetDestination

    @ObservedObject private var auth = AuthService.shared
    @Environment(\.dismiss) private var dismiss

    private var copy: AuthPromptContent {
        AuthPromptCopy.content(for: context)
    }

    var body: some View {
        NavigationStack {
            Group {
                switch destination {
                case .login:
                    LoginView(
                        headline: copy.headline,
                        subheadline: copy.subheadline
                    )
                case .register:
                    RegisterView(
                        headline: copy.headline,
                        subheadline: copy.subheadline
                    )
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .onChange(of: auth.isAuthenticated) { isAuthenticated in
            if isAuthenticated {
                dismiss()
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }
}
