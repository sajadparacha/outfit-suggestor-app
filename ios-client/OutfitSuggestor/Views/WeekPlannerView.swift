//
//  WeekPlannerView.swift
//  OutfitSuggestor
//
//  Week Outfit Planner — plan days, generate outfits, local reminders.
//

import SwiftUI
import UIKit

struct WeekPlannerView: View {
    @ObservedObject var viewModel: WeekPlannerViewModel
    @ObservedObject private var auth = AuthService.shared
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var showClearConfirm = false
    @State private var whyExpanded = false
    @State private var showSavePresetAlert = false
    @State private var savePresetName = ""
    @State private var presetToRename: WeekPlanPresetItem?
    @State private var renamePresetName = ""
    @State private var presetToDelete: WeekPlanPresetItem?
    @State private var presetToApply: WeekPlanPresetItem?
    @State private var showApplyPresetConfirm = false
    @State private var showGenerateOverwriteConfirm = false
    @State private var showRegenerateConfirm = false
    @State private var regenerateDayOfWeek: Int?
    @State private var historyToLoad: WeekPlanHistoryItem?
    @State private var showLoadHistoryConfirm = false
    @State private var showAllPresets = false
    @State private var showAllHistory = false
    @State private var templatesExpanded = false
    @State private var historyExpanded = false
    @State private var fullScreenImage: UIImage?

    private var isRegularWidth: Bool { horizontalSizeClass == .regular }

