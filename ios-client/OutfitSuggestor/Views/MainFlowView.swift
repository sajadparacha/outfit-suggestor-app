//
//  MainFlowView.swift
//  OutfitSuggestor
//
//  Main suggestion flow: upload, filters, wardrobe-only toggle, random picks, get suggestion, result
//

import SwiftUI

struct MainFlowView: View {
    @ObservedObject var viewModel: OutfitViewModel
    @State private var showImagePicker = false
    
    var body: some View {
        ZStack {
            Color(UIColor.systemGroupedBackground).ignoresSafeArea()
            ScrollView(.vertical, showsIndicators: true) {
                VStack(spacing: 20) {
                    HeroView()
                    ImageUploadView(selectedImage: $viewModel.selectedImage, showImagePicker: $showImagePicker)
                        .padding(.horizontal)
                    FiltersView(filters: $viewModel.filters, preferenceText: $viewModel.preferenceText)
                        .padding(.horizontal)
                    
                    if viewModel.isAuthenticated {
                        Section(header: Text("Random picks").font(.headline)) {
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
                        }
                        .padding(.vertical, 8)
                    }
                    
                    Section(header: Text("Model image").font(.headline)) {
                        Toggle("Generate model image", isOn: $viewModel.generateModelImage)
                            .padding(.horizontal)
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
                    
                    Button(action: { Task { await viewModel.getSuggestion() } }) {
                        if viewModel.isLoading {
                            ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Get Outfit Suggestion").fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(viewModel.selectedImage == nil ? Color.gray : (viewModel.isLoading ? Color.gray : Color.blue))
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .padding(.horizontal)
                    .disabled(viewModel.selectedImage == nil || viewModel.isLoading)
                    
                    if let suggestion = viewModel.currentSuggestion {
                        OutfitSuggestionView(suggestion: suggestion)
                            .padding(.horizontal)
                            .transition(.opacity)
                    }
                    Spacer(minLength: 50)
                }
                .padding(.vertical)
                .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .navigationTitle("AI Outfit Suggestor")
        .navigationBarTitleDisplayMode(.large)
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(selectedImage: $viewModel.selectedImage)
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(viewModel.errorMessage ?? "An error occurred")
        }
    }
}
