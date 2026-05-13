//
//  IntegrationTestRunnerView.swift
//  OutfitSuggestor
//
//  Admin-only view for listing and running integration tests
//

import SwiftUI

struct IntegrationTestRunnerView: View {
    @State private var tests: [IntegrationTestCase] = []
    @State private var results: [IntegrationTestResult] = []
    @State private var isLoadingTests = false
    @State private var runningTestId: String?
    @State private var runningAll = false
    @State private var errorMessage: String?
    
    var body: some View {
        List {
            if let error = errorMessage {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                }
            }
            
            Section(header: Text("Actions")) {
                Button(action: { Task { await runAll() } }) {
                    Label(runningAll ? "Running All..." : "Run All Tests", systemImage: "play.fill")
                }
                .disabled(runningAll || runningTestId != nil)
            }
            
            Section(header: Text("Tests (\(tests.count))")) {
                if isLoadingTests {
                    ProgressView("Loading tests...")
                } else if tests.isEmpty {
                    Text("No tests available")
                        .foregroundColor(.secondary)
                } else {
                    ForEach(tests) { test in
                        TestCaseRow(
                            test: test,
                            result: results.first(where: { $0.test_id == test.id }),
                            isRunning: runningTestId == test.id,
                            onRun: { Task { await runSingle(testId: test.id) } }
                        )
                        .disabled(runningAll || runningTestId != nil)
                    }
                }
            }
            
            if !results.isEmpty {
                Section(header: Text("Results Summary")) {
                    let passed = results.filter { $0.status == "passed" }.count
                    let failed = results.filter { $0.status == "failed" }.count
                    HStack {
                        Label("\(passed) Passed", systemImage: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Spacer()
                        Label("\(failed) Failed", systemImage: "xmark.circle.fill")
                            .foregroundColor(.red)
                    }
                }
            }
        }
        .navigationTitle("Integration Tests")
        .navigationBarTitleDisplayMode(.large)
        .task { await loadTests() }
        .refreshable { await loadTests() }
    }
    
    private func loadTests() async {
        isLoadingTests = true
        errorMessage = nil
        do {
            tests = try await APIService.shared.listIntegrationTests()
        } catch let error as APIServiceError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoadingTests = false
    }
    
    private func runSingle(testId: String) async {
        runningTestId = testId
        errorMessage = nil
        results.removeAll()
        do {
            let result = try await APIService.shared.runIntegrationTest(testId: testId)
            results = [result]
        } catch let error as APIServiceError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        runningTestId = nil
    }
    
    private func runAll() async {
        runningAll = true
        errorMessage = nil
        results.removeAll()
        do {
            results = try await APIService.shared.runAllIntegrationTests()
        } catch let error as APIServiceError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        runningAll = false
    }
}

private struct TestCaseRow: View {
    let test: IntegrationTestCase
    let result: IntegrationTestResult?
    let isRunning: Bool
    let onRun: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                statusIcon
                Text(test.name)
                    .font(.headline)
                Spacer()
                Text(test.layer.uppercased())
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(test.layer == "frontend" ? Color.blue.opacity(0.2) : Color.green.opacity(0.2))
                    .cornerRadius(4)
            }
            
            Text(test.description)
                .font(.caption)
                .foregroundColor(.secondary)
            
            if let result = result {
                HStack(spacing: 8) {
                    Text("\(Int(result.duration_ms))ms")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("P:\(result.passed) F:\(result.failed) S:\(result.skipped)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            Button(action: onRun) {
                if isRunning {
                    ProgressView()
                        .controlSize(.small)
                } else {
                    Label("Run", systemImage: "play.circle")
                        .font(.caption)
                }
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
        }
        .padding(.vertical, 4)
    }
    
    @ViewBuilder
    private var statusIcon: some View {
        if isRunning {
            ProgressView().controlSize(.small)
        } else if let result = result {
            Image(systemName: result.status == "passed" ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundColor(result.status == "passed" ? .green : .red)
        } else {
            Image(systemName: "circle")
                .foregroundColor(.secondary)
        }
    }
}
