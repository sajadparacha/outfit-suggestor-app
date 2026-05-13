//
//  MainFlowView.swift
//  OutfitSuggestor
//
//  Main suggestion flow: upload, filters, wardrobe-only toggle, random picks, get suggestion, result
//

import SwiftUI

struct MainFlowView: View {
    @ObservedObject var viewModel: OutfitViewModel
    @ObservedObject private var auth = AuthService.shared
    @State private var showImagePicker = false
    @State private var showModelGenerationConfirm = false
    @State private var showAddToWardrobeSheet = false
    @State private var transientMessage: String?
    
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
                    ImageUploadView(selectedImage: $viewModel.selectedImage, showImagePicker: $showImagePicker)
                        .padding(.horizontal)
                    FiltersView(filters: $viewModel.filters, preferenceText: $viewModel.preferenceText)
                        .padding(.horizontal)
                    
                    if viewModel.isAuthenticated {
                        Section(header: Text("Random picks").font(.headline).foregroundColor(AppTheme.textPrimary)) {
                            HStack(spacing: 12) {
                                Button("Random from Wardrobe") {
                                    Task { await viewModel.getRandomFromWardrobe() }
                                }
                                .buttonStyle(.borderedProminent)
                                .disabled(viewModel.isLoading)
                                Button("Random from History") {
                                    Task { await viewModel.getRandomFromHistory() }
                                }
                                .buttonStyle(.bordered)
                                .disabled(viewModel.isLoading)
                            }
                            .padding(.horizontal)
                            Toggle("Use wardrobe only", isOn: $viewModel.useWardrobeOnly)
                                .padding(.horizontal)
                                .tint(AppTheme.accent)
                        }
                        .padding(.vertical, 8)
                        .glassCard()
                        .padding(.horizontal)
                    }
                    
                    Section(header: Text("Model image").font(.headline).foregroundColor(AppTheme.textPrimary)) {
                        Toggle("Generate model image", isOn: $viewModel.generateModelImage)
                            .padding(.horizontal)
                            .tint(AppTheme.accent)
                        if viewModel.generateModelImage {
                            Picker("Image model", selection: $viewModel.imageModel) {
                                Text("DALL-E 3").tag("dalle3")
                                Text("Stable Diffusion").tag("stable-diffusion")
                                Text("Nano Banana").tag("nano-banana")
                            }
                            .pickerStyle(.menu)
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical, 8)
                    .glassCard()
                    .padding(.horizontal)
                    
                    Button(action: handleGetSuggestionTap) {
                        if viewModel.isLoading {
                            ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Get Outfit Suggestion").fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(viewModel.selectedImage == nil ? Color.gray.opacity(0.6) : (viewModel.isLoading ? Color.gray.opacity(0.6) : AppTheme.accent))
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .padding(.horizontal)
                    .disabled(viewModel.selectedImage == nil || viewModel.isLoading)
                    
                    if let suggestion = viewModel.currentSuggestion {
                        OutfitSuggestionView(
                            suggestion: suggestion,
                            onNext: { Task { await viewModel.getNextSuggestion() } },
                            onLike: { showTransientMessage("Thanks for the feedback!") },
                            onDislike: {
                                showTransientMessage("Trying a fresh variation...")
                                Task { await viewModel.getNextSuggestion() }
                            },
                            onAddToWardrobe: auth.isAuthenticated ? { showAddToWardrobeSheet = true } : nil,
                            isLoading: viewModel.isLoading,
                            isAdmin: auth.currentUser?.is_admin == true
                        )
                            .padding(.horizontal)
                            .transition(.opacity)
                    }
                    Spacer(minLength: 50)
                }
                .padding(.vertical)
                .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            if viewModel.isLoading {
                ZStack {
                    Color.black.opacity(0.45).ignoresSafeArea()
                    VStack(spacing: 12) {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(AppTheme.accent)
                            .scaleEffect(1.15)
                        Text(viewModel.generateModelImage ? "Generating AI suggestion and model image..." : "Generating AI suggestion...")
                            .font(.headline)
                            .foregroundColor(AppTheme.textPrimary)
                    }
                    .padding(20)
                    .glassCard()
                    .padding(.horizontal, 30)
                }
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
