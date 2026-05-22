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
    enum LoadingContext: Equatable {
        case suggestion
        case nextSuggestion
        case wardrobeItem
        case randomWardrobe
        case randomHistory
    }

    @Published var selectedImage: UIImage?
    @Published var currentSuggestion: OutfitSuggestion?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var filters = OutfitFilters()
    @Published var preferenceText = ""
    @Published var useWardrobeOnly = false
    @Published var generateModelImage = false
    @Published var imageModel = "dalle3"
    @Published var showDuplicateModal = false
    @Published var existingDuplicateSuggestion: OutfitSuggestion?
    @Published var loadingMessage: String?
    @Published var loadingContext: LoadingContext?
    
    private let apiService: APIServiceProtocol
    private var cancellables = Set<AnyCancellable>()
    private var cachedHistory: [OutfitHistoryEntry] = []
    private var hasLoadedHistory = false
    
    init(apiService: APIServiceProtocol = APIService.shared) {
        self.apiService = apiService
    }
    
    var isAuthenticated: Bool { AuthService.shared.isAuthenticated }
    
    /// Get outfit suggestion from API with optional duplicate check
    func getSuggestion(skipDuplicateCheck: Bool = false) async {
        guard let image = selectedImage else {
            showErrorMessage("Please select an image first")
            return
        }
        isLoading = true
        loadingContext = .suggestion
        loadingMessage = generateModelImage
            ? "Creating your outfit idea and model preview..."
            : "Creating your outfit idea..."
        errorMessage = nil
        showError = false
        
        if !skipDuplicateCheck {
            do {
                let dupResult = try await apiService.checkOutfitDuplicate(image: image)
                if dupResult.is_duplicate, let existing = dupResult.existing_suggestion {
                    existingDuplicateSuggestion = existing
                    showDuplicateModal = true
                    isLoading = false
                    loadingMessage = nil
                    loadingContext = nil
                    return
                }
            } catch {
                // If duplicate check fails, proceed with suggestion anyway
            }
        }
        
        do {
            var location: String? = nil
            if generateModelImage {
                location = await LocationService.shared.getLocationString()
            }
            let prompt = preferenceText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? filters.description
                : "User preferences: \(preferenceText)"
            let suggestion = try await apiService.getSuggestion(
                image: image,
                textInput: prompt,
                useWardrobeOnly: isAuthenticated && useWardrobeOnly,
                generateModelImage: generateModelImage,
                imageModel: imageModel,
                location: location,
                previousOutfitText: nil
            )
            currentSuggestion = suggestion
            // Suggestion flow may add new history entries server-side; mark cache stale.
            hasLoadedHistory = false
        } catch let error as APIServiceError {
            showErrorMessage(error.errorDescription ?? "An error occurred")
        } catch {
            showErrorMessage("An unexpected error occurred: \(error.localizedDescription)")
        }
        isLoading = false
        loadingMessage = nil
        loadingContext = nil
    }
    
    /// Use the cached duplicate suggestion
    func useCachedSuggestion() {
        if let existing = existingDuplicateSuggestion {
            currentSuggestion = existing
        }
        showDuplicateModal = false
        existingDuplicateSuggestion = nil
    }
    
    /// Force a new suggestion (ignore duplicate)
    func forceNewSuggestion() async {
        showDuplicateModal = false
        existingDuplicateSuggestion = nil
        await getSuggestion(skipDuplicateCheck: true)
    }
    
    /// Get an alternate/next outfit suggestion using the same photo but asking for something different
    func getNextSuggestion() async {
        guard let image = selectedImage, let previous = currentSuggestion else {
            showErrorMessage("No current suggestion to get an alternate for")
            return
        }
        isLoading = true
        loadingContext = .nextSuggestion
        loadingMessage = generateModelImage
            ? "Trying another look with a model preview..."
            : "Trying another outfit option..."
        errorMessage = nil
        showError = false
        do {
            var location: String? = nil
            if generateModelImage {
                location = await LocationService.shared.getLocationString()
            }
            let previousOutfitText = """
            Previous outfit (suggest something DIFFERENT):
            Shirt: \(previous.shirt)
            Trousers: \(previous.trouser)
            Blazer: \(previous.blazer)
            Shoes: \(previous.shoes)
            Belt: \(previous.belt)
            """
            let basePrompt = preferenceText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? filters.description
                : "User preferences: \(preferenceText)"
            let fullPrompt = "\(basePrompt)\n\n\(previousOutfitText)"
            
            let suggestion = try await apiService.getSuggestion(
                image: image,
                textInput: fullPrompt,
                useWardrobeOnly: isAuthenticated && useWardrobeOnly,
                generateModelImage: generateModelImage,
                imageModel: imageModel,
                location: location,
                previousOutfitText: previousOutfitText
            )
            currentSuggestion = suggestion
            hasLoadedHistory = false
        } catch let error as APIServiceError {
            showErrorMessage(error.errorDescription ?? "An error occurred")
        } catch {
            showErrorMessage(error.localizedDescription)
        }
        isLoading = false
        loadingMessage = nil
        loadingContext = nil
    }
    
    /// Load a suggestion from history (e.g. after tapping in History tab)
    func loadFromHistory(_ entry: OutfitHistoryEntry) {
        currentSuggestion = entry.toOutfitSuggestion()
    }
    
    /// Set suggestion directly (e.g. from wardrobe "Get suggestion" or API)
    func setCurrentSuggestion(_ suggestion: OutfitSuggestion) {
        currentSuggestion = suggestion
    }
    
    /// Get outfit suggestion from a single wardrobe item; then switch to main to show result
    func getSuggestionFromWardrobeItem(id: Int) async {
        guard isAuthenticated else { showErrorMessage("Please log in"); return }
        isLoading = true
        loadingContext = .wardrobeItem
        loadingMessage = "Creating an outfit from this wardrobe piece..."
        errorMessage = nil
        showError = false
        do {
            var location: String? = nil
            if generateModelImage {
                location = await LocationService.shared.getLocationString()
            }
            let prompt = preferenceText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? filters.description
                : "User preferences: \(preferenceText)"
            let suggestion = try await apiService.getSuggestionFromWardrobeItem(
                itemId: id,
                textInput: prompt,
                generateModelImage: generateModelImage,
                imageModel: imageModel,
                location: location
            )
            currentSuggestion = suggestion
            hasLoadedHistory = false
        } catch let error as APIServiceError {
            showErrorMessage(error.errorDescription ?? "An error occurred")
        } catch {
            showErrorMessage(error.localizedDescription)
        }
        isLoading = false
        loadingMessage = nil
        loadingContext = nil
    }
    
    /// Random outfit from wardrobe (auth required)
    func getRandomFromWardrobe() async {
        guard isAuthenticated else { showErrorMessage("Please log in"); return }
        isLoading = true
        loadingContext = .randomWardrobe
        loadingMessage = "Picking a random look from your wardrobe..."
        errorMessage = nil
        showError = false
        do {
            let suggestion = try await apiService.getRandomOutfit(
                occasion: filters.occasion.lowercased(),
                season: filters.season.lowercased(),
                style: filters.style.lowercased()
            )
            currentSuggestion = suggestion
            hasLoadedHistory = false
        } catch let error as APIServiceError {
            if (error.errorDescription ?? "").localizedCaseInsensitiveContains("log in again") {
                AuthService.shared.logout()
            }
            showErrorMessage(error.errorDescription ?? "An error occurred")
        } catch {
            showErrorMessage(error.localizedDescription)
        }
        isLoading = false
        loadingMessage = nil
        loadingContext = nil
    }
    
    /// Random outfit from history (client-side pick)
    func getRandomFromHistory() async {
        guard isAuthenticated else { showErrorMessage("Please log in"); return }
        isLoading = true
        loadingContext = .randomHistory
        loadingMessage = "Picking a random look from your history..."
        errorMessage = nil
        showError = false
        do {
            if !hasLoadedHistory {
                cachedHistory = try await apiService.getOutfitHistory(limit: 100)
                hasLoadedHistory = true
            }
            guard let entry = cachedHistory.randomElement() else {
                showErrorMessage("No history yet. Get some outfit suggestions first.")
                isLoading = false
                loadingMessage = nil
                loadingContext = nil
                return
            }
            currentSuggestion = entry.toOutfitSuggestion()
        } catch {
            showErrorMessage(error.localizedDescription)
        }
        isLoading = false
        loadingMessage = nil
        loadingContext = nil
    }
    
    func clearSelection() {
        selectedImage = nil
        currentSuggestion = nil
        errorMessage = nil
        showError = false
        loadingMessage = nil
        loadingContext = nil
    }
    
    func updateFilters(occasion: String? = nil, season: String? = nil, style: String? = nil) {
        if let occasion = occasion { filters.occasion = occasion }
        if let season = season { filters.season = season }
        if let style = style { filters.style = style }
    }
    
    private func showErrorMessage(_ message: String) {
        errorMessage = message
        showError = true
    }
}

