//
//  RegisterView.swift
//  OutfitSuggestor
//

import SwiftUI

struct RegisterView: View {
    var headline: String? = nil
    var subheadline: String? = nil

    @ObservedObject var auth = AuthService.shared
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var password = ""
    @State private var fullName = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var showSuccessMessage = false

    private var resolvedHeadline: String {
        headline ?? "Create account"
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
            Section(header: Text("Create account")) {
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                SecureField("Password", text: $password)
                    .textContentType(.newPassword)
                TextField("Full name (optional)", text: $fullName)
                    .textContentType(.name)
            }
            if let err = errorMessage {
                Section { Text(err).foregroundColor(.red) }
            }
            Section {
                Button(action: doRegister) {
                    HStack {
                        if isLoading { ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white)) }
                        else { Text("Sign Up") }
                    }
                    .frame(maxWidth: .infinity)
                }
                .disabled(email.isEmpty || password.isEmpty || isLoading)
            }
        }
        .navigationTitle(headline == nil ? "Sign Up" : resolvedHeadline)
        .navigationBarTitleDisplayMode(headline == nil ? .automatic : .inline)
        .alert("Account created", isPresented: $showSuccessMessage) {
            Button("OK", role: .cancel) {
                dismiss()
            }
        } message: {
            Text("If email activation is enabled, check your inbox to activate. You can use the app now.")
        }
        .onChange(of: auth.isAuthenticated) { isAuthenticated in
            if isAuthenticated {
                dismiss()
            }
        }
    }
    
    private func doRegister() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                _ = try await auth.register(email: email, password: password, fullName: fullName.isEmpty ? nil : fullName)
                await MainActor.run {
                    isLoading = false
                    showSuccessMessage = true
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
