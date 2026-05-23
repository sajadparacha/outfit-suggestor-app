//
//  MainFlowView.swift
//  OutfitSuggestor
//
//  Main suggestion flow: upload, filters, wardrobe-only toggle, random picks, get suggestion, result
//

import SwiftUI

struct MainFlowView: View {
    @ObservedObject var viewModel: OutfitViewModel
    var onRequestHistory: (() -> Void)? = nil
    @ObservedObject private var auth = AuthService.shared
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var showImagePicker = false
    @State private var showModelGenerationConfirm = false
    @State private var showAddToWardrobeSheet = false
    @State private var showCustomizeSheet = false
    @State private var showRandomPicksDialog = false
    @State private var showMoreActionsMenu = false
    @State private var transientMessage: String?

    private enum MainScreenState {
        case creation
        case result
    }

    private var screenState: MainScreenState {
        viewModel.currentSuggestion == nil ? .creation : .result
    }

    private var shouldShowFullscreenLoading: Bool {
        guard viewModel.isLoading else { return false }
        guard let context = viewModel.loadingContext else { return true }
        return context == .suggestion || context == .wardrobeItem
    }

    private var canRequestSuggestion: Bool {
        viewModel.selectedImage != nil && !viewModel.isLoading
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
                VStack(spacing: 20) {
                    HeroView()

                    if screenState == .creation {
                        creationSection
                    } else {
                        resultSection
                    }

                    Spacer(minLength: 50)
                }
                .padding(.vertical)
                .adaptiveContent(maxWidth: 980)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            if shouldShowFullscreenLoading {
                ZStack {
                    Color.black.opacity(0.45).ignoresSafeArea()
                    VStack(spacing: 12) {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(AppTheme.accent)
                            .scaleEffect(1.15)
                        Text(viewModel.loadingMessage ?? "Creating your outfit idea...")
                            .font(.headline)
                            .foregroundColor(AppTheme.textPrimary)
                    }
                    .padding(20)
                    .glassCard()
                    .padding(.horizontal, 30)
                }
                .accessibilityIdentifier("main.fullscreenLoadingOverlay")
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
        .navigationTitle("AI Outfit Suggestor")
        .navigationBarTitleDisplayMode(.large)
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(selectedImage: $viewModel.selectedImage)
        }
        .sheet(isPresented: $showCustomizeSheet) {
            customizeSheet
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
                Task { await viewModel.getRandomFromWardrobe() }
            }
            .disabled(!viewModel.isAuthenticated || viewModel.isLoading)
            Button("Random from History") {
                Task { await viewModel.getRandomFromHistory() }
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
            Button("Customize Preferences") {
                showCustomizeSheet = true
            }
            Button("View History") {
                onRequestHistory?()
            }
            .disabled(!viewModel.isAuthenticated || onRequestHistory == nil)
            Button("Cancel", role: .cancel) { }
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(viewModel.errorMessage ?? "An error occurred")
        }
        .alert("Duplicate Found", isPresented: $viewModel.showDuplicateModal) {
            Button("Use Cached") { viewModel.useCachedSuggestion() }
            Button("Get New") { Task { await viewModel.forceNewSuggestion() } }
            Button("Cancel", role: .cancel) { viewModel.showDuplicateModal = false }
        } message: {
            Text("This image was already analyzed. Would you like to use the cached suggestion or get a new one?")
        }
        .alert("Generate Model Image?", isPresented: $showModelGenerationConfirm) {
            Button("Continue") { Task { await viewModel.getSuggestion() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Model-image generation takes longer and may increase API usage cost. Continue?")
        }
    }

    private var creationSection: some View {
        VStack(spacing: 16) {
            ImageUploadView(selectedImage: $viewModel.selectedImage, showImagePicker: $showImagePicker)
                .padding(.horizontal)

            VStack(alignment: .leading, spacing: 10) {
                Text("Ready when you are")
                    .font(.headline)
                    .foregroundColor(AppTheme.textPrimary)
                Text("Upload a photo, then get an outfit suggestion in one tap.")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)

                HStack(spacing: 12) {
                    Button {
                        showCustomizeSheet = true
                    } label: {
                        Label("Customize", systemImage: "slider.horizontal.3")
                    }
                    .buttonStyle(.bordered)
                    .tint(AppTheme.accent)

                    if auth.isAuthenticated {
                        Button {
                            showRandomPicksDialog = true
                        } label: {
                            Label("Random Pick", systemImage: "shuffle")
                        }
                        .buttonStyle(.bordered)
                        .tint(AppTheme.accent)
                        .disabled(viewModel.isLoading)
                    }
                }
                .frame(maxWidth: isRegularWidth ? 680 : .infinity, alignment: .leading)

                primarySuggestionButton

                if !canRequestSuggestion {
                    Text("Add a photo to enable outfit suggestions.")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }

                if auth.isAuthenticated, let onRequestHistory {
                    Button {
                        onRequestHistory()
                    } label: {
                        Label("View History", systemImage: "clock.arrow.circlepath")
                            .font(.subheadline.weight(.semibold))
                    }
                    .buttonStyle(.plain)
                    .foregroundColor(AppTheme.accent)
                    .disabled(viewModel.isLoading)
                    .accessibilityIdentifier("main.viewHistoryButton")
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
            .glassCard()
            .padding(.horizontal)
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
                    isAdmin: auth.currentUser?.is_admin == true,
                    showsActionSection: false
                )
                .padding(.horizontal)
                .transition(.opacity)
                .accessibilityIdentifier("main.resultCard")

                VStack(spacing: 10) {
                    HStack(spacing: 10) {
                        Button {
                            Task { await viewModel.getNextSuggestion() }
                        } label: {
                            Label("Try Another", systemImage: "arrow.triangle.2.circlepath")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(AppTheme.accent)
                        .disabled(viewModel.isLoading)
                        .accessibilityIdentifier("main.tryAnotherButton")

                        Button {
                            if auth.isAuthenticated {
                                showAddToWardrobeSheet = true
                            } else {
                                showTransientMessage("Log in to save suggestions.")
                            }
                        } label: {
                            Label("Save", systemImage: "plus.circle")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .disabled(viewModel.isLoading)
                        .accessibilityIdentifier("main.saveButton")
                    }
                    .frame(maxWidth: isRegularWidth ? 760 : .infinity)

                    Button {
                        showMoreActionsMenu = true
                    } label: {
                        Label("More", systemImage: "ellipsis.circle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isLoading)
                    .accessibilityIdentifier("main.moreButton")

                    if viewModel.isLoading, !shouldShowFullscreenLoading {
                        HStack(spacing: 8) {
                            ProgressView()
                                .tint(AppTheme.accent)
                            Text(viewModel.loadingMessage ?? "Working on your request...")
                                .font(.subheadline)
                                .foregroundColor(AppTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(10)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    private var primarySuggestionButton: some View {
        Button(action: handleGetSuggestionTap) {
            if viewModel.isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
            } else {
                Text("Get Outfit Suggestion")
                    .fontWeight(.semibold)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(canRequestSuggestion ? AppTheme.accent : Color.gray.opacity(0.6))
        .foregroundColor(.white)
        .cornerRadius(12)
        .disabled(!canRequestSuggestion)
        .accessibilityIdentifier("main.getSuggestionButton")
    }

    private var customizeSheet: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    FiltersView(filters: $viewModel.filters, preferenceText: $viewModel.preferenceText)

                    DisclosureGroup("Advanced Options") {
                        VStack(spacing: 14) {
                            if auth.isAuthenticated {
                                Toggle("Use wardrobe only", isOn: $viewModel.useWardrobeOnly)
                                    .tint(AppTheme.accent)
                            }

                            Toggle("Generate model preview", isOn: $viewModel.generateModelImage)
                                .tint(AppTheme.accent)
                            if viewModel.generateModelImage {
                                Picker("Image model", selection: $viewModel.imageModel) {
                                    Text("DALL-E 3").tag("dalle3")
                                    Text("Stable Diffusion").tag("stable-diffusion")
                                    Text("Nano Banana").tag("nano-banana")
                                }
                                .pickerStyle(.menu)
                            }
                        }
                        .padding(.top, 8)
                    }
                    .padding()
                    .glassCard()
                }
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
            .navigationTitle("Customize")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { showCustomizeSheet = false }
                }
            }
        }
    }

    private func handleGetSuggestionTap() {
        guard viewModel.generateModelImage else {
            Task { await viewModel.getSuggestion() }
            return
        }
        showModelGenerationConfirm = true
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
