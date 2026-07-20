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
    @State private var whyExpanded = false

    private var isRegularWidth: Bool { horizontalSizeClass == .regular }

    /// Elevated dark card surface (~#151B2D).
    private static let elevatedCard = Color(red: 0.08, green: 0.11, blue: 0.18)
    private static let statusReady = Color(red: 0.22, green: 0.78, blue: 0.45)
    private static let statusMissing = Color(red: 0.72, green: 0.40, blue: 0.92)

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
        .onChange(of: viewModel.selectedDayOfWeek) { _ in
            whyExpanded = false
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

            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: isRegularWidth ? 24 : 16) {
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

                        headerSection
                        sharedControlsSection
                        weekOverviewSection
                        selectedDayDetailSection
                        historySection

                        Button(role: .destructive) {
                            showClearConfirm = true
                        } label: {
                            Text(WeekPlanCopy.clearPlan)
                                .font(.caption.weight(.semibold))
                        }
                        .disabled(viewModel.isSaveDisabled)
                        .accessibilityIdentifier("week.clear")

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
                    .padding(.top, 16)
                    .padding(.bottom, 24)
                    .adaptiveContent(maxWidth: isRegularWidth ? 1080 : 720)
                    .frame(maxWidth: .infinity)
                }

                stickySaveBar
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(isRegularWidth ? WeekPlanCopy.pageTitle : WeekPlanCopy.navTitle)
                .font(isRegularWidth ? .title2.weight(.bold) : .title3.weight(.bold))
                .foregroundColor(AppTheme.textPrimary)
            Text(WeekPlanCopy.pageSubtitle)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
        }
        .accessibilityIdentifier("week.header")
    }

    // MARK: - Shared controls

    private var sharedControlsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .center, spacing: 10) {
                seasonPill
                reminderPill
                Spacer(minLength: 0)
            }

            Button {
                Task { await viewModel.generateWeek() }
            } label: {
                Text(WeekPlanCopy.generateWeek)
                    .font(.headline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(GradientButtonStyle(isEnabled: !viewModel.isBusy && viewModel.hasEnabledDays))
            .disabled(viewModel.isBusy || !viewModel.hasEnabledDays)
            .frame(minHeight: 44)
            .accessibilityIdentifier("week.generate")
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Self.elevatedCard)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
    }

    private var seasonPill: some View {
        HStack(spacing: 6) {
            Text(WeekPlanCopy.sharedSeasonLabel)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
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
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(AppTheme.surface)
        .clipShape(Capsule())
        .frame(minHeight: 44)
    }

    private var reminderPill: some View {
        HStack(spacing: 6) {
            Text(WeekPlanCopy.reminderLabel)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
            DatePicker(
                "Reminder time",
                selection: reminderBinding,
                displayedComponents: .hourAndMinute
            )
            .labelsHidden()
            .tint(AppTheme.gradientStart)
            .accessibilityIdentifier("week.reminderTime")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(AppTheme.surface)
        .clipShape(Capsule())
        .frame(minHeight: 44)
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

    // MARK: - Week overview

    private var weekOverviewSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(WeekPlanCopy.weekOverview)
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            if !viewModel.hasEnabledDays {
                Text(WeekPlanCopy.emptyDays)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .accessibilityIdentifier("week.emptyDays")
            }

            ScrollView(.horizontal, showsIndicators: isRegularWidth) {
                HStack(spacing: isRegularWidth ? 12 : 8) {
                    ForEach(viewModel.plan.days) { day in
                        if isRegularWidth {
                            dayCard(day)
                        } else {
                            dateStripCell(day)
                        }
                    }
                }
                .padding(.vertical, 4)
                .padding(.horizontal, 2)
            }
            .accessibilityIdentifier("week.overview")
        }
    }

    private func dateStripCell(_ day: WeekPlanDayResponse) -> some View {
        let selected = day.day_of_week == viewModel.selectedDayOfWeek
        let status = viewModel.dayStatus(for: day)
        return Button {
            viewModel.selectDay(day.day_of_week)
        } label: {
            VStack(spacing: 8) {
                Text(shortDayName(day.day_of_week))
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                Text(shortDateLabel(for: day.day_of_week))
                    .font(.caption2)
                    .foregroundColor(AppTheme.textSecondary)
                Circle()
                    .fill(statusDotColor(status))
                    .frame(width: 8, height: 8)
                    .accessibilityLabel(status.label)
            }
            .frame(width: 52, height: 72)
            .background(Self.elevatedCard)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(selected ? Self.statusMissing : AppTheme.border, lineWidth: selected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
        .frame(minWidth: 44, minHeight: 44)
        .accessibilityIdentifier("week.day.\(day.day_of_week).select")
        .accessibilityLabel("\(WeekPlanConstants.dayName(for: day.day_of_week)), \(status.label)")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func dayCard(_ day: WeekPlanDayResponse) -> some View {
        let selected = day.day_of_week == viewModel.selectedDayOfWeek
        let status = viewModel.dayStatus(for: day)
        let previewSlots = day.outfit.map { WeekPlanOutfitDisplay.slotRows(for: $0).prefix(3) } ?? []

        return Button {
            viewModel.selectDay(day.day_of_week)
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(WeekPlanConstants.dayName(for: day.day_of_week))
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(AppTheme.textPrimary)
                        Text(shortDateLabel(for: day.day_of_week))
                            .font(.caption2)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    Spacer(minLength: 4)
                    statusPill(status)
                }

                if day.enabled {
                    Text(occasionDisplay(day.occasion))
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .lineLimit(1)
                }

                HStack(spacing: 6) {
                    if previewSlots.isEmpty {
                        ForEach(0..<3, id: \.self) { _ in
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(Color.white.opacity(0.06))
                                .frame(width: 36, height: 36)
                        }
                    } else {
                        ForEach(Array(previewSlots), id: \.category) { slot in
                            slotThumb(outfit: day.outfit!, slot: slot, size: 36)
                        }
                    }
                }
            }
            .padding(12)
            .frame(width: 148, alignment: .leading)
            .background(Self.elevatedCard)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(selected ? Self.statusMissing : AppTheme.border, lineWidth: selected ? 2 : 1)
                    .shadow(color: selected ? Self.statusMissing.opacity(0.35) : .clear, radius: selected ? 6 : 0)
            )
        }
        .buttonStyle(.plain)
        .frame(minHeight: 44)
        .accessibilityIdentifier("week.day.\(day.day_of_week).select")
        .accessibilityLabel("\(WeekPlanConstants.dayName(for: day.day_of_week)), \(status.label)")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    // MARK: - Selected day detail

    @ViewBuilder
    private var selectedDayDetailSection: some View {
        if let day = viewModel.selectedDay {
            VStack(alignment: .leading, spacing: 14) {
                Text(WeekPlanCopy.dayDetail)
                    .font(.headline)
                    .foregroundColor(AppTheme.textPrimary)

                Group {
                    if isRegularWidth {
                        HStack(alignment: .top, spacing: 16) {
                            dayDetailLeftColumn(day)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            dayDetailRightColumn(day)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    } else {
                        VStack(alignment: .leading, spacing: 14) {
                            dayDetailLeftColumn(day)
                            dayDetailRightColumn(day)
                        }
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Self.elevatedCard)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(AppTheme.border, lineWidth: 1)
                )
                .accessibilityIdentifier("week.dayDetail")
            }
        }
    }

    private func dayDetailLeftColumn(_ day: WeekPlanDayResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(WeekPlanConstants.dayName(for: day.day_of_week))
                    .font(.title3.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                statusPill(viewModel.dayStatus(for: day))
            }

            daySetupControls(day)

            if let outfit = day.outfit, WeekPlanOutfitDisplay.hasExpandableDetails(outfit) {
                outfitItemGallery(outfit)
            } else if day.enabled {
                Text("No outfit yet — generate your week.")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
            } else {
                Text(WeekPlanCopy.statusRestDay)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
            }

            if viewModel.showsMissingActions(for: day) {
                missingItemsCard(day)
            }
        }
    }

    private func dayDetailRightColumn(_ day: WeekPlanDayResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if let outfit = day.outfit {
                let summary = WeekPlanOutfitDisplay.summaryLine(for: outfit)
                if !summary.isEmpty {
                    Text(summary)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("week.day.\(day.day_of_week).summary")
                }

                HStack(spacing: 8) {
                    if day.use_wardrobe_only {
                        badge(WeekPlanCopy.useWardrobe)
                    }
                    badge(occasionDisplay(day.occasion))
                }

                whyThisWorksSection(outfit: outfit, dayOfWeek: day.day_of_week)
            }

            if day.enabled {
                Button {
                    Task { await viewModel.regenerateDay(day.day_of_week) }
                } label: {
                    Text(WeekPlanCopy.regenerate)
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(GradientButtonStyle(isEnabled: !viewModel.isBusy))
                .disabled(viewModel.isBusy)
                .frame(minHeight: 44)
                .accessibilityIdentifier("week.day.\(day.day_of_week).regenerate")
            }

            if AdminVisibility.isAdmin(user: auth.currentUser),
               let outfit = day.outfit,
               WeekPlanOutfitDisplay.hasAdminDiagnostics(outfit) {
                WeekPlanOutfitAdminDiagnosticsView(
                    dayLabel: WeekPlanConstants.dayName(for: day.day_of_week),
                    outfit: outfit
                )
            }
        }
    }

    private func daySetupControls(_ day: WeekPlanDayResponse) -> some View {
        VStack(alignment: .leading, spacing: 10) {
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
            }
        }
    }

    private func outfitItemGallery(_ outfit: WeekPlanOutfitResponse) -> some View {
        let slots = WeekPlanOutfitDisplay.slotRows(for: outfit)
        let missing = WeekPlanMissingSlots.missing(for: outfit)
        return LazyVGrid(
            columns: [GridItem(.adaptive(minimum: isRegularWidth ? 100 : 88), spacing: 10)],
            spacing: 10
        ) {
            ForEach(slots, id: \.category) { slot in
                VStack(spacing: 6) {
                    slotThumb(outfit: outfit, slot: slot, size: isRegularWidth ? 72 : 64)
                    Text(slot.label)
                        .font(.caption2.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                    Text(slot.description)
                        .font(.caption2)
                        .foregroundColor(AppTheme.textPrimary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
            }
            ForEach(missing, id: \.category) { slot in
                VStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [5]))
                        .foregroundColor(Self.statusMissing.opacity(0.7))
                        .frame(width: isRegularWidth ? 72 : 64, height: isRegularWidth ? 72 : 64)
                        .overlay(
                            Image(systemName: "plus")
                                .foregroundColor(Self.statusMissing)
                        )
                    Text(slot.label)
                        .font(.caption2.weight(.semibold))
                        .foregroundColor(Self.statusMissing)
                    Text("Missing")
                        .font(.caption2)
                        .foregroundColor(AppTheme.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .accessibilityIdentifier("week.missingSlot.\(slot.category)")
            }
        }
        .accessibilityIdentifier("week.itemGallery")
    }

    private func missingItemsCard(_ day: WeekPlanDayResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.circle.fill")
                    .foregroundColor(Self.statusMissing)
                Text(WeekPlanCopy.missingItemsTitle)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
            }
            Text(WeekPlanCopy.missingItemsHint)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)

            let missing = viewModel.missingSlots(for: day)
            if !missing.isEmpty {
                Text(missing.map(\.label).joined(separator: ", "))
                    .font(.caption.weight(.medium))
                    .foregroundColor(Self.statusMissing)
            }

            VStack(spacing: 8) {
                Button {
                    viewModel.chooseFromWardrobe(dayOfWeek: day.day_of_week)
                    RouteCoordinator.shared.selectedTab = .wardrobe
                } label: {
                    Text(WeekPlanCopy.chooseFromWardrobe)
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(GradientButtonStyle(isEnabled: true))
                .frame(minHeight: 44)
                .accessibilityIdentifier("week.missing.chooseWardrobe")

                Button {
                    Task { await viewModel.findAlternative(dayOfWeek: day.day_of_week) }
                } label: {
                    Text(WeekPlanCopy.findAlternative)
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(AppTheme.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(AppTheme.border, lineWidth: 1)
                        )
                        .foregroundColor(AppTheme.textPrimary)
                }
                .disabled(viewModel.isBusy)
                .frame(minHeight: 44)
                .accessibilityIdentifier("week.missing.findAlternative")

                Button {
                    viewModel.continueWithoutMissing(dayOfWeek: day.day_of_week)
                } label: {
                    Text(WeekPlanCopy.continueWithout)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .frame(minHeight: 44)
                .accessibilityIdentifier("week.missing.continueWithout")
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Self.statusMissing.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Self.statusMissing.opacity(0.45), lineWidth: 1)
        )
        .accessibilityIdentifier("week.missingActions")
    }

    private func whyThisWorksSection(outfit: WeekPlanOutfitResponse, dayOfWeek: Int) -> some View {
        let reasoning = outfit.reasoning.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !reasoning.isEmpty else { return AnyView(EmptyView()) }

        return AnyView(
            DisclosureGroup(isExpanded: $whyExpanded) {
                Text(reasoning)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 6)
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "lightbulb.fill")
                        .foregroundColor(AppTheme.accent)
                    Text(WeekPlanCopy.whyThisOutfitWorks)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)
                }
            }
            .tint(AppTheme.gradientStart)
            .accessibilityIdentifier("week.day.\(dayOfWeek).why")
            .accessibilityValue(whyExpanded ? "expanded" : "collapsed")
        )
    }

    // MARK: - Sticky save

    private var stickySaveBar: some View {
        VStack(spacing: 0) {
            Divider().overlay(AppTheme.border)
            Button {
                Task { await viewModel.save() }
            } label: {
                Group {
                    if viewModel.isSaving {
                        ProgressView()
                            .tint(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    } else {
                        Text(WeekPlanCopy.savePlan)
                            .font(.headline.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                }
            }
            .buttonStyle(GradientButtonStyle(isEnabled: !viewModel.isSaveDisabled))
            .disabled(viewModel.isSaveDisabled)
            .padding(.horizontal, isRegularWidth ? 28 : 16)
            .padding(.vertical, 12)
            .accessibilityIdentifier("week.save")
        }
        .background(AppTheme.bgPrimary.opacity(0.96))
        .accessibilityIdentifier("week.stickySave")
    }

    // MARK: - History

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(WeekPlanCopy.previousPlans)
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            Text(WeekPlanCopy.previousPlansHint)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)

            if viewModel.history.isEmpty {
                Text(WeekPlanCopy.emptyHistory)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .accessibilityIdentifier("week.history.empty")
            } else {
                ForEach(viewModel.history) { item in
                    historyRow(item)
                }
            }
        }
        .accessibilityIdentifier("week.history")
    }

    private func historyRow(_ item: WeekPlanHistoryItem) -> some View {
        HStack(alignment: .center, spacing: isRegularWidth ? 16 : 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.label)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                Text(historySubtitle(item))
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            }
            Spacer(minLength: 8)
            Button {
                Task { await viewModel.restoreHistory(id: item.id) }
            } label: {
                Text(WeekPlanCopy.loadPlan)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
            }
            .disabled(viewModel.isBusy)
            .foregroundColor(AppTheme.gradientStart)
            .frame(minHeight: 44)
            .accessibilityIdentifier("week.history.\(item.id).load")
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Self.elevatedCard)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .accessibilityIdentifier("week.history.\(item.id)")
    }

    // MARK: - Shared chrome helpers

    private func statusPill(_ status: WeekPlanDayStatus) -> some View {
        Text(status.label)
            .font(.caption2.weight(.bold))
            .foregroundColor(statusPillForeground(status))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusPillBackground(status))
            .clipShape(Capsule())
            .accessibilityLabel(status.label)
    }

    private func statusDotColor(_ status: WeekPlanDayStatus) -> Color {
        switch status {
        case .ready: return Self.statusReady
        case .missing: return Self.statusMissing
        case .restDay: return AppTheme.textSecondary.opacity(0.5)
        case .notGenerated: return AppTheme.textSecondary.opacity(0.35)
        }
    }

    private func statusPillForeground(_ status: WeekPlanDayStatus) -> Color {
        switch status {
        case .ready: return Self.statusReady
        case .missing: return Self.statusMissing
        case .restDay, .notGenerated: return AppTheme.textSecondary
        }
    }

    private func statusPillBackground(_ status: WeekPlanDayStatus) -> Color {
        switch status {
        case .ready: return Self.statusReady.opacity(0.18)
        case .missing: return Self.statusMissing.opacity(0.18)
        case .restDay, .notGenerated: return Color.white.opacity(0.06)
        }
    }

    private func badge(_ text: String) -> some View {
        Text(text)
            .font(.caption2.weight(.medium))
            .foregroundColor(AppTheme.accent)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(AppTheme.accentSoft)
            .clipShape(Capsule())
    }

    private func slotThumb(outfit: WeekPlanOutfitResponse, slot: WeekPlanOutfitDisplay.SlotRow, size: CGFloat) -> some View {
        let suggestion = WeekPlanOutfitDisplay.asOutfitSuggestion(outfit)
        let thumb = OutfitItemThumbnail.thumbnailImage(
            suggestion: suggestion,
            category: slot.category,
            uploadImage: nil
        )
        return ZStack {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Color.white.opacity(0.06))
                .frame(width: size, height: size)
            if let thumb {
                Image(uiImage: thumb)
                    .resizable()
                    .scaledToFill()
                    .frame(width: size, height: size)
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
    }

    private func historySubtitle(_ item: WeekPlanHistoryItem) -> String {
        let days = item.enabled_day_count == 1
            ? "1 day"
            : "\(item.enabled_day_count) days"
        let date = formatHistoryDate(item.created_at)
        if date.isEmpty { return days }
        return "\(days) · \(date)"
    }

    private func formatHistoryDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: iso)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: iso)
        }
        guard let date else { return iso }
        return date.formatted(date: .abbreviated, time: .shortened)
    }

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

    private func shortDayName(_ dayOfWeek: Int) -> String {
        let name = WeekPlanConstants.dayName(for: dayOfWeek)
        return String(name.prefix(3))
    }

    /// Monday-based week dates relative to today.
    private func shortDateLabel(for dayOfWeek: Int) -> String {
        var cal = Calendar.current
        cal.firstWeekday = 2 // Monday
        let today = Date()
        let weekday = cal.component(.weekday, from: today)
        // Convert Calendar weekday (1=Sun…7=Sat) to Mon=0…Sun=6
        let todayDow = (weekday + 5) % 7
        let delta = dayOfWeek - todayDow
        guard let date = cal.date(byAdding: .day, value: delta, to: today) else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "d MMM"
        return formatter.string(from: date)
    }
}

