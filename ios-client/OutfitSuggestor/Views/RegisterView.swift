//
//  RegisterView.swift
//  OutfitSuggestor
//

import SwiftUI

struct RegisterView: View {
    @ObservedObject var auth = AuthService.shared
    @State private var email = ""
    @State private var password = ""
    @State private var fullName = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var showSuccessMessage = false
    
    var body: some View {
        Form {
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
        .navigationTitle("Sign Up")
        .alert("Account created", isPresented: $showSuccessMessage) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("If email activation is enabled, check your inbox to activate. You can use the app now.")
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
