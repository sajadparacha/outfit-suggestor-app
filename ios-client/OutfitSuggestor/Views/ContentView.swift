//
//  ContentView.swift
//  OutfitSuggestor
//
//  Main view of the application
//

import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = OutfitViewModel()
    @State private var showImagePicker = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(UIColor.systemGroupedBackground)
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Hero Section
                        HeroView()
                        
                        // Image Upload Section
                        ImageUploadView(
                            selectedImage: $viewModel.selectedImage,
                            showImagePicker: $showImagePicker
                        )
                        .padding(.horizontal)
                        
                        // Filters Section
                        FiltersView(
                            filters: $viewModel.filters,
                            preferenceText: $viewModel.preferenceText
                        )
                        .padding(.horizontal)
                        
                        // Get Suggestion Button
                        Button(action: {
                            Task {
                                await viewModel.getSuggestion()
                            }
                        }) {
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
                        .background(viewModel.selectedImage == nil || viewModel.isLoading ? Color.gray : Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .padding(.horizontal)
                        .disabled(viewModel.selectedImage == nil || viewModel.isLoading)
                        
                        // Suggestion Result
                        if let suggestion = viewModel.currentSuggestion {
                            OutfitSuggestionView(suggestion: suggestion)
                                .padding(.horizontal)
                                .transition(.opacity)
                        }
                        
                        Spacer(minLength: 50)
                    }
                    .padding(.vertical)
                }
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
}

// MARK: - Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}

