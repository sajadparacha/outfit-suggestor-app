//
//  LoginView.swift
//  OutfitSuggestor
//

import SwiftUI

struct LoginView: View {
    @ObservedObject var auth = AuthService.shared
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    
    var body: some View {
        Form {
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
        .navigationTitle("Login")
    }
    
    private func doLogin() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                _ = try await auth.login(email: email, password: password)
                await MainActor.run { isLoading = false }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}
