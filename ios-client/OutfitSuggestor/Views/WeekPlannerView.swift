//
//  WeekPlannerView.swift
//  OutfitSuggestor
//
//  Week Outfit Planner — plan days, generate outfits, local reminders.
//

import SwiftUI
import UIKit

struct WeekPlannerView: View {
    @StateObject private var viewModel = WeekPlannerViewModel()
    @ObservedObject private var auth = AuthService.shared
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var showClearConfirm = false

    private var isRegularWidth: Bool { horizontalSizeClass == .regular }

    var body: some View {
        Group {
            if auth.isAuthenticated {
                plannerContent
            } else {
                GuestTabPlaceholderView(title: WeekPlanCopy.navTitle, context: .week)
            }
        }
        .navigationTitle(WeekPlanCopy.navTitle)
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog(
            WeekPlanCopy.clearConfirmTitle,
            isPresented: $showClearConfirm,
            titleVisibility: .visible
        ) {
            Button(WeekPlanCopy.clearConfirmDelete, role: .destructive) {
                Task { await viewModel.clearPlan() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(WeekPlanCopy.clearConfirmMessage)
        }
        .task {
            guard auth.isAuthenticated else { return }
            await viewModel.load()
        }
    }

    private var plannerContent: some View {
        ZStack {
            LinearGradient(
                colors: [AppTheme.bgPrimary, AppTheme.bgSecondary],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: isRegularWidth ? 28 : 20) {
                    if let status = viewModel.statusMessage {
                        HStack(spacing: 10) {
                            ProgressView()
                                .tint(AppTheme.gradientStart)
                            Text(status)
                                .font(.subheadline)
                                .foregroundColor(AppTheme.textSecondary)
                        }
                        .accessibilityIdentifier("week.loading")
                    }

                    todaySection
                    sharedControlsSection
                    daysSection
                    actionsSection

                    if let info = viewModel.infoMessage {
                        Text(info)
                            .font(.subheadline)
                            .foregroundColor(AppTheme.textSecondary)
                            .accessibilityIdentifier("week.info")
                    }
                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.subheadline)
                            .foregroundColor(.red)
                            .accessibilityIdentifier("week.error")
                    }
                }
                .padding(.horizontal, isRegularWidth ? 28 : 16)
                .padding(.vertical, 16)
                .adaptiveContent(maxWidth: 720)
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Today

    private var todaySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(WeekPlanCopy.todayTitle)
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            VStack(alignment: .leading, spacing: 8) {
                if let today = viewModel.today, today.has_plan, today.enabled {
                    Text(WeekPlanConstants.dayName(for: today.day_of_week))
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.gradientStart)
                    if let occasion = today.occasion {
                        Text(occasionDisplay(occasion))
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    if let outfit = today.outfit, WeekPlanOutfitDisplay.hasExpandableDetails(outfit) {
                        WeekPlanOutfitCollapsibleView(
                            outfit: outfit,
                            accessibilityPrefix: "week.today"
                        )
                    } else {
                        Text("No outfit yet — generate your week.")
                            .font(.subheadline)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                } else if let message = viewModel.today?.message {
                    Text(message)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                } else {
                    Text("Save and generate a plan to see today’s outfit.")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassCard()
        }
        .accessibilityIdentifier("week.today")
    }

    // MARK: - Shared controls

    private var sharedControlsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(WeekPlanCopy.sharedSeasonLabel)
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            Picker("Season", selection: Binding(
                get: { viewModel.plan.shared_season },
                set: { viewModel.setSharedSeason($0) }
            )) {
                ForEach(Season.allCases, id: \.apiValue) { season in
                    Text(season.rawValue).tag(season.apiValue)
                }
            }
            .pickerStyle(.menu)
            .tint(AppTheme.gradientStart)
            .accessibilityIdentifier("week.sharedSeason")

            Text(WeekPlanCopy.reminderLabel)
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            DatePicker(
                "Reminder time",
                selection: reminderBinding,
                displayedComponents: .hourAndMinute
            )
            .labelsHidden()
            .tint(AppTheme.gradientStart)
            .accessibilityIdentifier("week.reminderTime")

            Text("Timezone: \(TimeZone.current.identifier)")
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard()
    }

    private var reminderBinding: Binding<Date> {
        Binding(
            get: {
                reminderDate(from: viewModel.plan.reminder_time)
            },
            set: { date in
                let comps = Calendar.current.dateComponents([.hour, .minute], from: date)
                let hour = comps.hour ?? 7
                let minute = comps.minute ?? 30
                viewModel.setReminderTime(String(format: "%02d:%02d", hour, minute))
            }
        )
    }

    // MARK: - Days

    private var daysSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Days")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            if !viewModel.hasEnabledDays {
                Text(WeekPlanCopy.emptyDays)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .accessibilityIdentifier("week.emptyDays")
            }

            ForEach(viewModel.plan.days) { day in
                dayRow(day)
            }
        }
    }

    private func dayRow(_ day: WeekPlanDayResponse) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Toggle(isOn: Binding(
                    get: { day.enabled },
                    set: { viewModel.setDayEnabled(day.day_of_week, enabled: $0) }
                )) {
                    Text(WeekPlanConstants.dayName(for: day.day_of_week))
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)
                }
                .tint(AppTheme.gradientStart)
                .accessibilityIdentifier("week.day.\(day.day_of_week).toggle")
            }

            if day.enabled {
                Picker("Occasion", selection: Binding(
                    get: { day.occasion },
                    set: { viewModel.setDayOccasion(day.day_of_week, occasion: $0) }
                )) {
                    ForEach(Occasion.allCases, id: \.apiValue) { occasion in
                        Text(occasion.rawValue).tag(occasion.apiValue)
                    }
                }
                .pickerStyle(.menu)
                .tint(AppTheme.gradientStart)
                .accessibilityIdentifier("week.day.\(day.day_of_week).occasion")

                Picker("Style", selection: Binding(
                    get: { day.style },
                    set: { viewModel.setDayStyle(day.day_of_week, style: $0) }
                )) {
                    ForEach(Style.allCases, id: \.apiValue) { style in
                        Text(style.rawValue).tag(style.apiValue)
                    }
                }
                .pickerStyle(.menu)
                .tint(AppTheme.gradientStart)
                .accessibilityIdentifier("week.day.\(day.day_of_week).style")

                Toggle(isOn: Binding(
                    get: { day.use_wardrobe_only },
                    set: { viewModel.setDayUseWardrobeOnly(day.day_of_week, useWardrobeOnly: $0) }
                )) {
                    Text(WeekPlanCopy.useWardrobe)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textPrimary)
                }
                .tint(AppTheme.gradientStart)
                .accessibilityIdentifier("week.day.\(day.day_of_week).useWardrobe")

                if let outfit = day.outfit, WeekPlanOutfitDisplay.hasExpandableDetails(outfit) {
                    WeekPlanOutfitCollapsibleView(
                        outfit: outfit,
                        accessibilityPrefix: "week.day.\(day.day_of_week)"
                    )
                }

                Button {
                    Task { await viewModel.regenerateDay(day.day_of_week) }
                } label: {
                    Text(WeekPlanCopy.regenerate)
                        .font(.caption.weight(.semibold))
                }
                .disabled(viewModel.isGenerating || viewModel.isSaving)
                .foregroundColor(AppTheme.gradientStart)
                .accessibilityIdentifier("week.day.\(day.day_of_week).regenerate")
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard()
    }

    // MARK: - Actions

    private var actionsSection: some View {
        VStack(spacing: 12) {
            Button {
                Task { await viewModel.generateWeek() }
            } label: {
                Text(WeekPlanCopy.generateWeek)
                    .font(.headline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(GradientButtonStyle())
            .disabled(viewModel.isGenerating || viewModel.isSaving || !viewModel.hasEnabledDays)
            .accessibilityIdentifier("week.generate")

            Button {
                Task { await viewModel.save() }
            } label: {
                Text(WeekPlanCopy.savePlan)
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.bordered)
            .tint(AppTheme.gradientStart)
            .disabled(viewModel.isGenerating || viewModel.isSaving)
            .accessibilityIdentifier("week.save")

            Button(role: .destructive) {
                showClearConfirm = true
            } label: {
                Text(WeekPlanCopy.clearPlan)
                    .font(.caption.weight(.semibold))
            }
            .disabled(viewModel.isGenerating || viewModel.isSaving)
            .accessibilityIdentifier("week.clear")
        }
    }

    // MARK: - Helpers

    private func reminderDate(from time: String) -> Date {
        let parts = WeekPlanNotificationScheduler.parseReminderTime(time)
            ?? (hour: 7, minute: 30)
        var comps = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        comps.hour = parts.hour
        comps.minute = parts.minute
        return Calendar.current.date(from: comps) ?? Date()
    }

    private func occasionDisplay(_ apiValue: String) -> String {
        Occasion.allCases.first { $0.apiValue == apiValue }?.rawValue ?? apiValue.capitalized
    }
}

// MARK: - Collapsible outfit (summary collapsed; expand = slots + Why this works)

private struct WeekPlanOutfitCollapsibleView: View {
    let outfit: WeekPlanOutfitResponse
    let accessibilityPrefix: String
    @State private var isExpanded = false
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private var isRegularWidth: Bool { horizontalSizeClass == .regular }
    private var summary: String { WeekPlanOutfitDisplay.summaryLine(for: outfit) }
    private var slots: [WeekPlanOutfitDisplay.SlotRow] { WeekPlanOutfitDisplay.slotRows(for: outfit) }
    private var reasoning: String {
        outfit.reasoning.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            VStack(alignment: .leading, spacing: isRegularWidth ? 14 : 10) {
                ForEach(slots, id: \.category) { slot in
                    WeekPlanOutfitSlotRowView(outfit: outfit, slot: slot)
                }

                if !reasoning.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 6) {
                            Image(systemName: "lightbulb.fill")
                                .foregroundColor(AppTheme.accent)
                            Text(MainFlowUxCopy.whyThisWorks)
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                        }
                        Text(reasoning)
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.accentSoft)
                    .cornerRadius(10)
                    .accessibilityIdentifier("\(accessibilityPrefix).why")
                }
            }
            .padding(.top, 6)
        } label: {
            Text(summary.isEmpty ? WeekPlanCopy.outfitDetails : summary)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
                .multilineTextAlignment(.leading)
        }
        .tint(AppTheme.gradientStart)
        .accessibilityIdentifier("\(accessibilityPrefix).outfit")
        .accessibilityValue(isExpanded ? "expanded" : "collapsed")
    }
}