// MARK: - Admin diagnostics (unchanged behavior)

private struct WeekPlanOutfitAdminDiagnosticsView: View {
    let dayLabel: String
    let outfit: WeekPlanOutfitResponse
    @State private var isExpanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: { isExpanded.toggle() }) {
                HStack {
                    Text("Admin diagnostics — \(dayLabel)")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption2.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                }
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("week.adminDiagnostics.\(dayLabel)")

            if isExpanded {
                if let cost = outfit.cost {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Generation cost")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(AppTheme.accent)
                        Text("ChatGPT: \(formatInsightsCost(cost.gpt4_cost))")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                        if let input = cost.input_tokens {
                            Text("Input tokens: \(input)")
                                .font(.caption2)
                                .foregroundColor(AppTheme.textSecondary)
                        }
                        if let output = cost.output_tokens {
                            Text("Output tokens: \(output)")
                                .font(.caption2)
                                .foregroundColor(AppTheme.textSecondary)
                        }
                        Text("Total: \(formatInsightsCost(cost.total_cost))")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(AppTheme.textPrimary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(AppTheme.accentSoft)
                    .cornerRadius(10)
                    .accessibilityIdentifier("week.generationCost")
                }

                weekPlanAdminTextPanel(
                    title: InsightsCopy.inputPromptTitle,
                    content: outfit.ai_prompt ?? "—",
                    accessibilityIdentifier: "week.inputPrompt"
                )
                weekPlanAdminTextPanel(
                    title: InsightsCopy.aiResponseTitle,
                    content: outfit.ai_raw_response ?? "—",
                    accessibilityIdentifier: "week.aiResponse"
                )
            }
        }
        .padding(10)
        .background(Color.white.opacity(0.04))
        .cornerRadius(12)
    }

    private func weekPlanAdminTextPanel(
        title: String,
        content: String,
        accessibilityIdentifier: String
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
            ScrollView(.vertical, showsIndicators: true) {
                Text(content)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundColor(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(minHeight: 72, maxHeight: 120)
            .padding(8)
            .background(Color.black.opacity(0.25))
            .cornerRadius(8)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.border, lineWidth: 1))
        }
        .accessibilityIdentifier(accessibilityIdentifier)
    }
}
