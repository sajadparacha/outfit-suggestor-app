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
    struct WardrobeSourceContext: Equatable {
        let id: Int
        let category: String
        let color: String?
    }

    enum LoadingContext: Equatable {
        case suggestion
        case nextSuggestion
        case wardrobeItem
        case wardrobePreload
        case randomWardrobe
        case randomHistory
    }

    enum OutfitVariationModifier {
        case moreFormal
        case moreCasual
        case wardrobeOnly

        var promptText: String {
            switch self {
            case .moreFormal:
                return "Make this outfit more formal and polished while keeping the same uploaded item."
            case .moreCasual:
                return "Make this outfit more relaxed and casual while keeping the same uploaded item."
            case .wardrobeOnly:
                return "Use only items from my wardrobe for every piece of this outfit."
            }
        }

        var forcesWardrobeOnly: Bool {
            self == .wardrobeOnly
        }
    }

    @Published var selectedImage: UIImage?
    @Published var sourceWardrobeItem: WardrobeSourceContext?
    @Published var highlightGenerateButton = false
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
    @Published var guestRemaining: Int?
    @Published var guestRequiresSignup = false
    
    private let apiService: APIServiceProtocol
    private var cancellables = Set<AnyCancellable>()
    private var cachedHistory: [OutfitHistoryEntry] = []
    private var hasLoadedHistory = false
    private var activeOperationTask: Task<Void, Never>?
    
    var aiOperationType: AiOperationType? {
        guard isLoading, let context = loadingContext else { return nil }
        switch context {
        case .suggestion, .nextSuggestion, .wardrobeItem:
            return generateModelImage ? .outfitWithPreview : .outfitSuggestion
        case .randomWardrobe:
            return .wardrobeOutfit
        case .randomHistory, .wardrobePreload:
            return nil
        }
    }

    var showsAiProgressPanel: Bool {
        aiOperationType != nil
    }
    
    init(apiService: APIServiceProtocol = APIService.shared) {
        self.apiService = apiService
    }
    
    var isAuthenticated: Bool { AuthService.shared.isAuthenticated }

    var isGuestBlocked: Bool {
        guard !isAuthenticated else { return false }
        if guestRequiresSignup { return true }
        if let guestRemaining, guestRemaining <= 0 { return true }
        return false
    }

    func refreshGuestUsage() async {
        guard !isAuthenticated else {
            guestRemaining = nil
            guestRequiresSignup = false
            return
        }
        do {
            let usage = try await APIService.shared.getGuestUsage()
            guestRemaining = usage.remaining
            guestRequiresSignup = usage.requires_signup
        } catch {
            // Backend enforces limits; silent failure keeps generate enabled until known.
        }
    }

    func clearGuestUsageState() {
        guestRemaining = nil
        guestRequiresSignup = false
    }

    private func applyGuestLimitReached() {
        guestRemaining = 0
        guestRequiresSignup = true
    }

    private func guardGuestCanUseAI() -> Bool {
        guard !isAuthenticated else { return true }
        if isGuestBlocked {
            applyGuestLimitReached()
            return false
        }
        return true
    }

    func cancelOperation() {
        activeOperationTask?.cancel()
        activeOperationTask = nil
        clearLoadingState()
    }

    func startGetSuggestion(skipDuplicateCheck: Bool = false) {
        runCancellableOperation { await self.getSuggestion(skipDuplicateCheck: skipDuplicateCheck) }
    }

    func startGetNextSuggestion() {
        runCancellableOperation { await self.getNextSuggestion() }
    }

    func startGenerateAnotherLook() {
        startGetNextSuggestion()
    }

    func startMakeMoreFormal() {
        runCancellableOperation { await self.getNextSuggestion(variation: .moreFormal) }
    }

    func startMakeMoreCasual() {
        runCancellableOperation { await self.getNextSuggestion(variation: .moreCasual) }
    }

    func startUseWardrobeOnlyFromResult() {
        guard isAuthenticated else {
            showErrorMessage("Log in to use wardrobe-only suggestions.")
            return
        }
        runCancellableOperation { await self.getNextSuggestion(variation: .wardrobeOnly) }
    }

    func startGenerateAnotherAfterOccasionChange() {
        startGetNextSuggestion()
    }

    func startGetRandomFromWardrobe() {
        runCancellableOperation { await self.getRandomFromWardrobe() }
    }

    func startGetRandomFromHistory() {
        runCancellableOperation { await self.getRandomFromHistory() }
    }

    func startForceNewSuggestion() {
        runCancellableOperation { await self.forceNewSuggestion() }
    }

    private func runCancellableOperation(_ operation: @escaping () async -> Void) {
        activeOperationTask?.cancel()
        activeOperationTask = Task {
            await operation()
        }
    }

    private func clearLoadingState() {
        isLoading = false
        loadingMessage = nil
        loadingContext = nil
    }
    
    /// Get outfit suggestion from API with optional duplicate check
    func getSuggestion(skipDuplicateCheck: Bool = false) async {
        guard let image = selectedImage else {
            showErrorMessage("Please select an image first")
            return
        }
        guard guardGuestCanUseAI() else { return }
        isLoading = true
        loadingContext = .suggestion
        loadingMessage = generateModelImage
            ? "Creating your outfit idea and model preview..."
            : "Preparing your image..."
        errorMessage = nil
        showError = false
        
        defer {
            if !Task.isCancelled {
                clearLoadingState()
                activeOperationTask = nil
            }
        }
        
        if !skipDuplicateCheck {
            do {
                try Task.checkCancellation()
                let dupResult = try await apiService.checkOutfitDuplicate(image: image)
                if dupResult.is_duplicate, let existing = dupResult.existing_suggestion {
                    existingDuplicateSuggestion = existing
                    showDuplicateModal = true
                    return
                }
            } catch is CancellationError {
                return
            } catch {
                // If duplicate check fails, proceed with suggestion anyway
            }
        }
        
        do {
            try Task.checkCancellation()
            loadingMessage = generateModelImage
                ? "Generating preview..."
                : "Building outfit recommendation..."
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
                previousOutfitText: nil,
                sourceWardrobeItemId: sourceWardrobeItem?.id
            )
            currentSuggestion = suggestion
            highlightGenerateButton = false
            // Suggestion flow may add new history entries server-side; mark cache stale.
            hasLoadedHistory = false
            if !isAuthenticated {
                await refreshGuestUsage()
            }
        } catch is CancellationError {
            return
        } catch let error as APIServiceError {
            if case .guestLimitReached = error {
                applyGuestLimitReached()
            } else {
                showErrorMessage(error.errorDescription ?? "An error occurred")
            }
        } catch {
            showErrorMessage("An unexpected error occurred: \(error.localizedDescription)")
        }
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
    
    /// Get an alternate outfit suggestion using the same photo but asking for something different
    func getNextSuggestion(variation: OutfitVariationModifier? = nil) async {
        guard let image = selectedImage, let previous = currentSuggestion else {
            showErrorMessage("No current suggestion to get an alternate for")
            return
        }
        guard guardGuestCanUseAI() else { return }
        if variation == .wardrobeOnly {
            useWardrobeOnly = true
        }
        isLoading = true
        loadingContext = .nextSuggestion
        loadingMessage = generateModelImage
            ? "Trying another look with a model preview..."
            : "Building outfit recommendation..."
        errorMessage = nil
        showError = false
        defer {
            if !Task.isCancelled {
                clearLoadingState()
                activeOperationTask = nil
            }
        }
        do {
            try Task.checkCancellation()
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
            var fullPrompt = "\(basePrompt)\n\n\(previousOutfitText)"
            if let variation {
                fullPrompt += "\n\n\(variation.promptText)"
            }

            let effectiveWardrobeOnly = isAuthenticated && (variation?.forcesWardrobeOnly == true || useWardrobeOnly)

            let suggestion = try await apiService.getSuggestion(
                image: image,
                textInput: fullPrompt,
                useWardrobeOnly: effectiveWardrobeOnly,
                generateModelImage: generateModelImage,
                imageModel: imageModel,
                location: location,
                previousOutfitText: previousOutfitText,
                sourceWardrobeItemId: sourceWardrobeItem?.id
            )
            currentSuggestion = suggestion
            hasLoadedHistory = false
            if !isAuthenticated {
                await refreshGuestUsage()
            }
        } catch is CancellationError {
            return
        } catch let error as APIServiceError {
            if case .guestLimitReached = error {
                applyGuestLimitReached()
            } else {
                showErrorMessage(error.errorDescription ?? "An error occurred")
            }
        } catch {
            showErrorMessage(error.localizedDescription)
        }
    }
    
    /// Load a suggestion from history (e.g. after tapping in History tab)
    func loadFromHistory(_ entry: OutfitHistoryEntry) {
        currentSuggestion = entry.toOutfitSuggestion()
    }
    
    /// Set suggestion directly (e.g. from wardrobe "Get suggestion" or API)
    func setCurrentSuggestion(_ suggestion: OutfitSuggestion) {
        currentSuggestion = suggestion
    }
    
    /// Load a wardrobe item into the Suggest flow so the user can tune preferences before generating.
    func preloadWardrobeItemForSuggestion(id: Int) async -> Bool {
        do {
            let item = try await APIService.shared.getWardrobeItem(id: id)
            return applyWardrobeItemToSuggestFlow(item)
        } catch let error as APIServiceError {
            showErrorMessage(error.errorDescription ?? "An error occurred")
        } catch {
            showErrorMessage(error.localizedDescription)
        }
        return false
    }

    /// Preload from an item already shown in the wardrobe list (no extra fetch).
    func preloadWardrobeItemForSuggestion(item: WardrobeItem) -> Bool {
        applyWardrobeItemToSuggestFlow(item)
    }

    @discardableResult
    private func applyWardrobeItemToSuggestFlow(_ item: WardrobeItem) -> Bool {
        guard isAuthenticated else { showErrorMessage("Please log in"); return false }
        guard let imageData = item.image_data,
              let image = Self.decodeBase64Image(imageData) else {
            showErrorMessage("This item doesn't have an image.")
            return false
        }
        errorMessage = nil
        showError = false
        currentSuggestion = nil
        selectedImage = image
        sourceWardrobeItem = WardrobeSourceContext(
            id: item.id,
            category: item.category,
            color: item.color
        )
        highlightGenerateButton = true
        return true
    }

    func clearWardrobeSource() {
        sourceWardrobeItem = nil
        highlightGenerateButton = false
    }

    func clearSelectedImage() {
        selectedImage = nil
        clearWardrobeSource()
    }

    private static func decodeBase64Image(_ payload: String) -> UIImage? {
        let cleaned = payload.replacingOccurrences(of: "\\s", with: "", options: .regularExpression)
        guard let data = Data(base64Encoded: cleaned) else { return nil }
        return UIImage(data: data)
    }
    
    /// Random outfit from wardrobe (auth required)
    func getRandomFromWardrobe() async {
        guard isAuthenticated else { showErrorMessage("Please log in"); return }
        isLoading = true
        loadingContext = .randomWardrobe
        loadingMessage = "Scanning your wardrobe..."
        errorMessage = nil
        showError = false
        defer {
            if !Task.isCancelled {
                clearLoadingState()
                activeOperationTask = nil
            }
        }
        do {
            try Task.checkCancellation()
            let suggestion = try await apiService.getRandomOutfit(
                occasion: filters.occasion.lowercased(),
                season: filters.season.lowercased(),
                style: filters.style.lowercased()
            )
            currentSuggestion = suggestion
            hasLoadedHistory = false
        } catch is CancellationError {
            return
        } catch let error as APIServiceError {
            if (error.errorDescription ?? "").localizedCaseInsensitiveContains("log in again") {
                AuthService.shared.logout()
            }
            showErrorMessage(error.errorDescription ?? "An error occurred")
        } catch {
            showErrorMessage(error.localizedDescription)
        }
    }
    
    /// Random outfit from history (client-side pick)
    func getRandomFromHistory() async {
        guard isAuthenticated else { showErrorMessage("Please log in"); return }
        isLoading = true
        loadingContext = .randomHistory
        loadingMessage = "Picking a random look from your history..."
        errorMessage = nil
        showError = false
        defer {
            if !Task.isCancelled {
                clearLoadingState()
                activeOperationTask = nil
            }
        }
        do {
            try Task.checkCancellation()
            if !hasLoadedHistory {
                cachedHistory = try await apiService.getOutfitHistory(limit: 100)
                hasLoadedHistory = true
            }
            guard let entry = cachedHistory.randomElement() else {
                showErrorMessage("No history yet. Get some outfit suggestions first.")
                return
            }
            currentSuggestion = entry.toOutfitSuggestion()
        } catch is CancellationError {
            return
        } catch {
            showErrorMessage(error.localizedDescription)
        }
    }
    
    func clearSelection() {
        clearSelectedImage()
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

