//
//  ReportsView.swift
//  OutfitSuggestor
//
//  Admin-only tabbed reports (parity with web Admin Reports).
//

import SwiftUI
import Charts

struct ReportsView: View {
    @ObservedObject private var auth = AuthService.shared
    @StateObject private var viewModel: ReportsViewModel
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    init() {
        let isAdmin = AuthService.shared.currentUser?.is_admin == true
        _viewModel = StateObject(wrappedValue: ReportsViewModel(isAdmin: isAdmin))
    }

    var body: some View {
        Group {
            if !viewModel.isAdmin {
                nonAdminGate
            } else {
                adminContent
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.bgPrimary.ignoresSafeArea())
        .navigationTitle("Reports")
        .onAppear {
            let isAdmin = auth.currentUser?.is_admin == true
            viewModel.isAdmin = isAdmin
        }
    }

    private var nonAdminGate: some View {
        VStack(spacing: 12) {
            Text("📊 Reports")
                .font(.title2.weight(.bold))
                .foregroundColor(AppTheme.textPrimary)
            Text(ReportsCopy.nonAdminMessage)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .glassCard()
        .adaptiveContent(maxWidth: 640)
        .padding()
        .accessibilityIdentifier("reports.nonAdminGate")
    }

    private var adminContent: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 16) {
                headerCard
                if let err = viewModel.errorMessage {
                    errorBanner(err)
                }
                filtersCard
                tabPicker
                contentArea
            }
            .padding()
            .adaptiveContent(maxWidth: 1080)
        }
    }

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 4) {
            GradientText(text: ReportsCopy.headerTitle, font: .title2.weight(.bold))
            Text(ReportsCopy.headerSubtitle)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .glassCard()
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top) {
            Text(message)
                .font(.subheadline)
                .foregroundColor(.red.opacity(0.9))
            Spacer()
            Button(action: { viewModel.dismissError() }) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.red.opacity(0.7))
            }
            .accessibilityLabel("Dismiss error")
        }
        .padding()
        .background(Color.red.opacity(0.15))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.red.opacity(0.3), lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var filtersCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Filters")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)
            Text("Edit filters, then press “Search” to fetch.")
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)

            HStack(spacing: 8) {
                reportsTextField("Start (YYYY-MM-DD)", text: $viewModel.filters.startDate)
                reportsTextField("End (YYYY-MM-DD)", text: $viewModel.filters.endDate)
            }
            reportsTextField("User name/email contains", text: $viewModel.filters.user)
            reportsTextField("Country", text: $viewModel.filters.country)
            reportsTextField("Operation type", text: $viewModel.filters.operationType, autocapitalize: false)
            reportsTextField("Endpoint contains", text: $viewModel.filters.endpoint, autocapitalize: false)

            HStack {
                Spacer()
                Button(ReportsCopy.clearButton) { viewModel.clear() }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isLoading)
                Button(action: { Task { await viewModel.search() } }) {
                    if viewModel.isLoading {
                        HStack(spacing: 6) {
                            ProgressView().scaleEffect(0.8)
                            Text(ReportsCopy.searchingLabel)
                        }
                    } else {
                        Text(ReportsCopy.searchButton)
                    }
                }
                .buttonStyle(GradientButtonStyle(isEnabled: !viewModel.isLoading))
                .disabled(viewModel.isLoading)
                .frame(maxWidth: 160)
                .accessibilityIdentifier("reports.searchButton")
            }
        }
        .padding()
        .glassCard()
    }

    private var tabPicker: some View {
        Picker("Report section", selection: $viewModel.selectedTab) {
            ForEach(ReportTab.allCases) { tab in
                Text(tab.rawValue).tag(tab)
            }
        }
        .pickerStyle(.segmented)
        .accessibilityIdentifier("reports.tabPicker")
    }

    @ViewBuilder
    private var contentArea: some View {
        if viewModel.isLoading {
            HStack {
                Spacer()
                ProgressView(ReportsCopy.searchingLabel)
                Spacer()
            }
            .padding(.vertical, 32)
        } else if !viewModel.hasSearched {
            promptCard(ReportsCopy.readyPrompt)
        } else {
            switch viewModel.selectedTab {
            case .overview:
                overviewTab
            case .utilization:
                utilizationTab
            case .users:
                usersTab
            case .searches:
                searchesTab
            }
        }
    }

    private var overviewTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Overview")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            if viewModel.stats == nil && (viewModel.timeline?.timeline.isEmpty ?? true) {
                emptyDataCard
            } else {
                kpiGrid
                if let points = viewModel.timeline?.timeline, !points.isEmpty {
                    chartCard(title: "Request timeline") {
                        timelineLineChart(points)
                            .frame(height: horizontalSizeClass == .regular ? 280 : 220)
                    }
                }
            }
        }
    }

    private var utilizationTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Utilization")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            if let usage = viewModel.usage {
                usageSummaryGrid(usage)
                if let ops = usageBarItems(from: usage), !ops.isEmpty {
                    chartCard(title: "Operations breakdown") {
                        horizontalBarChart(ops)
                            .frame(height: CGFloat(min(ops.count, 8)) * 36 + 40)
                    }
                }
            } else {
                emptyDataCard
            }
        }
    }

    private var usersTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Users")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            if let stats = viewModel.stats {
                if let users = stats.by_user, !users.isEmpty {
                chartCard(title: "Top users") {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(Array(users.prefix(10).enumerated()), id: \.offset) { _, user in
                            HStack {
                                Text(user.user_email ?? user.user_name ?? "User \(user.user_id ?? 0)")
                                    .font(.caption)
                                    .foregroundColor(AppTheme.textPrimary)
                                    .lineLimit(1)
                                Spacer()
                                Text("\(user.count)")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(AppTheme.accent)
                            }
                        }
                    }
                }
            }

            if let countries = stats.by_country, !countries.isEmpty {
                chartCard(title: "By country") {
                    horizontalBarChart(countries.map { ChartBarItem(label: $0.country, count: $0.count) })
                        .frame(height: CGFloat(min(countries.count, 8)) * 36 + 40)
                }
            }

            if let cities = stats.by_city, !cities.isEmpty {
                chartCard(title: "By city") {
                    horizontalBarChart(cities.map { ChartBarItem(label: $0.city, count: $0.count) })
                        .frame(height: CGFloat(min(cities.count, 8)) * 36 + 40)
                }
            }

                if (stats.by_user ?? []).isEmpty && (stats.by_country ?? []).isEmpty && (stats.by_city ?? []).isEmpty {
                    emptyDataCard
                }
            } else {
                emptyDataCard
            }
        }
    }

    private var searchesTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Searches")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            if let report = viewModel.searchReports {
            kpiCard(label: "Total searches", value: "\(report.total_searches)")

            if !report.by_occasion.isEmpty {
                chartCard(title: "By occasion") {
                    horizontalBarChart(report.by_occasion.map { ChartBarItem(label: $0.label, count: $0.count) })
                        .frame(height: CGFloat(min(report.by_occasion.count, 8)) * 36 + 40)
                }
            }
            if !report.by_season.isEmpty {
                chartCard(title: "By season") {
                    horizontalBarChart(report.by_season.map { ChartBarItem(label: $0.label, count: $0.count) })
                        .frame(height: CGFloat(min(report.by_season.count, 8)) * 36 + 40)
                }
            }
            if !report.by_style.isEmpty {
                chartCard(title: "By style") {
                    horizontalBarChart(report.by_style.map { ChartBarItem(label: $0.label, count: $0.count) })
                        .frame(height: CGFloat(min(report.by_style.count, 8)) * 36 + 40)
                }
            }

            if !report.recent.isEmpty {
                chartCard(title: "Recent searches") {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(report.recent.prefix(20)) { entry in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(entry.user_email ?? entry.user_name ?? "User \(entry.user_id ?? 0)")
                                    .font(.caption.weight(.medium))
                                    .foregroundColor(AppTheme.textPrimary)
                                Text("\(entry.occasion ?? "—") · \(entry.season ?? "—") · \(entry.style ?? "—")")
                                    .font(.caption2)
                                    .foregroundColor(AppTheme.textSecondary)
                                if let created = entry.created_at {
                                    Text(created)
                                        .font(.caption2)
                                        .foregroundColor(AppTheme.textSecondary.opacity(0.8))
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }

            if report.total_searches == 0 && report.by_occasion.isEmpty && report.by_season.isEmpty && report.by_style.isEmpty {
                emptyDataCard
            }
            } else {
                emptyDataCard
            }
        }
    }

    private var kpiGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            kpiCard(label: "Total requests", value: formattedInt(viewModel.stats?.total_requests))
            kpiCard(label: "Unique IPs", value: formattedInt(viewModel.stats?.unique_ip_addresses))
            kpiCard(label: "Avg response (ms)", value: formattedMs(viewModel.stats?.average_response_time_ms))
        }
    }

    private func usageSummaryGrid(_ usage: AccessLogUsageBreakdown) -> some View {
        LazyVGrid(columns: [GridItem(.flexible())], spacing: 12) {
            kpiCard(label: "AI calls (total)", value: formattedInt(usage.ai_calls?.total))
            kpiCard(label: "Wardrobe ops (total)", value: formattedInt(usage.wardrobe_operations?.total))
            kpiCard(label: "History views", value: formattedInt(usage.outfit_history?.views))
        }
    }

    private func kpiCard(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
            Text(value)
                .font(.title2.weight(.bold))
                .foregroundColor(AppTheme.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .glassCard()
    }

    private func chartCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
            content()
        }
        .padding()
        .glassCard()
    }

    private var emptyDataCard: some View {
        promptCard(ReportsCopy.noDataMessage)
    }

    private func promptCard(_ message: String) -> some View {
        Text(message)
            .font(.subheadline)
            .foregroundColor(AppTheme.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .glassCard()
    }

    private func timelineLineChart(_ points: [TimelinePoint]) -> some View {
        let chartPoints = points.compactMap { point -> TimelineChartPoint? in
            guard let date = ReportsChartHelpers.parsePeriod(point.period) else { return nil }
            return TimelineChartPoint(date: date, count: point.count)
        }
        return Chart(chartPoints) { item in
            LineMark(
                x: .value("Period", item.date),
                y: .value("Requests", item.count)
            )
            .foregroundStyle(AppTheme.accentGradient)
            PointMark(
                x: .value("Period", item.date),
                y: .value("Requests", item.count)
            )
            .foregroundStyle(AppTheme.gradientStart)
        }
        .chartXAxis {
            AxisMarks(values: .automatic) { _ in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5)).foregroundStyle(AppTheme.border)
                AxisValueLabel().foregroundStyle(AppTheme.textSecondary)
            }
        }
        .chartYAxis {
            AxisMarks { _ in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5)).foregroundStyle(AppTheme.border)
                AxisValueLabel().foregroundStyle(AppTheme.textSecondary)
            }
        }
    }

    private func horizontalBarChart(_ items: [ChartBarItem]) -> some View {
        Chart(items) { item in
            BarMark(
                x: .value("Count", item.count),
                y: .value("Label", item.label)
            )
            .foregroundStyle(AppTheme.accentGradient)
        }
        .chartXAxis {
            AxisMarks { _ in
                AxisValueLabel().foregroundStyle(AppTheme.textSecondary)
            }
        }
        .chartYAxis {
            AxisMarks { _ in
                AxisValueLabel().foregroundStyle(AppTheme.textSecondary)
            }
        }
    }

    private func reportsTextField(_ placeholder: String, text: Binding<String>, autocapitalize: Bool = true) -> some View {
        TextField(placeholder, text: text)
            .textFieldStyle(.roundedBorder)
            .autocapitalization(autocapitalize ? .sentences : .none)
    }

    private func formattedInt(_ value: Int?) -> String {
        guard let value else { return "—" }
        return "\(value)"
    }

    private func formattedMs(_ value: Double?) -> String {
        guard let value else { return "—" }
        return String(format: "%.0f", value)
    }

    private func usageBarItems(from usage: AccessLogUsageBreakdown) -> [ChartBarItem]? {
        var items: [ChartBarItem] = []
        if let ai = usage.ai_calls {
            if let v = ai.outfit_suggestions, v > 0 { items.append(ChartBarItem(label: "AI outfit", count: v)) }
            if let v = ai.wardrobe_analysis, v > 0 { items.append(ChartBarItem(label: "AI wardrobe", count: v)) }
        }
        if let wardrobe = usage.wardrobe_operations {
            if let v = wardrobe.add, v > 0 { items.append(ChartBarItem(label: "Wardrobe add", count: v)) }
            if let v = wardrobe.view, v > 0 { items.append(ChartBarItem(label: "Wardrobe view", count: v)) }
            if let v = wardrobe.update, v > 0 { items.append(ChartBarItem(label: "Wardrobe update", count: v)) }
            if let v = wardrobe.delete, v > 0 { items.append(ChartBarItem(label: "Wardrobe delete", count: v)) }
        }
        if let views = usage.outfit_history?.views, views > 0 {
            items.append(ChartBarItem(label: "History views", count: views))
        }
        return items.isEmpty ? nil : items
    }
}

private struct ChartBarItem: Identifiable {
    let id = UUID()
    let label: String
    let count: Int
}

private struct TimelineChartPoint: Identifiable {
    let id = UUID()
    let date: Date
    let count: Int
}

enum ReportsChartHelpers {
    static func parsePeriod(_ period: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: period) { return date }
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: period) { return date }
        let fallback = DateFormatter()
        fallback.dateFormat = "yyyy-MM-dd"
        fallback.locale = Locale(identifier: "en_US_POSIX")
        return fallback.date(from: String(period.prefix(10)))
    }
}
