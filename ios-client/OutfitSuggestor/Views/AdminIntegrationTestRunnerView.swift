//
//  AdminIntegrationTestRunnerView.swift
//  OutfitSuggestor
//
//  Admin integration test runner (parity with web AdminIntegrationTestRunner).
//  Full test execution is web-only; iOS exposes the route for deep-link parity.
//

import SwiftUI

struct AdminIntegrationTestRunnerView: View {
    @ObservedObject private var auth = AuthService.shared

    private var isAdmin: Bool { auth.currentUser?.is_admin == true }
    private var testRunnerEnabled: Bool { AppConfig.enableAdminTestRunner }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if !isAdmin {
                    messageBlock(
                        title: "Integration Tests",
                        body: "Admin privileges are required to run integration tests."
                    )
                } else if !testRunnerEnabled {
                    messageBlock(
                        title: "Integration Tests",
                        body: "Test Runner is disabled in this environment."
                    )
                } else {
                    messageBlock(
                        title: "Integration Tests",
                        body: "Integration test execution is available on the web app. This screen confirms deep-link routing to /admin/integration-tests."
                    )
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationTitle("Integration Tests")
    }

    private func messageBlock(title: String, body: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.title2.bold())
            Text(body)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
}
