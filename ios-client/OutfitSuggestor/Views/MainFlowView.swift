//
//  MainFlowView.swift
//  OutfitSuggestor
//
//  Main suggestion flow: upload, filters, wardrobe-only toggle, random picks, get suggestion, result
//

import SwiftUI
import UIKit

struct MainFlowView: View {
    @ObservedObject var viewModel: OutfitViewModel
    var onRequestHistory: (() -> Void)? = nil
    var onNavigateToProfile: (() -> Void)? = nil
    @ObservedObject private var auth = AuthService.shared
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var showImagePicker = false
    @State private var pickerSourceType: UIImagePickerController.SourceType = .photoLibrary
    @State private var showAddToWardrobeSheet = false
    @State private var showAddFromCreationSheet = false
    @State private var showAdminOptionsSheet = false
    @State private var showRandomPicksDialog = false
    @State private var showMoreActionsMenu = false
    @State private var showOccasionPicker = false
    @State private var showRefineSheet = false
    @State private var showAiPromptResponse = true
    @State private var transientMessage: String?
    @AppStorage("guest_first_outfit_prompt_shown") private var guestFirstOutfitPromptShown = false
    @AppStorage(FirstRunCoachCopy.storageKeyDismissed) private var firstRunCoachDismissed = false
    @AppStorage(FirstRunCoachCopy.storageKeyPrefsExpanded) private var firstRunPrefsExpanded = false
    @State private var showFirstOutfitBanner = false
    @State private var showGuestAuthSheet = false
    @State private var guestAuthContext: AuthPromptContext = .like
    @State private var guestAuthDestination: GuestAuthSheetDestination = .login

    private let resultScrollAnchor = "main.resultAnchor"

    private var isAdmin: Bool {
        auth.currentUser?.is_admin == true
    }

    private var hasSuggestion: Bool {
        viewModel.currentSuggestion != nil
    }

    private var showsCompactResultLayout: Bool {
        MainFlowLayoutLogic.showsCompactResultLayout(
            hasSuggestion: hasSuggestion,
            sourceWardrobeItemId: viewModel.sourceWardrobeItem?.id,
            highlightGenerateButton: viewModel.highlightGenerateButton
        )
    }

    private var canRequestSuggestion: Bool {
        viewModel.selectedImage != nil && !viewModel.isLoading && !viewModel.isGuestBlocked
    }

    private var cardUploadImage: UIImage? {
        viewModel.loadedFromRandomPick ? nil : viewModel.selectedImage
    }

    private var showsGuestRemainingHint: Bool {
        !auth.isAuthenticated && !viewModel.isGuestBlocked && viewModel.guestRemaining != nil
    }

    private var isRegularWidth: Bool {
        horizontalSizeClass == .regular
    }

    private var showsFirstRunCoach: Bool {
        !showsCompactResultLayout && FirstRunCoachLogic.shouldShowCoach(dismissed: firstRunCoachDismissed)
    }

    private var showsCollapsedPreferences: Bool {
        !showsCompactResultLayout && FirstRunCoachLogic.shouldCollapsePreferences(
            coachDismissed: firstRunCoachDismissed,
            prefsExpanded: firstRunPrefsExpanded
        )
    }

    private var showsGuestLimitGate: Bool {
        MainFlowGuestLimitLogic.showsGuestLimitGate(
            isAuthenticated: auth.isAuthenticated,
            isGuestBlocked: viewModel.isGuestBlocked
        )
    }

