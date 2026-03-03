//
//  SettingsView.swift
//  OutfitSuggestor
//

import SwiftUI

struct SettingsView: View {
    @ObservedObject var auth = AuthService.shared
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var message: String?
    @State private var isSuccess = false
    @State private var isLoading = false
    
    var body: some View {
        Form {
            Section(header: Text("Account")) {
                if let user = auth.currentUser {
                    LabeledContent("Email", value: user.email)
                    if let name = user.full_name, !name.isEmpty { LabeledContent("Name", value: name) }
                }
            }
            Section(header: Text("Change password")) {
                SecureField("Current password", text: $currentPassword)
                SecureField("New password", text: $newPassword)
                SecureField("Confirm new password", text: $confirmPassword)
                if let msg = message {
                    Text(msg).foregroundColor(isSuccess ? .green : .red)
                }
                Button("Update password") {
                    changePassword()
                }
                .disabled(currentPassword.isEmpty || newPassword.isEmpty || newPassword != confirmPassword || isLoading)
            }
            Section {
                Button("Log out", role: .destructive) { auth.logout() }
            }
        }
        .navigationTitle("Settings")
    }
    
    private func changePassword() {
        message = nil
        guard newPassword == confirmPassword else { message = "Passwords don't match"; return }
        isLoading = true
        Task {
            do {
                try await auth.changePassword(currentPassword: currentPassword, newPassword: newPassword)
                await MainActor.run {
                    isLoading = false
                    message = "Password updated."
                    isSuccess = true
                    currentPassword = ""
                    newPassword = ""
                    confirmPassword = ""
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    message = error.localizedDescription
                    isSuccess = false
                }
            }
        }
    }
}
