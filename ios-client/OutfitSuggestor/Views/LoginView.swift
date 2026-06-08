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
        Form {
            if headline != nil || subheadline != nil {
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(resolvedHeadline)
                            .font(.headline)
                        if let subheadline {
                            Text(subheadline)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .listRowBackground(Color.clear)
                }
            }
            Section(header: Text("Log in")) {
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                SecureField("Password", text: $password)
                    .textContentType(.password)
            }
            if let err = errorMessage {
                Section { Text(err).foregroundColor(.red) }
            }
            Section {
                Button(action: doLogin) {
                    HStack {
                        if isLoading { ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white)) }
                        else { Text("Log In") }
                    }
                    .frame(maxWidth: .infinity)
                }
                .disabled(email.isEmpty || password.isEmpty || isLoading)
            }
        }
        .navigationTitle(headline == nil ? "Login" : resolvedHeadline)
        .navigationBarTitleDisplayMode(headline == nil ? .automatic : .inline)
        .onChange(of: auth.isAuthenticated) { isAuthenticated in
            if isAuthenticated {
                dismiss()
            }
        }
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
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}
