//
//  OAuthSignInSectionView.swift
//  OutfitSuggestor
//
//  Shared Google/Apple OAuth buttons for login and register flows.
//

import SwiftUI

struct OAuthSignInSectionView: View {
    @ObservedObject var auth: AuthService
    @Binding var isBusy: Bool
    @Binding var errorMessage: String?

    var googleSignIn: GoogleSignInProviding = GoogleSignInProvider()
    @State private var appleCoordinator = AppleSignInCoordinator()

    var body: some View {
        VStack(spacing: 12) {
            oauthDivider

            oauthButton(
                title: OAuthCopy.googleButtonTitle,
                systemImage: "g.circle.fill",
                accessibilityIdentifier: "auth.oauth.google"
            ) {
                try await signInWithGoogle()
            }

            oauthButton(
                title: OAuthCopy.appleButtonTitle,
                systemImage: "apple.logo",
                accessibilityIdentifier: "auth.oauth.apple"
            ) {
                try await signInWithApple()
            }
        }
    }

    private var oauthDivider: some View {
        HStack(spacing: 12) {
            Rectangle()
                .fill(AppTheme.border)
                .frame(height: 1)
            Text(OAuthCopy.dividerTitle)
                .font(.footnote.weight(.medium))
                .foregroundColor(AppTheme.textSecondary)
            Rectangle()
                .fill(AppTheme.border)
                .frame(height: 1)
        }
        .padding(.vertical, 4)
    }

    private func oauthButton(
        title: String,
        systemImage: String,
        accessibilityIdentifier: String,
        action: @escaping () async throws -> Void
    ) -> some View {
        Button {
            guard !isBusy else { return }
            errorMessage = nil
            isBusy = true
            Task {
                do {
                    _ = try await action()
                    await MainActor.run { isBusy = false }
                } catch {
                    await MainActor.run {
                        isBusy = false
                        errorMessage = AuthFormMessages.loginErrorDescription(error)
                    }
                }
            }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: systemImage)
                    .font(.body.weight(.semibold))
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Spacer(minLength: 0)
            }
            .foregroundColor(AppTheme.textPrimary)
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(AppTheme.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(AppTheme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .disabled(isBusy)
        .accessibilityIdentifier(accessibilityIdentifier)
    }

    private func signInWithGoogle() async throws {
        let idToken = try await googleSignIn.fetchIDToken()
        _ = try await auth.oauthLogin(provider: .google, idToken: idToken)
    }

    @MainActor
    private func signInWithApple() async throws {
        let idToken = try await appleCoordinator.fetchIDToken()
        _ = try await auth.oauthLogin(provider: .apple, idToken: idToken)
    }
}