private struct WeekPlanOutfitSlotRowView: View {
    let outfit: WeekPlanOutfitResponse
    let slot: WeekPlanOutfitDisplay.SlotRow

    private var suggestion: OutfitSuggestion {
        WeekPlanOutfitDisplay.asOutfitSuggestion(outfit)
    }

    private var thumb: UIImage? {
        OutfitItemThumbnail.thumbnailImage(
            suggestion: suggestion,
            category: slot.category,
            uploadImage: nil
        )
    }

    private var sourceTag: String {
        WeekPlanOutfitDisplay.sourceTag(outfit: outfit, category: slot.category)
    }

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color.white.opacity(0.06))
                    .frame(width: 48, height: 48)
                if let thumb {
                    Image(uiImage: thumb)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                } else {
                    Text("✦")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(AppTheme.border, lineWidth: 1)
            )

            VStack(alignment: .leading, spacing: 4) {
                Text(slot.label)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
                    .textCase(.uppercase)
                Text(slot.description)
                    .font(.caption)
                    .foregroundColor(AppTheme.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(sourceTag)
                    .font(.caption2.weight(.medium))
                    .foregroundColor(AppTheme.accent)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(AppTheme.accentSoft)
                    .clipShape(Capsule())
            }
            Spacer(minLength: 0)
        }
    }
}