    private var canGenerateAnotherFromResult: Bool {
        viewModel.canGenerateAnotherFromResult
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [AppTheme.bgPrimary, AppTheme.bgSecondary],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollViewReader { scrollProxy in
                ScrollView(.vertical, showsIndicators: true) {
                    VStack(spacing: 22) {
                        HomeHeaderView {
                            onNavigateToProfile?()
                        }

                        if showsGuestLimitGate {
                            guestLimitGateSection
                        } else if isRegularWidth {
                            regularWidthFlow
                        } else {
                            compactWidthFlow
                        }

                        Spacer(minLength: showsCompactResultLayout ? 100 : 50)
                    }
                    .padding(.vertical, 8)
                    .adaptiveContent(maxWidth: MainFlowLayoutLogic.maxContentWidth)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onChange(of: hasSuggestion) { hasResult in
                    if hasResult {
                        firstRunCoachDismissed = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                            withAnimation {
                                scrollProxy.scrollTo(resultScrollAnchor, anchor: .top)
                            }
                        }
                    }
                    guard hasResult,
                          !auth.isAuthenticated,
                          !guestFirstOutfitPromptShown else { return }
                    guestFirstOutfitPromptShown = true
                    withAnimation {
                        showFirstOutfitBanner = true
                    }
                }
            }

            if viewModel.showsAiProgressPanel, let operationType = viewModel.aiOperationType {
                VStack {
                    Spacer()
                    AiProgressPanelView(
                        operationType: operationType,
                        message: viewModel.loadingMessage,
                        onCancel: { viewModel.cancelOperation() }
                    )
                    .padding(.horizontal, 16)
                    .padding(.bottom, showsCompactResultLayout ? 88 : 16)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            if let transientMessage {
                VStack {
                    Spacer()
                    Text(transientMessage)
                        .font(.subheadline.weight(.medium))
                        .foregroundColor(AppTheme.textPrimary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.black.opacity(0.6))
                        .overlay(
                            Capsule().stroke(AppTheme.border, lineWidth: 1)
                        )
                        .clipShape(Capsule())
                        .padding(.bottom, showsCompactResultLayout ? 100 : 26)
                }
                .transition(.opacity)
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if showsCompactResultLayout, !showsGuestLimitGate {
                resultStickyActions
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            Task { await viewModel.refreshGuestUsage() }
        }
        .onChange(of: auth.isAuthenticated) { isAuthenticated in
            if isAuthenticated {
                viewModel.clearGuestUsageState()
            } else {
                showFirstOutfitBanner = false
            }
        }
        .onChange(of: viewModel.sourceWardrobeItem?.id) { newId in
            guard newId != nil else { return }
            showTransientMessage("Item loaded — set preferences, then \(MainFlowUxCopy.primaryCta).")
        }
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(
                selectedImage: Binding(
                    get: { viewModel.selectedImage },
                    set: { newValue in
                        handleSelectedImageFromPicker(newValue)
                    }
                ),
                sourceType: pickerSourceType
            )
        }
        .sheet(isPresented: $showAddFromCreationSheet) {
            WardrobeFormView(
                initialCategory: nil,
                initialColor: nil,
                initialDescription: nil,
                initialImage: viewModel.selectedImage,
                onSaved: { showAddFromCreationSheet = false },
                onCancel: { showAddFromCreationSheet = false }
            )
        }
        .sheet(isPresented: $showAdminOptionsSheet) {
            adminOptionsSheet
        }
        .sheet(isPresented: $showRefineSheet) {
            RefineMenuView(
                isAuthenticated: auth.isAuthenticated,
                isLoading: viewModel.isLoading,
                isGuestBlocked: viewModel.isGuestBlocked,
                canRegenerateFromResult: canGenerateAnotherFromResult,
                canRefineWardrobeOnly: viewModel.canRefineWardrobeOnlyFromResult,
                onMoreFormal: { viewModel.startMakeMoreFormal() },
                onMoreCasual: { viewModel.startMakeMoreCasual() },
                onWardrobeOnly: { viewModel.startUseWardrobeOnlyFromResult() },
                onChangeOccasion: { showOccasionPicker = true },
                onDismiss: { showRefineSheet = false }
            )
        }
        .sheet(isPresented: $showAddToWardrobeSheet) {
            WardrobeFormView(
                initialCategory: normalizedCategory(viewModel.currentSuggestion?.upload_matched_category),
                initialColor: nil,
                initialDescription: initialWardrobeDescription(from: viewModel.currentSuggestion),
                initialImage: viewModel.selectedImage,
                onSaved: { showAddToWardrobeSheet = false },
                onCancel: { showAddToWardrobeSheet = false }
            )
        }
        .confirmationDialog(MainFlowUxCopy.randomPicksSection, isPresented: $showRandomPicksDialog) {
            Button("Random from Wardrobe") {
                viewModel.startGetRandomFromWardrobe()
            }
            .disabled(!viewModel.isAuthenticated || viewModel.isLoading)
            Button("Random from History") {
                viewModel.startGetRandomFromHistory()
            }
            .disabled(!viewModel.isAuthenticated || viewModel.isLoading)
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Choose how you want to discover your next look.")
        }
        .confirmationDialog(MainFlowUxCopy.moreActions, isPresented: $showMoreActionsMenu) {
            Button("Add to Wardrobe") {
                if auth.isAuthenticated {
                    showAddToWardrobeSheet = true
                } else {
                    openGuestAuthSheet(context: .firstOutfit, destination: .register)
                }
            }
            Button("Start Over") {
                viewModel.currentSuggestion = nil
                viewModel.clearSelectedImage()
                showFirstOutfitBanner = false
            }
            Button(MainFlowUxCopy.randomPicksSection) {
                showRandomPicksDialog = true
            }
            .disabled(!viewModel.isAuthenticated || viewModel.isLoading)
            if isAdmin {
                Button(MainFlowUxCopy.advancedOptionsSection) {
                    showAdminOptionsSheet = true
                }
            }
            if auth.isAuthenticated, let onRequestHistory {
                Button("View Looks") {
                    onRequestHistory()
                }
            }
            Button("Cancel", role: .cancel) { }
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(viewModel.errorMessage ?? "An error occurred")
        }
        .alert("Duplicate Found", isPresented: $viewModel.showDuplicateModal) {
            Button("Use Cached") { viewModel.useCachedSuggestion() }
            Button("Get New") { viewModel.startForceNewSuggestion() }
            Button("Cancel", role: .cancel) { viewModel.showDuplicateModal = false }
        } message: {
            Text("This image was already analyzed. Would you like to use the cached suggestion or get a new one?")
        }
        .sheet(isPresented: $showGuestAuthSheet) {
            GuestAuthSheetView(context: guestAuthContext, destination: guestAuthDestination)
        }
        .sheet(isPresented: $showOccasionPicker) {
            NavigationStack {
                Form {
                    Picker("Occasion", selection: $viewModel.filters.occasion) {
                        ForEach(Occasion.allCases, id: \.apiValue) { occasion in
                            Text(occasion.rawValue).tag(occasion.apiValue)
                        }
                    }
                    .pickerStyle(.inline)
                }
                .navigationTitle(MainFlowUxCopy.refineChangeOccasion)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { showOccasionPicker = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Apply") {
                            showOccasionPicker = false
                            viewModel.startGenerateAnotherAfterOccasionChange()
                        }
                    }
                }
            }
            .presentationDetents([.medium])
        }
    }

