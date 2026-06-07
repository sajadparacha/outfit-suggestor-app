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
    @State private var showRelaunchConfirmation = false

    private var isAdmin: Bool { auth.currentUser?.is_admin == true }

    private var canShowRelaunchButton: Bool {
#if DEBUG
        true
#else
        false
#endif
    }

    var body: some View {
        Form {
            if auth.isAuthenticated {
                Section(header: Text("Account")) {
                    if let user = auth.currentUser {
                        LabeledContent("Email", value: user.email)
                        if let name = user.full_name, !name.isEmpty { LabeledContent("Name", value: name) }
                    }
                    Button("Log out", role: .destructive) {
                        auth.logout()
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
            } else {
                Section("Guest mode") {
                    Text("You can still get outfit suggestions as a guest. Log in to use Looks, Wardrobe, Random picks, and Insights.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Section {
                    NavigationLink(destination: LoginView()) {
                        Label("Log in", systemImage: "person.crop.circle.badge.checkmark")
                    }
                    NavigationLink(destination: RegisterView()) {
                        Label("Sign up", systemImage: "person.badge.plus")
                    }
                }
            }

            Section("Discover") {
                if auth.isAuthenticated {
                    NavigationLink(destination: InsightsView()) {
                        Label("Insights", systemImage: "chart.bar.xaxis")
                    }
                    .accessibilityIdentifier("profile.insightsLink")
                }
                NavigationLink(destination: UserGuideView()) {
                    Label("Guide", systemImage: "book")
                }
                NavigationLink(destination: AboutView()) {
                    Label("About", systemImage: "info.circle")
                }
            }

            if isAdmin {
                Section("Admin") {
                    NavigationLink(destination: ReportsView()) {
                        Label("Reports", systemImage: "chart.bar")
                    }
                }
            }

            if canShowRelaunchButton {
                Section("App") {
                    Button(role: .destructive, action: { showRelaunchConfirmation = true }) {
                        Label("Relaunch App", systemImage: "arrow.clockwise.circle")
                    }
                }
            }
        }
        .navigationTitle("Profile")
        .alert("Relaunch app?", isPresented: $showRelaunchConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Relaunch", role: .destructive) {
                relaunchApplication()
            }
        } message: {
            Text("This will close the app immediately so you can relaunch fresh.")
        }
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

    private func relaunchApplication() {
#if DEBUG
        exit(0)
#endif
    }
}
