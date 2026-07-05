//
//  LoginView.swift
//  OutfitSuggestor
//

import SwiftUI

struct LoginView: View {
    var headline: String? = nil
    var subheadline: String? = nil

    @ObservedObject var auth = AuthService.shared
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var isLoading = false

    private var resolvedHeadline: String {
        headline ?? AuthPromptCopy.defaultLoginTitle
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if headline != nil || subheadline != nil {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(resolvedHeadline)
                            .font(.headline)
                            .foregroundColor(AppTheme.textPrimary)
                        if let subheadline {
                            Text(subheadline)
                                .font(.subheadline)
                                .foregroundColor(AppTheme.textSecondary)
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Log in")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)

                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(12)
                        .background(AppTheme.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(AppTheme.border, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .accessibilityIdentifier("auth.login.email")

                    SecureField("Password", text: $password)
                        .textContentType(.password)
                        .padding(12)
                        .background(AppTheme.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(AppTheme.border, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .accessibilityIdentifier("auth.login.password")
                }

                if let err = errorMessage {
                    Text(err)
                        .font(.footnote)
                        .foregroundColor(.red)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("auth.login.error")
                }

                Button(action: doLogin) {
                    HStack {
                        Spacer()
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Log In")
                                .font(.headline.weight(.semibold))
                        }
                        Spacer()
                    }
                    .padding(.vertical, 14)
                }
                .buttonStyle(GradientButtonStyle(isEnabled: canSubmit))
                .disabled(!canSubmit)
                .accessibilityIdentifier("auth.login.submit")

#if DEBUG
                Text("API: \(AppConfig.apiBaseURL)")
                    .font(.caption2)
                    .foregroundColor(AppTheme.textSecondary)
                    .accessibilityIdentifier("auth.login.apiBaseURL")
#endif
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .adaptiveContent(maxWidth: 480)
        .navigationTitle(headline == nil ? "Login" : resolvedHeadline)
        .navigationBarTitleDisplayMode(headline == nil ? .automatic : .inline)
        .onChange(of: auth.isAuthenticated) { isAuthenticated in
            if isAuthenticated {
                dismiss()
            }
        }
    }

    private var canSubmit: Bool {
        !email.isEmpty && !password.isEmpty && !isLoading
    }

    private func doLogin() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                _ = try await auth.login(email: email, password: password)
                await MainActor.run {
                    isLoading = false
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = AuthFormMessages.loginErrorDescription(error)
                }
            }
        }
    }
}
