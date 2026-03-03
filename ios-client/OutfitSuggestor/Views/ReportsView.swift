//
//  ReportsView.swift
//  OutfitSuggestor
//
//  Admin-only: access logs and usage stats (parity with web Reports tab).
//

import SwiftUI

struct ReportsView: View {
    @State private var logs: [AccessLogEntry] = []
    @State private var stats: AccessLogStatsResponse?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var startDate = ""
    @State private var endDate = ""
    @State private var filterUser = ""
    @State private var filterOperationType = ""
    @State private var filterEndpoint = ""
    @State private var tableSearchText = ""
    
    private var filteredLogs: [AccessLogEntry] {
        guard !tableSearchText.trimmingCharacters(in: .whitespaces).isEmpty else { return logs }
        let q = tableSearchText.lowercased()
        return logs.filter {
            (($0.endpoint ?? "").lowercased().contains(q)) ||
            (($0.user_email ?? "").lowercased().contains(q)) ||
            (($0.user_name ?? "").lowercased().contains(q)) ||
            (($0.operation_type ?? "").lowercased().contains(q)) ||
            (($0.method ?? "").lowercased().contains(q)) ||
            (($0.ip_address ?? "").lowercased().contains(q)) ||
            (($0.country ?? "").lowercased().contains(q)) ||
            (($0.city ?? "").lowercased().contains(q)) ||
            ($0.user_id != nil && "\($0.user_id!)".contains(q)) ||
            ($0.status_code != nil && "\($0.status_code!)".contains(q))
        }
    }

    var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 16) {
                Text("Access logs and usage (admin-only)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Group {
                    HStack {
                        TextField("Start (YYYY-MM-DD)", text: $startDate)
                            .textFieldStyle(.roundedBorder)
                        TextField("End (YYYY-MM-DD)", text: $endDate)
                            .textFieldStyle(.roundedBorder)
                    }
                    TextField("User (email/name)", text: $filterUser)
                        .textFieldStyle(.roundedBorder)
                    TextField("Operation type", text: $filterOperationType)
                        .textFieldStyle(.roundedBorder)
                        .autocapitalization(.none)
                    TextField("Endpoint", text: $filterEndpoint)
                        .textFieldStyle(.roundedBorder)
                        .autocapitalization(.none)
                }
                Button("Load reports") { load() }
                    .buttonStyle(.borderedProminent)
                    .disabled(isLoading)
                if isLoading {
                    ProgressView()
                }
                if let err = errorMessage {
                    Text(err).foregroundColor(.red).font(.caption)
                }
                if let s = stats {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Stats").font(.headline)
                        Text("Total requests: \(s.total_requests ?? 0)")
                        Text("Unique IPs: \(s.unique_ip_addresses ?? 0)")
                        if let avg = s.average_response_time_ms {
                            Text("Avg response: \(String(format: "%.0f", avg)) ms")
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(8)
                }
                if !logs.isEmpty {
                    TextField("Search logs…", text: $tableSearchText)
                        .textFieldStyle(.roundedBorder)
                    Text("Recent logs (\(filteredLogs.count))").font(.headline)
                    ForEach(filteredLogs.prefix(50)) { log in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(log.endpoint ?? "—").font(.caption).lineLimit(1)
                            Text("\(log.method ?? "") \(log.status_code.map { String($0) } ?? "") · \(log.operation_type ?? "") · \(log.timestamp ?? "")")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                            if let email = log.user_email { Text(email).font(.caption2).foregroundColor(.secondary) }
                        }
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(UIColor.tertiarySystemBackground))
                        .cornerRadius(6)
                    }
                }
            }
            .padding()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .navigationTitle("Reports")
        .onAppear {
            if AuthService.shared.currentUser?.is_admin == true {
                load()
            } else {
                errorMessage = "Admin access required."
            }
        }
    }

    private func load() {
        guard AuthService.shared.currentUser?.is_admin == true else { return }
        isLoading = true
        errorMessage = nil
        let start = startDate.isEmpty ? nil : startDate
        let end = endDate.isEmpty ? nil : endDate
        var params = APIService.AccessLogsParams(limit: 100, offset: 0)
        params.startDate = start
        params.endDate = end
        params.user = filterUser.isEmpty ? nil : filterUser
        params.operationType = filterOperationType.isEmpty ? nil : filterOperationType
        params.endpoint = filterEndpoint.isEmpty ? nil : filterEndpoint
        Task {
            do {
                let logsResp = try await APIService.shared.getAccessLogs(params: params)
                let s = try await APIService.shared.getAccessLogStats(startDate: start, endDate: end)
                await MainActor.run {
                    logs = logsResp.logs
                    stats = s
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}