    // MARK: - Layout

    private var regularWidthFlow: some View {
        HStack(alignment: .top, spacing: MainFlowLayoutLogic.sideBySideColumnSpacing) {
            VStack(spacing: 22) {
                if showsCompactResultLayout {
                    MainFlowCompactSummaryView(
                        filters: viewModel.compactSummaryFilters,
                        preferenceText: viewModel.compactSummaryPreferenceText,
                        inputPanelImage: viewModel.inputPanelImage,
                        inputPanelSource: viewModel.inputPanelSource,
                        sourceWardrobeItem: viewModel.inputPanelSource == .history
                            ? nil
                            : viewModel.sourceWardrobeItem
                    )
                    compactResultInputColumn
                } else {
                    creationInputColumn
                }
            }
            .frame(maxWidth: .infinity)

            VStack(spacing: 16) {
                previewOrResultColumn
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.horizontal)
    }

    private var compactWidthFlow: some View {
        VStack(spacing: 22) {
            if showsCompactResultLayout {
                MainFlowCompactSummaryView(
                    filters: viewModel.compactSummaryFilters,
                    preferenceText: viewModel.compactSummaryPreferenceText,
                    inputPanelImage: viewModel.inputPanelImage,
                    inputPanelSource: viewModel.inputPanelSource,
                    sourceWardrobeItem: viewModel.inputPanelSource == .history
                        ? nil
                        : viewModel.sourceWardrobeItem
                )
                .padding(.horizontal)

                compactResultInputColumn

                resultContent()
                    .id(resultScrollAnchor)

                if showFirstOutfitBanner, !auth.isAuthenticated, !viewModel.isGuestBlocked {
                    firstOutfitAuthBanner
                        .padding(.horizontal)
                }
            } else {
                creationInputColumn
                previewOrResultColumn
                    .padding(.horizontal)
            }
        }
    }

    @ViewBuilder
    private var previewOrResultColumn: some View {
        if viewModel.isLoading, viewModel.selectedImage != nil {
            resultLoadingSkeleton
        } else if showsCompactResultLayout, let suggestion = viewModel.currentSuggestion {
            resultContent(for: suggestion)
                .id(resultScrollAnchor)
        } else {
            EmptyOutfitPreviewView()
        }
    }

    private var creationInputColumn: some View {
        VStack(spacing: 22) {
            if let source = viewModel.sourceWardrobeItem, viewModel.inputPanelImage != nil {
                wardrobeSourceBanner(source)
            }

            if showsFirstRunCoach {
                FirstRunCoachView(
                    hasImage: viewModel.inputPanelImage != nil,
                    hasSuggestion: false,
                    isRegularWidth: isRegularWidth,
                    onDismiss: { firstRunCoachDismissed = true }
                )
            }

            ImageUploadView(
                selectedImage: Binding(
                    get: { viewModel.inputPanelImage },
                    set: { newValue in
                        if newValue == nil {
                            viewModel.clearSelectedImage()
                        } else {
                            viewModel.flowPreviewImage = nil
                            viewModel.loadedFromRandomPick = false
                            viewModel.selectedImage = newValue
                            viewModel.clearWardrobeSource()
                        }
                    }
                ),
                showImagePicker: $showImagePicker,
                pickerSourceType: $pickerSourceType
            )

            if showsCollapsedPreferences {
                CollapsedPreferencesRow {
                    firstRunPrefsExpanded = true
                }
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    Text(MainFlowUxCopy.preferencesSection)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)
                        .padding(.horizontal)
                    FiltersView(
                        filters: $viewModel.filters,
                        preferenceText: $viewModel.preferenceText,
                        layout: .grid,
                        useWardrobeOnly: $viewModel.useWardrobeOnly,
                        showWardrobeOnly: auth.isAuthenticated
                    )
                }
            }

            primaryCtaSection

            wardrobeDisclosureSection
            randomPicksDisclosureSection

            if isAdmin {
                advancedOptionsSection
            }

            if auth.isAuthenticated {
                RecentLooksSection(
                    onSelectEntry: { entry in
                        viewModel.loadFromHistory(entry)
                    },
                    onViewAll: {
                        onRequestHistory?()
                    }
                )
            }
        }
        .padding(.horizontal)
    }

    private var primaryCtaSection: some View {
        VStack(spacing: 10) {
            if showsGuestRemainingHint, let remaining = viewModel.guestRemaining {
                Text("\(remaining) of 3 free AI suggestions left")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .accessibilityIdentifier("main.guestRemainingHint")
            }

            Button(action: handleGetSuggestionTap) {
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(MainFlowUxCopy.primaryCta)
                }
            }
            .buttonStyle(GradientButtonStyle(isEnabled: canRequestSuggestion))
            .disabled(!canRequestSuggestion)
            .accessibilityLabel(MainFlowUxCopy.primaryCtaAccessibility)
            .accessibilityIdentifier("main.getSuggestionButton")
            .overlay {
                if viewModel.highlightGenerateButton && canRequestSuggestion {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(AppTheme.gradientStart, lineWidth: 2)
                        .shadow(color: AppTheme.gradientStart.opacity(0.45), radius: 8)
                }
            }
            .onChange(of: viewModel.highlightGenerateButton) { highlighted in
                guard highlighted else { return }
                Task {
                    try? await Task.sleep(nanoseconds: 8_000_000_000)
                    viewModel.highlightGenerateButton = false
                }
            }

            if let helperText = creationHelperText {
                Text(helperText)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
    }

    @ViewBuilder
    private func resultContent(for suggestion: OutfitSuggestion? = nil) -> some View {
        let activeSuggestion = suggestion ?? viewModel.currentSuggestion
        if let activeSuggestion {
            VStack(spacing: 16) {
                OutfitSuggestionView(
                    suggestion: activeSuggestion,
                    occasion: viewModel.filters.occasion,
                    season: viewModel.filters.season,
                    style: viewModel.filters.style,
                    uploadImage: cardUploadImage,
                    onNext: nil,
                    onLike: nil,
                    onDislike: nil,
                    onAddToWardrobe: nil,
                    isLoading: viewModel.isLoading,
                    isAdmin: isAdmin,
                    showAiPromptResponse: AdminVisibility.effectiveShowAiPromptResponse(
                        isAdmin: isAdmin,
                        toggleEnabled: showAiPromptResponse
                    ),
                    showsActionSection: false
                )
                .padding(.horizontal, isRegularWidth ? 0 : nil)
                .transition(.opacity)

                if showFirstOutfitBanner, !auth.isAuthenticated, !viewModel.isGuestBlocked, isRegularWidth {
                    firstOutfitAuthBanner
                }

                if showsGuestRemainingHint, let remaining = viewModel.guestRemaining, isRegularWidth {
                    Text("\(remaining) of 3 free AI suggestions left")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
            }
        }
    }

    private var resultStickyActions: some View {
        VStack(spacing: 0) {
            Divider()
                .background(AppTheme.border)
            HStack(spacing: 10) {
                Button {
                    viewModel.startGenerateAnotherLook()
                } label: {
                    Label(MainFlowUxCopy.generateAnother, systemImage: "arrow.triangle.2.circlepath")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.accent)
                .disabled(viewModel.isLoading || !canGenerateAnotherFromResult || viewModel.isGuestBlocked)
                .accessibilityIdentifier("main.generateAnotherButton")

                Button(action: handleSaveLookTap) {
                    Label(MainFlowUxCopy.saveLook, systemImage: "heart")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(viewModel.isLoading)
                .accessibilityIdentifier("main.saveLookButton")

                Button {
                    showRefineSheet = true
                } label: {
                    Label(MainFlowUxCopy.refine, systemImage: "slider.horizontal.3")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(viewModel.isLoading)
                .accessibilityIdentifier("main.refineButton")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.ultraThinMaterial)
        }
    }

    private var compactResultInputColumn: some View {
        VStack(spacing: 22) {
            if MainFlowResultRegenerateLogic.shouldShowCompactUploadActions(hasSuggestion: hasSuggestion) {
                compactUploadSection
            }

            if canGenerateAnotherFromResult {
                Button {
                    viewModel.startGenerateAnotherLook()
                } label: {
                    Label(MainFlowUxCopy.generateAnother, systemImage: "arrow.triangle.2.circlepath")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(GradientButtonStyle(isEnabled: !viewModel.isLoading && !viewModel.isGuestBlocked))
                .disabled(viewModel.isLoading || viewModel.isGuestBlocked)
                .accessibilityIdentifier("main.compactGenerateAnotherButton")
            }

            VStack(alignment: .leading, spacing: 8) {
                Text(MainFlowUxCopy.preferencesSection)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                    .padding(.horizontal)
                FiltersView(
                    filters: $viewModel.filters,
                    preferenceText: $viewModel.preferenceText,
                    layout: .grid,
                    useWardrobeOnly: $viewModel.useWardrobeOnly,
                    showWardrobeOnly: auth.isAuthenticated
                )
            }

            wardrobeDisclosureSection
            randomPicksDisclosureSection

            moreActionsButton
        }
        .padding(.horizontal)
    }

    private var compactUploadSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(MainFlowUxCopy.uploadNewItem)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
            Text(MainFlowUxCopy.compactUploadHint)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)

            ImageUploadView(
                selectedImage: Binding(
                    get: { nil },
                    set: { newValue in
                        guard let newValue else { return }
                        viewModel.startFreshUpload(image: newValue)
                    }
                ),
                showImagePicker: $showImagePicker,
                pickerSourceType: $pickerSourceType
            )
            .padding(.horizontal, 0)
        }
        .accessibilityIdentifier("main.compactUploadSection")
    }

    private var moreActionsButton: some View {
        Button {
            showMoreActionsMenu = true
        } label: {
            Label(MainFlowUxCopy.moreActions, systemImage: "ellipsis.circle")
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
        .disabled(viewModel.isLoading)
        .accessibilityIdentifier("main.moreButton")
    }

    private var wardrobeDisclosureSection: some View {
        DisclosureGroup(MainFlowUxCopy.wardrobeSection) {
            VStack(spacing: 14) {
                Button {
                    if viewModel.selectedImage == nil {
                        showTransientMessage("Upload a photo first.")
                    } else {
                        showAddFromCreationSheet = true
                    }
                } label: {
                    Label("Add to Wardrobe", systemImage: "plus.circle")
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .disabled(viewModel.isLoading)
            }
            .padding(.top, 8)
        }
        .font(.subheadline.weight(.semibold))
        .foregroundColor(AppTheme.textPrimary)
        .padding()
        .glassCard()
    }

    private var randomPicksDisclosureSection: some View {
        DisclosureGroup(MainFlowUxCopy.randomPicksSection) {
            VStack(spacing: 14) {
                Button {
                    showRandomPicksDialog = true
                } label: {
                    Label("Random from Wardrobe", systemImage: "shuffle")
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .disabled(viewModel.isLoading || !auth.isAuthenticated)

                Button {
                    viewModel.startGetRandomFromHistory()
                } label: {
                    Label("Random from History", systemImage: "clock.arrow.circlepath")
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .disabled(viewModel.isLoading || !auth.isAuthenticated)
            }
            .padding(.top, 8)
        }
        .font(.subheadline.weight(.semibold))
        .foregroundColor(AppTheme.textPrimary)
        .padding()
        .glassCard()
    }

    private var advancedOptionsSection: some View {
        DisclosureGroup(MainFlowUxCopy.advancedOptionsSection) {
            VStack(spacing: 14) {
                Toggle(isOn: $viewModel.generateModelImage) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Include AI model preview")
                            .font(.subheadline.weight(.medium))
                            .foregroundColor(AppTheme.textPrimary)
                        Text(MicroHelpCopy.modelPreview)
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                }
                .tint(AppTheme.accent)
                .accessibilityIdentifier("main.includeModelPreviewToggle")

                if viewModel.generateModelImage {
                    Picker("Image model", selection: $viewModel.imageModel) {
                        Text("DALL-E 3").tag("dalle3")
                        Text("Stable Diffusion").tag("stable-diffusion")
                        Text("Nano Banana").tag("nano-banana")
                    }
                    .pickerStyle(.menu)
                }

                Toggle("Show AI prompt & response", isOn: $showAiPromptResponse)
                    .tint(AppTheme.accent)
            }
            .padding(.top, 8)
        }
        .font(.subheadline.weight(.semibold))
        .foregroundColor(AppTheme.textPrimary)
        .padding()
        .glassCard()
    }

    private var resultLoadingSkeleton: some View {
        VStack(spacing: 16) {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.white.opacity(0.08))
                .frame(minHeight: isRegularWidth ? 360 : 280)
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white.opacity(0.06))
                .frame(height: 16)
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white.opacity(0.06))
                .frame(height: 16)
                .frame(maxWidth: 200)
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.06))
                    .frame(height: 100)
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.06))
                    .frame(height: 100)
            }
        }
        .padding()
        .glassCard()
        .accessibilityIdentifier("main.resultLoadingSkeleton")
    }

    private var adminOptionsSheet: some View {
        NavigationView {
            ScrollView {
                advancedOptionsSection
                    .padding()
            }
            .background(
                LinearGradient(
                    colors: [AppTheme.bgPrimary, AppTheme.bgSecondary],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
            )
            .navigationTitle(MainFlowUxCopy.advancedOptionsSection)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { showAdminOptionsSheet = false }
                }
            }
        }
    }

    @ViewBuilder
    private func wardrobeSourceBanner(_ source: OutfitViewModel.WardrobeSourceContext) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 10) {
                Text("👔")
                    .font(.title3)
                VStack(alignment: .leading, spacing: 4) {
                    Text(MainFlowUxCopy.tagFromWardrobe)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)
                    Text("\(source.category.capitalized)\(source.color.map { " · \($0)" } ?? "")")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                    Text("Set preferences below, then tap \(MainFlowUxCopy.primaryCta).")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
                Spacer()
            }
        }
        .padding(14)
        .background(AppTheme.accentSoft)
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(AppTheme.gradientStart.opacity(0.35), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityIdentifier("main.wardrobeSourceBanner")
    }

    private var creationHelperText: String? {
        if canRequestSuggestion {
            return FirstRunCoachCopy.readyToGenerateHint
        }
        if !auth.isAuthenticated, viewModel.isGuestBlocked {
            return "Create an account to keep using AI outfit suggestions."
        }
        if viewModel.selectedImage == nil {
            return "Add a photo to enable outfit suggestions."
        }
        return nil
    }

    private var guestLimitGateSection: some View {
        VStack(spacing: 0) {
            Spacer(minLength: isRegularWidth ? 80 : 48)
            guestLimitReachedCard
                .padding(.horizontal)
            Spacer(minLength: isRegularWidth ? 80 : 48)
        }
        .frame(maxWidth: .infinity)
    }

    private var guestLimitReachedCard: some View {
        let copy = AuthPromptCopy.content(for: .guestLimit)

        return VStack(alignment: .leading, spacing: 12) {
            Text(copy.headline)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 10) {
                Button {
                    openGuestAuthSheet(context: .guestLimit, destination: .register)
                } label: {
                    Text("Create account")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(GradientButtonStyle())
                .accessibilityIdentifier("main.guestLimitCreateAccountButton")

                Button {
                    openGuestAuthSheet(context: .guestLimit, destination: .login)
                } label: {
                    Text("Sign in")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.bordered)
                .accessibilityIdentifier("main.guestLimitSignInButton")
            }
        }
        .padding(14)
        .glassCard()
        .accessibilityIdentifier("main.guestLimitReachedCard")
    }

    private var firstOutfitAuthBanner: some View {
        let copy = AuthPromptCopy.content(for: .firstOutfit)

        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(copy.headline)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)
                    if let subheadline = copy.subheadline {
                        Text(subheadline)
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                }
                Spacer()
                Button {
                    withAnimation {
                        showFirstOutfitBanner = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                        .padding(6)
                }
                .accessibilityLabel("Dismiss")
            }

            HStack(spacing: 10) {
                Button {
                    openGuestAuthSheet(context: .firstOutfit, destination: .register)
                } label: {
                    Text("Create account")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(GradientButtonStyle())

                Button {
                    openGuestAuthSheet(context: .firstOutfit, destination: .login)
                } label: {
                    Text("Sign in")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.bordered)
            }
        }
        .padding(14)
        .glassCard()
        .accessibilityIdentifier("main.firstOutfitAuthBanner")
    }

    private func handleSelectedImageFromPicker(_ newValue: UIImage?) {
        if let image = newValue {
            if hasSuggestion {
                viewModel.startFreshUpload(image: image)
            } else {
                viewModel.flowPreviewImage = nil
                viewModel.loadedFromRandomPick = false
                viewModel.selectedImage = image
            }
        } else {
            viewModel.clearSelectedImage()
        }
    }

    private func handleGetSuggestionTap() {
        if !auth.isAuthenticated, viewModel.isGuestBlocked {
            return
        }
        viewModel.startGetSuggestion()
    }

    private func handleSaveLookTap() {
        if auth.isAuthenticated {
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            showTransientMessage(MainFlowUxCopy.saveLookToast)
        } else {
            openGuestAuthSheet(context: .like, destination: .login)
        }
    }

    private func openGuestAuthSheet(context: AuthPromptContext, destination: GuestAuthSheetDestination) {
        guestAuthContext = context
        guestAuthDestination = destination
        showGuestAuthSheet = true
    }

    private func showTransientMessage(_ message: String) {
        withAnimation {
            transientMessage = message
        }
        Task {
            try? await Task.sleep(nanoseconds: 1_600_000_000)
            await MainActor.run {
                withAnimation {
                    transientMessage = nil
                }
            }
        }
    }

    private func normalizedCategory(_ raw: String?) -> String? {
        guard let raw else { return nil }
        switch raw.lowercased() {
        case "shirt", "shirts": return "shirt"
        case "trouser", "trousers", "pant", "pants": return "trouser"
        case "blazer", "blazers", "jacket", "jackets": return "blazer"
        case "shoe", "shoes": return "shoes"
        case "belt", "belts": return "belt"
        default: return nil
        }
    }

    private func initialWardrobeDescription(from suggestion: OutfitSuggestion?) -> String? {
        guard let suggestion else { return nil }
        let matchedCategory = normalizedCategory(suggestion.upload_matched_category)
        switch matchedCategory {
        case "shirt": return suggestion.shirt
        case "trouser": return suggestion.trouser
        case "blazer": return suggestion.blazer
        case "shoes": return suggestion.shoes
        case "belt": return suggestion.belt
        default: return nil
        }
    }
}