    /// Elevated dark card surface (~#151B2D).
    private static let elevatedCard = Color(red: 0.08, green: 0.11, blue: 0.18)
    private static let statusNeeds = Color(red: 0.72, green: 0.40, blue: 0.92)
    private static let selectedAccent = Color(red: 0.31, green: 0.67, blue: 0.99)

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
        .confirmationDialog(
            WeekPlanCopy.configurationDeleteTitle,
            isPresented: Binding(
                get: { presetToDelete != nil },
                set: { if !$0 { presetToDelete = nil } }
            ),
            titleVisibility: .visible
        ) {
            if let preset = presetToDelete {
                Button(WeekPlanCopy.deleteConfiguration, role: .destructive) {
                    let id = preset.id
                    presetToDelete = nil
                    Task { await viewModel.deletePreset(id: id) }
                }
            }
            Button("Cancel", role: .cancel) { presetToDelete = nil }
        } message: {
            Text(WeekPlanCopy.configurationDeleteMessage)
        }
        .confirmationDialog(
            WeekPlanCopy.configurationApplyTitle,
            isPresented: $showApplyPresetConfirm,
            titleVisibility: .visible
        ) {
            if let preset = presetToApply {
                Button(WeekPlanCopy.loadConfiguration) {
                    let id = preset.id
                    presetToApply = nil
                    Task { await viewModel.applyPreset(id: id) }
                }
            }
            Button("Cancel", role: .cancel) {
                presetToApply = nil
            }
        } message: {
            Text(WeekPlanCopy.configurationApplyMessage)
        }
        .confirmationDialog(
            WeekPlanCopy.generateOverwriteTitle,
            isPresented: $showGenerateOverwriteConfirm,
            titleVisibility: .visible
        ) {
            Button(WeekPlanCopy.generateOutfits, role: .destructive) {
                Task { await viewModel.generateWeek() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(WeekPlanCopy.generateOverwriteMessage)
        }
        .confirmationDialog(
            WeekPlanCopy.regenerateConfirmTitle,
            isPresented: $showRegenerateConfirm,
            titleVisibility: .visible
        ) {
            Button(WeekPlanCopy.regenerate, role: .destructive) {
                if let day = regenerateDayOfWeek {
                    Task { await viewModel.regenerateDay(day) }
                }
                regenerateDayOfWeek = nil
            }
            Button("Cancel", role: .cancel) { regenerateDayOfWeek = nil }
        } message: {
            Text(WeekPlanCopy.regenerateConfirmMessage)
        }
        .confirmationDialog(
            WeekPlanCopy.loadHistoryConfirmTitle,
            isPresented: $showLoadHistoryConfirm,
            titleVisibility: .visible
        ) {
            if let item = historyToLoad {
                Button(WeekPlanCopy.loadPlan, role: .destructive) {
                    let id = item.id
                    historyToLoad = nil
                    Task { await viewModel.restoreHistory(id: id) }
                }
            }
            Button("Cancel", role: .cancel) { historyToLoad = nil }
        } message: {
            Text(WeekPlanCopy.loadHistoryConfirmMessage)
        }
        .alert(WeekPlanCopy.saveConfiguration, isPresented: $showSavePresetAlert) {
            TextField("Name", text: $savePresetName)
                .textInputAutocapitalization(.words)
            Button("Save") {
                let name = savePresetName
                savePresetName = ""
                Task { await viewModel.saveAsPreset(name: name) }
            }
            Button("Cancel", role: .cancel) {
                savePresetName = ""
            }
        } message: {
            Text(WeekPlanCopy.savedConfigurationsHint)
        }
        .alert(WeekPlanCopy.renameConfiguration, isPresented: Binding(
            get: { presetToRename != nil },
            set: { if !$0 { presetToRename = nil } }
        )) {
            TextField("Name", text: $renamePresetName)
                .textInputAutocapitalization(.words)
            Button("Save") {
                guard let preset = presetToRename else { return }
                let name = renamePresetName
                presetToRename = nil
                renamePresetName = ""
                Task { await viewModel.renamePreset(id: preset.id, name: name) }
            }
            Button("Cancel", role: .cancel) {
                presetToRename = nil
                renamePresetName = ""
            }
        }
        .task {
            guard auth.isAuthenticated else { return }
            await viewModel.load()
        }
        .onChange(of: viewModel.selectedDayOfWeek) { _ in
            whyExpanded = false
        }
        .fullScreenCover(isPresented: Binding(get: { fullScreenImage != nil }, set: { if !$0 { fullScreenImage = nil } })) {
            if let image = fullScreenImage {
                FullScreenImageView(image: image) {
                    fullScreenImage = nil
                }
            }
        }
    }

    private var plannerContent: some View {
        ZStack(alignment: .top) {
            LinearGradient(
                colors: [AppTheme.bgPrimary, AppTheme.bgSecondary],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

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
                    presetsSection
                    historySection

                    Button(role: .destructive) {
                        showClearConfirm = true
                    } label: {
                        Text(WeekPlanCopy.clearPlan)
                            .font(.caption.weight(.semibold))
                    }
                    .disabled(viewModel.isBusy)
                    .accessibilityIdentifier("week.clear")

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

            if let toast = viewModel.toastMessage {
                toastBanner(toast)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .zIndex(1)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: viewModel.toastMessage)
    }

    private func toastBanner(_ message: String) -> some View {
        Text(message)
            .font(.subheadline.weight(.medium))
            .foregroundColor(AppTheme.textPrimary)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Self.elevatedCard)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(AppTheme.border, lineWidth: 1))
            .shadow(color: .black.opacity(0.25), radius: 8, y: 2)
            .accessibilityIdentifier("week.toast")
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(isRegularWidth ? WeekPlanCopy.pageTitle : WeekPlanCopy.navTitle)
                .font(isRegularWidth ? .title2.weight(.bold) : .title3.weight(.bold))
                .foregroundColor(AppTheme.textPrimary)
            Text(viewModel.weekRangeLabel)
                .font(.subheadline.weight(.medium))
                .foregroundColor(AppTheme.textSecondary)
                .accessibilityIdentifier("week.range")
            Text(WeekPlanCopy.pageSubtitle)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)

            if !viewModel.hasGeneratedOutfits {
                Text(WeekPlanCopy.noOutfitsTip)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("week.noOutfitsTip")
            }

            Text(viewModel.documentState.label)
                .font(.caption.weight(.semibold))
                .foregroundColor(viewModel.isDirty ? AppTheme.accent : AppTheme.textSecondary)
                .accessibilityIdentifier("week.documentState")

            primaryCTAButton
        }
        .accessibilityIdentifier("week.header")
    }

    private var primaryCTAButton: some View {
        Button {
            handlePrimaryCTA()
        } label: {
            Group {
                if viewModel.isSaving || viewModel.isGenerating {
                    ProgressView()
                        .tint(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                } else {
                    Text(viewModel.primaryCTA.title)
                        .font(.headline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
            }
        }
        .buttonStyle(GradientButtonStyle(isEnabled: viewModel.isPrimaryCTAEnabled))
        .disabled(!viewModel.isPrimaryCTAEnabled)
        .frame(minHeight: 44)
        .accessibilityIdentifier("week.primaryCTA")
    }

    private func handlePrimaryCTA() {
        switch viewModel.primaryCTA {
        case .generate:
            if viewModel.shouldConfirmGenerateOverwrite {
                showGenerateOverwriteConfirm = true
            } else {
                Task { await viewModel.generateWeek() }
            }
        case .save:
            Task { await viewModel.save() }
        }
    }

    // MARK: - Shared controls (compact — no Generate CTA)

    private var sharedControlsSection: some View {
        HStack(alignment: .top, spacing: 10) {
            seasonControl
            reminderControl
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Self.elevatedCard)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .accessibilityIdentifier("week.controls")
    }

    private var seasonControl: some View {
        VStack(alignment: .leading, spacing: 6) {
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
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .frame(minHeight: 44)
    }

    private var reminderControl: some View {
        VStack(alignment: .leading, spacing: 6) {
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
            Text("\(WeekPlanCopy.timezoneLabel): \(viewModel.plan.timezone.isEmpty ? TimeZone.current.identifier : viewModel.plan.timezone)")
                .font(.caption2)
                .foregroundColor(AppTheme.textSecondary)
                .accessibilityIdentifier("week.timezone")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(AppTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
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
                        dayCard(day)
                    }
                }
                .padding(.vertical, 4)
                .padding(.horizontal, 2)
            }
            .accessibilityIdentifier("week.overview")
        }
    }

    private func dayCard(_ day: WeekPlanDayResponse) -> some View {
        let selected = day.day_of_week == viewModel.selectedDayOfWeek
        let exceptional = viewModel.exceptionalStatusLabel(for: day)
        let cardWidth: CGFloat = isRegularWidth ? 148 : 120
        let previewSlots = day.outfit.map {
            WeekPlanOutfitDisplay.slotRows(
                for: $0,
                season: viewModel.plan.shared_season,
                occasion: day.occasion,
                style: day.style
            ).prefix(3)
        } ?? []

        return Button {
            viewModel.selectDay(day.day_of_week)
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top, spacing: 4) {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            if selected {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.caption2)
                                    .foregroundColor(Self.selectedAccent)
                                    .accessibilityHidden(true)
                            }
                            Text(WeekPlanConstants.dayName(for: day.day_of_week))
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                                .lineLimit(1)
                        }
                        Text(shortDateLabel(for: day.day_of_week))
                            .font(.caption2)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    Spacer(minLength: 2)
                    if let exceptional, exceptional != WeekPlanCopy.statusNotPlanned {
                        statusPill(exceptional)
                    }
                }

                Text(WeekPlanDayCardDisplay.contextLine(
                    enabled: day.enabled,
                    occasion: day.occasion,
                    style: day.style
                ))
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    if previewSlots.isEmpty {
                        ForEach(0..<3, id: \.self) { _ in
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(Color.white.opacity(day.enabled ? 0.06 : 0.03))
                                .frame(width: isRegularWidth ? 36 : 28, height: isRegularWidth ? 36 : 28)
                        }
                    } else if let outfit = day.outfit {
                        ForEach(Array(previewSlots), id: \.category) { slot in
                            slotThumb(outfit: outfit, slot: slot, size: isRegularWidth ? 36 : 28)
                        }
                    }
                }

                Text(day.enabled ? WeekPlanCopy.planned : WeekPlanCopy.includeDay)
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(day.enabled ? Self.selectedAccent : AppTheme.textSecondary)
            }
            .padding(isRegularWidth ? 12 : 10)
            .frame(width: cardWidth, alignment: .leading)
            .background(selected ? Self.selectedAccent.opacity(0.12) : Self.elevatedCard)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(selected ? Self.selectedAccent : AppTheme.border, lineWidth: selected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
        .frame(minHeight: 44)
        .accessibilityIdentifier("week.day.\(day.day_of_week).select")
        .accessibilityLabel(dayCardAccessibilityLabel(day: day, exceptional: exceptional))
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
                if let exceptional = viewModel.exceptionalStatusLabel(for: day),
                   exceptional != WeekPlanCopy.statusNotPlanned {
                    statusPill(exceptional)
                }
            }

            plannedToggle(day)
            dayPrefsNearby(day)
            fourSlotGallery(day)

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
            } else if day.enabled {
                Text("No outfit yet — generate your week.")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
            } else {
                Text(WeekPlanCopy.statusNotPlanned)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
            }

            if day.enabled {
                Button {
                    if day.outfit != nil {
                        regenerateDayOfWeek = day.day_of_week
                        showRegenerateConfirm = true
                    } else {
                        Task { await viewModel.regenerateDay(day.day_of_week) }
                    }
                } label: {
                    Text(WeekPlanCopy.regenerate)
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

    private func plannedToggle(_ day: WeekPlanDayResponse) -> some View {
        Button {
            viewModel.setDayEnabled(day.day_of_week, enabled: !day.enabled)
            if !day.enabled {
                viewModel.selectDay(day.day_of_week)
            }
        } label: {
            Text(day.enabled ? WeekPlanCopy.planned : WeekPlanCopy.includeDay)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(day.enabled ? AppTheme.textPrimary : AppTheme.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(day.enabled ? AppTheme.gradientStart.opacity(0.15) : AppTheme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(day.enabled ? AppTheme.gradientStart.opacity(0.45) : AppTheme.border, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .disabled(viewModel.isBusy)
        .frame(minHeight: 44)
        .accessibilityIdentifier("week.day.\(day.day_of_week).toggle")
        .accessibilityLabel(
            day.enabled
                ? "Mark \(WeekPlanConstants.dayName(for: day.day_of_week)) as not planned"
                : "Mark \(WeekPlanConstants.dayName(for: day.day_of_week)) as planned"
        )
        .accessibilityAddTraits(.isButton)
    }

    private func dayPrefsNearby(_ day: WeekPlanDayResponse) -> some View {
        Group {
            if day.enabled {
                VStack(alignment: .leading, spacing: 8) {
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
    }

    private func fourSlotGallery(_ day: WeekPlanDayResponse) -> some View {
        let slots = WeekPlanOutfitDisplay.fourSlotRows(for: day.outfit)
        let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 2)
        return LazyVGrid(columns: columns, spacing: 10) {
            ForEach(slots, id: \.category) { slot in
                let wardrobeCategory = slot.category == "accessory" ? "belt" : slot.category
                VStack(spacing: 6) {
                    if slot.isPlaceholder {
                        Button {
                            openWardrobe(
                                category: wardrobeCategory,
                                slotKey: wardrobeCategory,
                                dayOfWeek: day.day_of_week
                            )
                        } label: {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [5]))
                                .foregroundColor(
                                    slot.category == "accessory"
                                        ? AppTheme.textSecondary.opacity(0.7)
                                        : Self.statusNeeds.opacity(0.7)
                                )
                                .frame(height: isRegularWidth ? 72 : 64)
                                .overlay(
                                    VStack(spacing: 4) {
                                        Image(systemName: "plus")
                                        if slot.category == "accessory" {
                                            Text(WeekPlanCopy.addAccessory)
                                                .font(.caption2.weight(.semibold))
                                        } else {
                                            Text("Add \(slot.label)")
                                                .font(.caption2.weight(.semibold))
                                        }
                                    }
                                    .foregroundColor(
                                        slot.category == "accessory" ? AppTheme.textSecondary : Self.statusNeeds
                                    )
                                )
                        }
                        .buttonStyle(.plain)
                        .frame(minHeight: 44)
                        .accessibilityLabel(
                            slot.category == "accessory"
                                ? WeekPlanCopy.addAccessory
                                : "Add \(slot.label)"
                        )
                    } else if let outfit = day.outfit {
                        slotThumb(
                            outfit: outfit,
                            slot: WeekPlanOutfitDisplay.SlotRow(
                                category: wardrobeCategory,
                                label: slot.label,
                                description: slot.description
                            ),
                            size: isRegularWidth ? 72 : 64,
                            allowsEnlarge: true
                        )
                    }
                    Text(slot.isPlaceholder && slot.category == "accessory" ? "Accessory" : slot.label)
                        .font(.caption2.weight(.semibold))
                        .foregroundColor(slot.isPlaceholder ? AppTheme.textSecondary : AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                    if !slot.isPlaceholder && !slot.description.isEmpty {
                        Text(slot.description)
                            .font(.caption2)
                            .foregroundColor(AppTheme.textPrimary)
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }
                    if !slot.isPlaceholder {
                        Button {
                            openWardrobe(
                                category: wardrobeCategory,
                                slotKey: wardrobeCategory,
                                dayOfWeek: day.day_of_week
                            )
                        } label: {
                            Text(WeekPlanCopy.changeItem)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(AppTheme.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .stroke(AppTheme.border, lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)
                        .frame(minHeight: 44)
                        .accessibilityIdentifier("week.slot.\(slot.category).change")
                        .accessibilityLabel("\(WeekPlanCopy.changeItem) \(slot.label)")
                    }
                }
                .frame(maxWidth: .infinity)
                .accessibilityIdentifier(
                    slot.isPlaceholder
                        ? "week.slot.\(slot.category).empty"
                        : "week.slot.\(slot.category)"
                )
            }
        }
        .accessibilityIdentifier("week.itemGallery")
    }

    private func openWardrobe(category: String, slotKey: String, dayOfWeek: Int) {
        viewModel.chooseFromWardrobe(dayOfWeek: dayOfWeek)
        RouteCoordinator.shared.startWardrobePick(
            dayOfWeek: dayOfWeek,
            slotKey: slotKey,
            category: category
        )
    }

    private func missingItemsCard(_ day: WeekPlanDayResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.circle.fill")
                    .foregroundColor(Self.statusNeeds)
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
                    .foregroundColor(Self.statusNeeds)
            }

            VStack(spacing: 8) {
                Button {
                    let slotKey = viewModel.missingSlots(for: day).first?.category ?? "shirt"
                    viewModel.chooseFromWardrobe(dayOfWeek: day.day_of_week)
                    RouteCoordinator.shared.startWardrobePick(
                        dayOfWeek: day.day_of_week,
                        slotKey: slotKey,
                        category: slotKey
                    )
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
        .background(Self.statusNeeds.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Self.statusNeeds.opacity(0.45), lineWidth: 1)
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

    // MARK: - Planning templates (collapsed)

    private var presetsSection: some View {
        DisclosureGroup(isExpanded: $templatesExpanded) {
            VStack(alignment: .leading, spacing: 12) {
                Text(WeekPlanCopy.savedConfigurationsHint)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .padding(.top, 8)

                if let atLimit = viewModel.presetAtLimitMessage {
                    Text(atLimit)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.accent)
                        .accessibilityIdentifier("week.presets.atLimit")
                }

                Button {
                    savePresetName = ""
                    showSavePresetAlert = true
                } label: {
                    Text(WeekPlanCopy.saveConfiguration)
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
                .disabled(viewModel.isPresetSaveDisabled)
                .frame(minHeight: 44)
                .accessibilityIdentifier("week.presets.saveAs")

                if viewModel.presets.isEmpty {
                    Text(WeekPlanCopy.emptyConfigurations)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                        .accessibilityIdentifier("week.presets.empty")
                } else {
                    let items = showAllPresets ? viewModel.presets : viewModel.recentPresets
                    ForEach(items) { preset in
                        presetRow(preset)
                    }
                    if viewModel.showsViewAllPresets {
                        Button(showAllPresets ? "Show less" : WeekPlanCopy.viewAll) {
                            showAllPresets.toggle()
                        }
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.gradientStart)
                        .accessibilityIdentifier("week.presets.viewAll")
                    }
                }
            }
        } label: {
            HStack {
                Text(WeekPlanCopy.planningTemplates)
                    .font(.headline)
                    .foregroundColor(AppTheme.textPrimary)
                Spacer(minLength: 8)
                if viewModel.presetLimit > 0 {
                    Text(viewModel.presetUsageText)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                        .accessibilityIdentifier("week.presets.usage")
                }
            }
        }
        .tint(AppTheme.gradientStart)
        .accessibilityIdentifier("week.presets")
        .accessibilityValue(templatesExpanded ? "expanded" : "collapsed")
    }

    private func presetRow(_ preset: WeekPlanPresetItem) -> some View {
        let enabledDays = preset.config.days.filter(\.enabled).count
        let daysLabel = enabledDays == 1 ? "1 day" : "\(enabledDays) days"
        return HStack(alignment: .center, spacing: isRegularWidth ? 16 : 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(preset.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                Text("\(daysLabel) · \(WeekPlanDateFormatting.humanReadable(preset.updated_at))")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            }
            Spacer(minLength: 8)
            Button {
                beginApplyPreset(preset)
            } label: {
                Text(WeekPlanCopy.loadConfiguration)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
            }
            .disabled(viewModel.isBusy || viewModel.isPresetBusy)
            .foregroundColor(AppTheme.gradientStart)
            .frame(minHeight: 44)
            .accessibilityIdentifier("week.presets.\(preset.id).load")

            Menu {
                Button(WeekPlanCopy.updateConfiguration) {
                    Task { await viewModel.updatePreset(id: preset.id) }
                }
                Button(WeekPlanCopy.renameConfiguration) {
                    presetToRename = preset
                    renamePresetName = preset.name
                }
                Button(WeekPlanCopy.deleteConfiguration, role: .destructive) {
                    presetToDelete = preset
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.body)
                    .foregroundColor(AppTheme.textSecondary)
                    .frame(minWidth: 44, minHeight: 44)
            }
            .disabled(viewModel.isBusy || viewModel.isPresetBusy)
            .accessibilityIdentifier("week.presets.\(preset.id).menu")
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Self.elevatedCard)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .accessibilityIdentifier("week.presets.\(preset.id)")
    }

    private func beginApplyPreset(_ preset: WeekPlanPresetItem) {
        if viewModel.hasGeneratedOutfits || viewModel.isDirty {
            presetToApply = preset
            showApplyPresetConfirm = true
        } else {
            Task { await viewModel.applyPreset(id: preset.id) }
        }
    }

    // MARK: - Plan history (collapsed)

    private var historySection: some View {
        DisclosureGroup(isExpanded: $historyExpanded) {
            VStack(alignment: .leading, spacing: 12) {
                Text(WeekPlanCopy.previousPlansHint)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .padding(.top, 8)

                if viewModel.history.isEmpty {
                    Text(WeekPlanCopy.emptyHistory)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                        .accessibilityIdentifier("week.history.empty")
                } else {
                    let items = showAllHistory ? viewModel.history : viewModel.recentHistory
                    ForEach(items) { item in
                        historyRow(item)
                    }
                    if viewModel.showsViewAllHistory {
                        Button(showAllHistory ? "Show less" : WeekPlanCopy.viewAll) {
                            showAllHistory.toggle()
                        }
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.gradientStart)
                        .accessibilityIdentifier("week.history.viewAll")
                    }
                }
            }
        } label: {
            Text(WeekPlanCopy.planHistory)
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)
        }
        .tint(AppTheme.gradientStart)
        .accessibilityIdentifier("week.history")
        .accessibilityValue(historyExpanded ? "expanded" : "collapsed")
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
                beginLoadHistory(item)
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

    private func beginLoadHistory(_ item: WeekPlanHistoryItem) {
        if viewModel.isDirty || viewModel.hasGeneratedOutfits {
            historyToLoad = item
            showLoadHistoryConfirm = true
        } else {
            Task { await viewModel.restoreHistory(id: item.id) }
        }
    }

    // MARK: - Shared chrome helpers

    private func statusPill(_ label: String) -> some View {
        Text(label)
            .font(.caption2.weight(.bold))
            .foregroundColor(Self.statusNeeds)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Self.statusNeeds.opacity(0.18))
            .clipShape(Capsule())
            .accessibilityLabel(label)
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

    @ViewBuilder
    private func slotThumb(
        outfit: WeekPlanOutfitResponse,
        slot: WeekPlanOutfitDisplay.SlotRow,
        size: CGFloat,
        allowsEnlarge: Bool = false
    ) -> some View {
        let suggestion = WeekPlanOutfitDisplay.asOutfitSuggestion(outfit)
        let thumb = OutfitItemThumbnail.thumbnailImage(
            suggestion: suggestion,
            category: slot.category,
            uploadImage: nil
        )
        let visual = ZStack {
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

        if allowsEnlarge, ThumbnailEnlargeUx.canOpen(image: thumb), let thumb {
            Button {
                fullScreenImage = thumb
            } label: {
                visual
            }
            .buttonStyle(.plain)
            .frame(minWidth: max(size, 44), minHeight: max(size, 44))
            .accessibilityLabel(ThumbnailEnlargeUx.accessibilityLabel(forName: slot.label))
            .accessibilityIdentifier(ThumbnailEnlargeUx.weekSlotAccessibilityId(category: slot.category))
        } else {
            visual
        }
    }

    private func historySubtitle(_ item: WeekPlanHistoryItem) -> String {
        let days = item.enabled_day_count == 1
            ? "1 day"
            : "\(item.enabled_day_count) days"
        let date = WeekPlanDateFormatting.humanReadable(item.created_at)
        if date.isEmpty { return days }
        return "\(days) · \(date)"
    }

    private func reminderDate(from time: String) -> Date {
        let parts = WeekPlanNotificationScheduler.parseReminderTime(time)
            ?? (hour: 7, minute: 30)
        var comps = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        comps.hour = parts.hour
        comps.minute = parts.minute
        return Calendar.current.date(from: comps) ?? Date()
    }

    private func dayCardAccessibilityLabel(day: WeekPlanDayResponse, exceptional: String?) -> String {
        let dayName = WeekPlanConstants.dayName(for: day.day_of_week)
        let status = exceptional ?? (day.enabled ? WeekPlanCopy.planned : WeekPlanCopy.notPlanned)
        let context = WeekPlanDayCardDisplay.contextLine(
            enabled: day.enabled,
            occasion: day.occasion,
            style: day.style
        )
        return "\(dayName), \(context), \(status)"
    }

    private func occasionDisplay(_ apiValue: String) -> String {
        WeekPlanDayCardDisplay.occasionDisplay(apiValue)
    }

    /// Monday-based week dates relative to today.
    private func shortDateLabel(for dayOfWeek: Int) -> String {
        var cal = Calendar.current
        cal.firstWeekday = 2 // Monday
        let today = Date()
        let weekday = cal.component(.weekday, from: today)
        let todayDow = (weekday + 5) % 7
        let delta = dayOfWeek - todayDow
        guard let date = cal.date(byAdding: .day, value: delta, to: today) else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "d MMM"
        return formatter.string(from: date)
    }
}

// MARK: - Week overview day card display

enum WeekPlanDayCardDisplay {
    static func contextLine(enabled: Bool, occasion: String, style: String) -> String {
        guard enabled else { return "Off" }
        let occasionLabel = {
            let label = occasionDisplay(occasion)
            return label.isEmpty ? "Everyday" : label
        }()
        return "\(occasionLabel) · \(styleDisplay(style))"
    }

    static func occasionDisplay(_ apiValue: String) -> String {
        Occasion.allCases.first { $0.apiValue == apiValue }?.rawValue ?? apiValue.capitalized
    }

    static func styleDisplay(_ apiValue: String) -> String {
        let trimmed = apiValue.trimmingCharacters(in: .whitespacesAndNewlines)
        let resolved = trimmed.isEmpty ? Style.classic.apiValue : trimmed
        return Style.allCases.first { $0.apiValue == resolved }?.rawValue ?? resolved.capitalized
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

// MARK: - Thumbnail enlarge (Week Planner + Wardrobe)

enum ThumbnailEnlargeUx {
    static func canOpen(image: UIImage?) -> Bool {
        image != nil
    }

    static func accessibilityLabel(forName name: String) -> String {
        "View \(name) full size"
    }

    static func weekSlotAccessibilityId(category: String) -> String {
        "week.slot.\(category).enlarge"
    }

    static func wardrobeThumbAccessibilityId(itemId: Int) -> String {
        "wardrobe.thumb.\(itemId).enlarge"
    }

    /// Change / Select stay on separate controls — enlarge must not invoke them.
    static func enlargeDoesNotTriggerChange(changeFired: Bool) -> Bool {
        !changeFired
    }
}

/// Testable open/dismiss gate matching Wardrobe / Week Planner `fullScreenCover` state.
struct ThumbnailEnlargePresentation {
    private(set) var image: UIImage?

    var isOpen: Bool { image != nil }

    mutating func open(_ image: UIImage?) {
        guard ThumbnailEnlargeUx.canOpen(image: image), let image else { return }
        self.image = image
    }

    mutating func dismiss() {
        image = nil
    }
}
