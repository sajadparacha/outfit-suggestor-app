//
//  OutfitViewModel.swift
//  OutfitSuggestor
//
//  ViewModel (Controller) for outfit suggestions
//

import Foundation
import UIKit
import Combine

@MainActor
class OutfitViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var selectedImage: UIImage?
    @Published var currentSuggestion: OutfitSuggestion?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var filters = OutfitFilters()
    @Published var preferenceText = ""
    
    // MARK: - Private Properties
    private let apiService: APIService
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init(apiService: APIService = .shared) {
        self.apiService = apiService
    }
    
    // MARK: - Public Methods
    
    /// Get outfit suggestion from API
    func getSuggestion() async {
        guard let image = selectedImage else {
            showErrorMessage("Please select an image first")
            return
        }
        
        isLoading = true
        errorMessage = nil
        showError = false
        
        do {
            // Build prompt from filters or preference text
            let prompt = preferenceText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? filters.description
                : "User preferences: \(preferenceText)"
            
            // Call API service
            let suggestion = try await apiService.getSuggestion(
                image: image,
                textInput: prompt
            )
            
            currentSuggestion = suggestion
            
        } catch let error as APIServiceError {
            showErrorMessage(error.errorDescription ?? "An error occurred")
        } catch {
            showErrorMessage("An unexpected error occurred: \(error.localizedDescription)")
        }
        
        isLoading = false
    }
    
    /// Clear current selection and suggestion
    func clearSelection() {
        selectedImage = nil
        currentSuggestion = nil
        errorMessage = nil
        showError = false
    }
    
    /// Update filters
    func updateFilters(occasion: String? = nil, season: String? = nil, style: String? = nil) {
        if let occasion = occasion {
            filters.occasion = occasion
        }
        if let season = season {
            filters.season = season
        }
        if let style = style {
            filters.style = style
        }
    }
    
    // MARK: - Private Methods
    
    private func showErrorMessage(_ message: String) {
        errorMessage = message
        showError = true
    }
}

