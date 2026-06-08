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
    @State private var showAiPromptResponse = true
    @State private var transientMessage: String?
    @AppStorage("guest_first_outfit_prompt_shown") private var guestFirstOutfitPromptShown = false
    @State private var showFirstOutfitBanner = false
    @State private var showGuestAuthSheet = false
    @State private var guestAuthContext: AuthPromptContext = .like
    @State private var guestAuthDestination: GuestAuthSheetDestination = .login

    private var isAdmin: Bool {
        auth.currentUser?.is_admin == true
    }

    private enum MainScreenState {
        case creation
        case result
    }

    private var screenState: MainScreenState {
        viewModel.currentSuggestion == nil ? .creation : .result
    }

    private var canRequestSuggestion: Bool {
        viewModel.selectedImage != nil && !viewModel.isLoading && !viewModel.isGuestBlocked
    }

    private var showsGuestRemainingHint: Bool {
        !auth.isAuthenticated && !viewModel.isGuestBlocked && viewModel.guestRemaining != nil
    }

    private var isRegularWidth: Bool {
        horizontalSizeClass == .regular
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [AppTheme.bgPrimary, AppTheme.bgSecondary],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: true) {
                VStack(spacing: 22) {
                    HomeHeaderView {
                        onNavigateToProfile?()
                    }

                    if screenState == .creation {
                        creationSection
                    } else {
                        resultSection
                    }

                    Spacer(minLength: 50)
                }
                .padding(.vertical, 8)
                .adaptiveContent(maxWidth: 980)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            if viewModel.showsAiProgressPanel, let operationType = viewModel.aiOperationType {
                VStack {
                    Spacer()
                    AiProgressPanelView(
                        operationType: operationType,
                        message: viewModel.loadingMessage,
                        onCancel: { viewModel.cancelOperation() }
                    )
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
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
                        .padding(.bottom, 26)
                }
                .transition(.opacity)
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
                Task { await viewModel.refreshGuestUsage() }
            }
        }
        .onChange(of: viewModel.sourceWardrobeItem?.id) { newId in
            guard newId != nil else { return }
            showTransientMessage("Item loaded — set preferences, then Generate Outfit.")
        }
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(selectedImage: $viewModel.selectedImage, sourceType: pickerSourceType)
        }
        .sheet(isPresented: $showAddFromCreationSheet) {
            WardrobeFormView(
                initialCategory: nil,
                initialColor: nil,
                initialDescription: nil,
                initialImage: viewModel.selectedImage,
                onSaved: {
                    showAddFromCreationSheet = false
                },
                onCancel: {
                    showAddFromCreationSheet = false
                }
            )
        }
        .sheet(isPresented: $showAdminOptionsSheet) {
            adminOptionsSheet
        }
        .sheet(isPresented: $showAddToWardrobeSheet) {
            WardrobeFormView(
                initialCategory: normalizedCategory(viewModel.currentSuggestion?.upload_matched_category),
                initialColor: nil,
                initialDescription: initialWardrobeDescription(from: viewModel.currentSuggestion),
                initialImage: viewModel.selectedImage,
                onSaved: {
                    showAddToWardrobeSheet = false
                },
                onCancel: {
                    showAddToWardrobeSheet = false
                }
            )
        }
        .confirmationDialog("Random Picks", isPresented: $showRandomPicksDialog) {
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
        .confirmationDialog("More Actions", isPresented: $showMoreActionsMenu) {
            Button("Random Pick") {
                showRandomPicksDialog = true
            }
            .disabled(!viewModel.isAuthenticated || viewModel.isLoading)
            if isAdmin {
                Button("Advanced Options") {
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
        .onChange(of: viewModel.currentSuggestion != nil) { hasSuggestion in
            guard hasSuggestion,
                  !auth.isAuthenticated,
                  !guestFirstOutfitPromptShown else { return }
            guestFirstOutfitPromptShown = true
            withAnimation {
                showFirstOutfitBanner = true
            }
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
                .navigationTitle("Change Occasion")
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

    private var creationSection: some View {
        VStack(spacing: 22) {
            HeroView()

            if let source = viewModel.sourceWardrobeItem, viewModel.selectedImage != nil {
                wardrobeSourceBanner(source)
                    .padding(.horizontal)
            }

            ImageUploadView(
                selectedImage: Binding(
                    get: { viewModel.selectedImage },
                    set: { newValue in
                        if newValue == nil {
                            viewModel.clearSelectedImage()
                        } else {
                            viewModel.selectedImage = newValue
                            viewModel.clearWardrobeSource()
                        }
                    }
                ),
                showImagePicker: $showImagePicker,
                pickerSourceType: $pickerSourceType
            )

            FiltersView(
                filters: $viewModel.filters,
                preferenceText: $viewModel.preferenceText,
                layout: .grid
            )

            if !auth.isAuthenticated, viewModel.isGuestBlocked {
                guestLimitReachedCard
                    .padding(.horizontal)
            }

            VStack(spacing: 10) {
                if showsGuestRemainingHint, let remaining = viewModel.guestRemaining {
                    Text("\(remaining) of 3 free AI suggestions left")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .accessibilityIdentifier("main.guestRemainingHint")
                }

                if isAdmin {
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
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.06))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(AppTheme.border, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .accessibilityIdentifier("main.includeModelPreviewToggle")
                }

                Button(action: handleGetSuggestionTap) {
                    if viewModel.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Generate Outfit")
                    }
                }
                .buttonStyle(GradientButtonStyle(isEnabled: canRequestSuggestion))
                .disabled(!canRequestSuggestion)
                .overlay {
                    if viewModel.highlightGenerateButton && canRequestSuggestion {
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(AppTheme.gradientStart, lineWidth: 2)
                            .shadow(color: AppTheme.gradientStart.opacity(0.45), radius: 8)
                    }
                }
                .accessibilityIdentifier("main.getSuggestionButton")
                .onChange(of: viewModel.highlightGenerateButton) { highlighted in
                    guard highlighted else { return }
                    Task {
                        try? await Task.sleep(nanoseconds: 8_000_000_000)
                        viewModel.highlightGenerateButton = false
                    }
                }

                if !canRequestSuggestion {
                    Text(guestBlockedHelperText)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
            }
            .padding(.horizontal)

            if auth.isAuthenticated {
                moreOptionsSection
                    .padding(.horizontal)
            }

            if isAdmin {
                advancedOptionsSection
                    .padding(.horizontal)
            }

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

    private var resultSecondaryActions: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                Button {
                    viewModel.startMakeMoreFormal()
                } label: {
                    Text("Make it more formal")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(viewModel.isLoading || viewModel.selectedImage == nil || viewModel.isGuestBlocked)
                .accessibilityIdentifier("main.makeMoreFormalButton")

                Button {
                    viewModel.startMakeMoreCasual()
                } label: {
                    Text("Make it more casual")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(viewModel.isLoading || viewModel.selectedImage == nil || viewModel.isGuestBlocked)
                .accessibilityIdentifier("main.makeMoreCasualButton")
            }

            HStack(spacing: 8) {
                if auth.isAuthenticated {
                    Button {
                        viewModel.startUseWardrobeOnlyFromResult()
                    } label: {
                        Text("Use wardrobe items only")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isLoading || viewModel.selectedImage == nil)
                    .accessibilityIdentifier("main.useWardrobeOnlyButton")
                }

                Button {
                    showOccasionPicker = true
                } label: {
                    Text("Change occasion")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(viewModel.isLoading)
                .accessibilityIdentifier("main.changeOccasionButton")
            }
        }
    }

    private var resultSection: some View {
        VStack(spacing: 16) {
            if let suggestion = viewModel.currentSuggestion {
                OutfitSuggestionView(
                    suggestion: suggestion,
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
                .padding(.horizontal)
                .transition(.opacity)
                .accessibilityIdentifier("main.resultCard")

                if showFirstOutfitBanner, !auth.isAuthenticated, !viewModel.isGuestBlocked {
                    firstOutfitAuthBanner
                        .padding(.horizontal)
                        .transition(.opacity)
                }

                if !auth.isAuthenticated, viewModel.isGuestBlocked {
                    guestLimitReachedCard
                        .padding(.horizontal)
                }

                VStack(spacing: 10) {
                    if showsGuestRemainingHint, let remaining = viewModel.guestRemaining {
                        Text("\(remaining) of 3 free AI suggestions left")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                    }

                    Button {
                        viewModel.startGenerateAnotherLook()
                    } label: {
                        Label("Generate Another Look", systemImage: "arrow.triangle.2.circlepath")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.accent)
                    .disabled(viewModel.isLoading || viewModel.selectedImage == nil || viewModel.isGuestBlocked)
                    .accessibilityIdentifier("main.generateAnotherButton")

                    resultSecondaryActions

                    HStack(spacing: 10) {
                        Button(action: handleLikeTap) {
                            Label("Like", systemImage: "hand.thumbsup")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .disabled(viewModel.isLoading)
                        .accessibilityIdentifier("main.likeButton")

                        Button {
                            if auth.isAuthenticated {
                                showAddToWardrobeSheet = true
                            } else {
                                openGuestAuthSheet(context: .firstOutfit, destination: .register)
                            }
                        } label: {
                            Label("Save", systemImage: "plus.circle")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .disabled(viewModel.isLoading)
                        .accessibilityIdentifier("main.saveButton")
                    }

                    HStack(spacing: 10) {
                        Button {
                            viewModel.currentSuggestion = nil
                            viewModel.selectedImage = nil
                            showFirstOutfitBanner = false
                        } label: {
                            Label("Start Over", systemImage: "arrow.counterclockwise")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                    }

                    Button {
                        showMoreActionsMenu = true
                    } label: {
                        Label("More", systemImage: "ellipsis.circle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isLoading)
                    .accessibilityIdentifier("main.moreButton")
                }
                .frame(maxWidth: isRegularWidth ? 760 : .infinity)
                .padding(.horizontal)
            }
        }
    }

    private var moreOptionsSection: some View {
        DisclosureGroup("Wardrobe & picks") {
            VStack(spacing: 14) {
                Toggle(isOn: $viewModel.useWardrobeOnly) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Use my wardrobe only")
                            .font(.subheadline.weight(.medium))
                            .foregroundColor(AppTheme.textPrimary)
                        Text(MicroHelpCopy.wardrobeOnly)
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                }
                .tint(AppTheme.accent)

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

                Button {
                    showRandomPicksDialog = true
                } label: {
                    Label("Random from Wardrobe", systemImage: "shuffle")
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .disabled(viewModel.isLoading)

                Button {
                    viewModel.startGetRandomFromHistory()
                } label: {
                    Label("Random from History", systemImage: "clock.arrow.circlepath")
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

    private var advancedOptionsSection: some View {
        DisclosureGroup("Advanced options") {
            VStack(spacing: 14) {
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
            .navigationTitle("Advanced options")
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
                    Text("From your wardrobe")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)
                    Text("\(source.category.capitalized)\(source.color.map { " · \($0)" } ?? "")")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                    Text("Set preferences below, then tap Generate Outfit.")
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

    private var guestBlockedHelperText: String {
        if !auth.isAuthenticated, viewModel.isGuestBlocked {
            return "Create an account to keep using AI outfit suggestions."
        }
        return "Add a photo to enable outfit suggestions."
    }

    private var guestLimitReachedCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("You've used your 3 free AI outfit suggestions. Create an account to keep using the app.")
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

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

    private func handleGetSuggestionTap() {
        if !auth.isAuthenticated, viewModel.isGuestBlocked {
            return
        }
        viewModel.startGetSuggestion()
    }

    private func handleLikeTap() {
        if auth.isAuthenticated {
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            showTransientMessage("Outfit liked!")
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
        case "shirt", "shirts":
            return "shirt"
        case "trouser", "trousers", "pant", "pants":
            return "trouser"
        case "blazer", "blazers", "jacket", "jackets":
            return "blazer"
        case "shoe", "shoes":
            return "shoes"
        case "belt", "belts":
            return "belt"
        default:
            return nil
        }
    }

    private func initialWardrobeDescription(from suggestion: OutfitSuggestion?) -> String? {
        guard let suggestion else { return nil }
        let matchedCategory = normalizedCategory(suggestion.upload_matched_category)
        switch matchedCategory {
        case "shirt":
            return suggestion.shirt
        case "trouser":
            return suggestion.trouser
        case "blazer":
            return suggestion.blazer
        case "shoes":
            return suggestion.shoes
        case "belt":
            return suggestion.belt
        default:
            return nil
        }
    }
}
