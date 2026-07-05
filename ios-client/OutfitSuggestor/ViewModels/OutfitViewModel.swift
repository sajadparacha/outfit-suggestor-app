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

    enum InputPanelSource: Equatable {
        case none
        case upload
        case wardrobe
        case wardrobeRandom
        case history
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
    /// Left-panel preview when suggestion came from random/history (no user upload).
    @Published var flowPreviewImage: UIImage?
    /// When true, item cards must not treat `selectedImage` as the upload source.
    @Published var loadedFromRandomPick = false
    @Published var inputPanelSource: InputPanelSource = .none
    /// Snapshot of filters for compact summary when viewing a loaded result (e.g. random history).
    @Published var summaryFilters: OutfitFilters?
    @Published var summaryPreferenceText: String?
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
    @Published var infoToastMessage: String?
    
    private let apiService: APIServiceProtocol
    private var cancellables = Set<AnyCancellable>()
    private var cachedHistory: [OutfitHistoryEntry] = []
    private var hasLoadedHistory = false
    private var currentHistoryEntryId: Int?
    private var randomHistorySelection = RandomHistorySelection()
    private var wardrobeRandomSession = WardrobeRandomSession()
    private var activeOperationTask: Task<Void, Never>?
    
    var aiOperationType: AiOperationType? {
        guard isLoading, let context = loadingContext else { return nil }
        switch context {
        case .suggestion, .nextSuggestion, .wardrobeItem:
            return generateModelImage ? .outfitWithPreview : .outfitSuggestion
        case .randomWardrobe:
            return .wardrobeOutfit
        case .randomHistory:
            return .randomHistory
        case .wardrobePreload:
            return nil
        }
    }

    var showsAiProgressPanel: Bool {
        aiOperationType != nil
    }
    
    init(apiService: APIServiceProtocol = APIService.shared) {
        self.apiService = apiService
        $filters
            .map { ($0.occasion, $0.season, $0.style) }
            .removeDuplicates(by: ==)
            .dropFirst()
            .sink { [weak self] _ in
                self?.wardrobeRandomSession.reset()
            }
            .store(in: &cancellables)
    }
    
    var isAuthenticated: Bool { AuthService.shared.isAuthenticated }

    var isGuestBlocked: Bool {
        guard !isAuthenticated else { return false }
        if guestRequiresSignup { return true }
        if let guestRemaining, guestRemaining <= 0 { return true }
        return false
    }

    /// Image shown in the input panel (upload or random/history preview).
    var inputPanelImage: UIImage? {
        selectedImage ?? flowPreviewImage
    }

    var compactSummaryFilters: OutfitFilters {
        summaryFilters ?? filters
    }

    var compactSummaryPreferenceText: String {
        summaryPreferenceText ?? preferenceText
    }

    /// Maps iOS-only `.wardrobeRandom` to web contract value `.wardrobe`.
    private var regeneratePanelSource: InputPanelSource? {
        switch inputPanelSource {
        case .wardrobeRandom: return .wardrobe
        default: return inputPanelSource
        }
    }

    var canGenerateAnotherFromResult: Bool {
        MainFlowResultRegenerateLogic.canGenerateAnotherFromResult(
            inputPanelSource: regeneratePanelSource,
            hasUploadedImage: selectedImage != nil,
            hasFlowPreview: flowPreviewImage != nil,
            hasSuggestion: currentSuggestion != nil
        )
    }

    var canRefineWardrobeOnlyFromResult: Bool {
        guard isAuthenticated, currentSuggestion != nil else { return false }
        if selectedImage != nil { return true }
        return inputPanelSource == .wardrobe || inputPanelSource == .wardrobeRandom
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

    /// Clears main suggest-flow session state (e.g. on logout). Does not touch guest session id or first-run coach keys.
    func resetSessionState() {
        cancelOperation()
        selectedImage = nil
        flowPreviewImage = nil
        loadedFromRandomPick = false
        inputPanelSource = .none
        summaryFilters = nil
        summaryPreferenceText = nil
        sourceWardrobeItem = nil
        highlightGenerateButton = false
        currentSuggestion = nil
        errorMessage = nil
        showError = false
        filters = OutfitFilters()
        preferenceText = ""
        useWardrobeOnly = false
        showDuplicateModal = false
        existingDuplicateSuggestion = nil
        hasLoadedHistory = false
        cachedHistory = []
        currentHistoryEntryId = nil
        randomHistorySelection.reset()
        wardrobeRandomSession.reset()
        infoToastMessage = nil
    }

    func clearInfoToast() {
        infoToastMessage = nil
    }

    func startGetSuggestion(skipDuplicateCheck: Bool = false) {
        runCancellableOperation { await self.getSuggestion(skipDuplicateCheck: skipDuplicateCheck) }
    }

    func startGetNextSuggestion() {
        runCancellableOperation { await self.getNextSuggestion() }
    }

    func startGenerateAnotherLook() {
        runCancellableOperation { await self.generateAnotherFromResult() }
    }

    func startMakeMoreFormal() {
        runCancellableOperation {
            guard await self.prepareForVariationRegenerate() else { return }
            await self.getNextSuggestion(variation: .moreFormal)
        }
    }

    func startMakeMoreCasual() {
        runCancellableOperation {
            guard await self.prepareForVariationRegenerate() else { return }
            await self.getNextSuggestion(variation: .moreCasual)
        }
    }

    func startUseWardrobeOnlyFromResult() {
        guard isAuthenticated else {
            showErrorMessage("Log in to use wardrobe-only suggestions.")
            return
        }
        runCancellableOperation { await self.regenerateWithWardrobeOnlyVariation() }
    }

    /// Clears result state and starts a fresh upload flow (exits compact result layout).
    func startFreshUpload(image: UIImage) {
        currentSuggestion = nil
        loadedFromRandomPick = false
        inputPanelSource = .none
        summaryFilters = nil
        summaryPreferenceText = nil
        flowPreviewImage = nil
        clearWardrobeSource()
        selectedImage = image
    }

    func generateAnotherFromResult() async {
        guard currentSuggestion != nil else {
            showErrorMessage("No current suggestion to get an alternate for")
            return
        }
        guard guardGuestCanUseAI() else { return }

        if (inputPanelSource == .wardrobe || inputPanelSource == .wardrobeRandom), selectedImage == nil {
            await getRandomFromWardrobe()
            return
        }

        if inputPanelSource == .history, selectedImage == nil {
            guard hydrateFlowPreviewForRegenerate() else {
                showErrorMessage("No image available to generate another look from")
                return
            }
        }

        if selectedImage != nil {
            await getNextSuggestion()
        } else {
            showErrorMessage("No current suggestion to get an alternate for")
        }
    }

    func startGenerateAnotherAfterOccasionChange() {
        startGetNextSuggestion()
    }

    func startGetRandomFromWardrobe() {
        runCancellableOperation { await self.getRandomFromWardrobe() }
    }

    func startCompleteOutfitFromWardrobeItems(_ items: [WardrobeItem]) {
        runCancellableOperation { await self.completeOutfitFromWardrobeItems(items) }
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
        loadedFromRandomPick = false
        flowPreviewImage = nil
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
                sourceWardrobeItemId: sourceWardrobeItem?.id,
                occasion: filters.occasion.lowercased(),
                season: filters.season.lowercased(),
                style: filters.style.lowercased()
            )
            currentSuggestion = OutfitUploadCategory.normalizeSuggestion(
                suggestion,
                sourceWardrobeCategory: sourceWardrobeItem?.category
            )
            highlightGenerateButton = false
            captureInputSnapshotForResult(source: sourceWardrobeItem != nil ? .wardrobe : .upload)
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
        loadedFromRandomPick = false
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
                sourceWardrobeItemId: sourceWardrobeItem?.id,
                occasion: filters.occasion.lowercased(),
                season: filters.season.lowercased(),
                style: filters.style.lowercased()
            )
            currentSuggestion = OutfitUploadCategory.normalizeSuggestion(
                suggestion,
                sourceWardrobeCategory: sourceWardrobeItem?.category
            )
            captureInputSnapshotForResult(source: sourceWardrobeItem != nil ? .wardrobe : .upload)
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
        currentHistoryEntryId = entry.id
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
        flowPreviewImage = nil
        loadedFromRandomPick = false
        inputPanelSource = .none
        summaryFilters = nil
        summaryPreferenceText = nil
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
        flowPreviewImage = nil
        loadedFromRandomPick = false
        inputPanelSource = .none
        summaryFilters = nil
        summaryPreferenceText = nil
        clearWardrobeSource()
    }

    private static func decodeBase64Image(_ payload: String) -> UIImage? {
        let cleaned = payload.replacingOccurrences(of: "\\s", with: "", options: .regularExpression)
        guard let data = Data(base64Encoded: cleaned) else { return nil }
        return UIImage(data: data)
    }

    private static func previewImageFromWardrobeMatches(_ suggestion: OutfitSuggestion) -> UIImage? {
        for category in ["shirt", "trouser", "blazer", "shoes", "belt"] {
            let match = OutfitItemThumbnail.resolveMatchingItem(suggestion: suggestion, category: category)
            if let image = OutfitItemThumbnail.wardrobeUIImage(from: match) {
                return image
            }
        }
        return nil
    }

    private static func previewImageFromSelectedWardrobeItems(
        _ suggestion: OutfitSuggestion,
        selectedIds: [Int]
    ) -> UIImage? {
        let allItems = allMatchingItems(from: suggestion)
        for itemId in selectedIds {
            if let item = allItems.first(where: { $0.id == itemId }),
               let image = OutfitItemThumbnail.wardrobeUIImage(from: item) {
                return image
            }
        }
        return previewImageFromWardrobeMatches(suggestion)
    }

    private static func allMatchingItems(from suggestion: OutfitSuggestion) -> [MatchingWardrobeItem] {
        guard let items = suggestion.matching_wardrobe_items else { return [] }
        return [items.shirt, items.trouser, items.blazer, items.shoes, items.belt, items.sweater, items.outerwear, items.tie]
            .compactMap { $0 }
            .flatMap { $0 }
    }

    private static func resolveWardrobeSource(
        from entry: OutfitHistoryEntry,
        suggestion: OutfitSuggestion,
        itemId: Int
    ) -> WardrobeSourceContext {
        if let item = allMatchingItems(from: suggestion).first(where: { $0.id == itemId }) {
            return WardrobeSourceContext(id: item.id, category: item.category, color: item.color)
        }
        let category = inferredSourceCategory(from: entry, itemId: itemId) ?? "item"
        return WardrobeSourceContext(id: itemId, category: category, color: nil)
    }

    private static func inferredSourceCategory(from entry: OutfitHistoryEntry, itemId: Int) -> String? {
        if entry.shirt_id == itemId { return "shirt" }
        if entry.trouser_id == itemId { return "trouser" }
        if entry.blazer_id == itemId { return "blazer" }
        if entry.shoes_id == itemId { return "shoes" }
        if entry.belt_id == itemId { return "belt" }
        if entry.outerwear_id == itemId { return "jacket" }
        return nil
    }

    private func captureInputSnapshotForResult(source: InputPanelSource) {
        inputPanelSource = source
        summaryFilters = filters
        summaryPreferenceText = preferenceText
    }

    @discardableResult
    private func hydrateFlowPreviewForRegenerate() -> Bool {
        guard selectedImage == nil, let preview = flowPreviewImage else { return false }
        selectedImage = preview
        flowPreviewImage = nil
        loadedFromRandomPick = false
        return true
    }

    private func prepareForVariationRegenerate() async -> Bool {
        guard currentSuggestion != nil else { return false }
        guard guardGuestCanUseAI() else { return false }

        if selectedImage == nil {
            guard hydrateFlowPreviewForRegenerate() else {
                showErrorMessage("No image available to refine this look")
                return false
            }
        }
        return true
    }

    private func regenerateWithWardrobeOnlyVariation() async {
        guard currentSuggestion != nil else { return }
        guard guardGuestCanUseAI() else { return }

        if (inputPanelSource == .wardrobe || inputPanelSource == .wardrobeRandom), selectedImage == nil {
            useWardrobeOnly = true
            await getRandomFromWardrobe()
            return
        }

        guard hydrateFlowPreviewForRegenerate() || selectedImage != nil else {
            showErrorMessage("No image available to refine this look")
            return
        }
        await getNextSuggestion(variation: .wardrobeOnly)
    }

    private static func filtersFromHistoryEntry(_ entry: OutfitHistoryEntry, fallback: OutfitFilters) -> OutfitFilters {
        var snapshot = fallback
        if let occasion = entry.occasion, !occasion.isEmpty {
            snapshot.occasion = occasion
        }
        if let season = entry.season, !season.isEmpty {
            snapshot.season = season
        }
        if let style = entry.style, !style.isEmpty {
            snapshot.style = style
        }
        return snapshot
    }
    
    /// Random outfit from wardrobe via AI (auth required)
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
            let previousOutfitText: String?
            if inputPanelSource == .wardrobeRandom, let current = currentSuggestion {
                previousOutfitText = OutfitPromptUtils.formatPreviousOutfitForPrompt(current)
            } else {
                previousOutfitText = nil
            }
            let avoidTexts = wardrobeRandomSession.avoidOutfitTexts(excludingPrevious: previousOutfitText)
            let trimmedNotes = preferenceText.trimmingCharacters(in: .whitespacesAndNewlines)
            let occasion = filters.occasion.lowercased()
            let season = filters.season.lowercased()
            let style = filters.style.lowercased()

            selectedImage = nil
            flowPreviewImage = nil
            sourceWardrobeItem = nil
            loadedFromRandomPick = true

            var suggestion: OutfitSuggestion?
            var attempt = 0
            while attempt < WardrobeRandomSession.wardrobeRandomMaxRetries {
                try Task.checkCancellation()
                let candidate = try await apiService.getWardrobeOnlySuggestion(
                    occasion: occasion,
                    season: season,
                    style: style,
                    textInput: trimmedNotes,
                    previousOutfitText: previousOutfitText,
                    avoidOutfitTexts: avoidTexts.isEmpty ? nil : avoidTexts
                )
                let fingerprint = WardrobeRandomSession.suggestionFingerprint(for: candidate)
                if !wardrobeRandomSession.isDuplicate(fingerprint) {
                    suggestion = candidate
                    break
                }
                attempt += 1
                if attempt >= WardrobeRandomSession.wardrobeRandomMaxRetries {
                    suggestion = candidate
                    break
                }
            }

            guard let suggestion else { return }
            wardrobeRandomSession.record(suggestion)
            currentSuggestion = suggestion
            flowPreviewImage = Self.previewImageFromWardrobeMatches(suggestion)
            captureInputSnapshotForResult(source: .wardrobeRandom)
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

    /// Complete an outfit around 1-5 selected wardrobe items without creating a new result screen.
    func completeOutfitFromWardrobeItems(_ items: [WardrobeItem]) async {
        guard isAuthenticated else { showErrorMessage("Please log in"); return }
        var selection = WardrobeMultiSelectState()
        for item in items {
            let result = selection.toggle(item)
            if let message = result.message {
                showErrorMessage(message)
                return
            }
        }
        guard selection.canCompleteOutfit else {
            showErrorMessage("Select at least 1 item")
            return
        }

        isLoading = true
        loadingContext = .wardrobeItem
        loadingMessage = "Completing your outfit..."
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
            selectedImage = nil
            flowPreviewImage = nil
            sourceWardrobeItem = nil
            loadedFromRandomPick = true
            highlightGenerateButton = false

            let suggestion = try await apiService.getSuggestionFromWardrobeItems(
                selectedWardrobeItemIds: selection.selectedItemIds,
                textInput: preferenceText,
                occasion: filters.occasion.lowercased(),
                season: filters.season.lowercased(),
                style: filters.style.lowercased()
            )
            currentSuggestion = suggestion
            flowPreviewImage = Self.previewImageFromSelectedWardrobeItems(
                suggestion,
                selectedIds: selection.selectedItemIds
            )
            captureInputSnapshotForResult(source: .wardrobe)
            hasLoadedHistory = false
        } catch is CancellationError {
            return
        } catch let error as APIServiceError {
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
            hasLoadedHistory = false
            cachedHistory = try await apiService.getOutfitHistory(limit: 100)
            hasLoadedHistory = true

            let excludeCurrentId = inputPanelSource == .history ? currentHistoryEntryId : nil
            let pickResult = randomHistorySelection.pick(
                from: cachedHistory,
                excludeCurrentId: excludeCurrentId
            )
            guard let entry = pickResult.entry else {
                showErrorMessage("No history yet. Get some outfit suggestions first.")
                return
            }
            if pickResult.shouldShowSingleLookToast {
                infoToastMessage = MainFlowUxCopy.randomHistoryOnlyOneLook
            }
            selectedImage = nil
            flowPreviewImage = nil
            sourceWardrobeItem = nil
            loadedFromRandomPick = true
            inputPanelSource = .history
            currentHistoryEntryId = entry.id
            summaryFilters = Self.filtersFromHistoryEntry(entry, fallback: filters)
            summaryPreferenceText = entry.text_input ?? ""
            let suggestion = entry.toOutfitSuggestion()
            currentSuggestion = suggestion
            flowPreviewImage = entry.image_data.flatMap { Self.decodeBase64Image($0) }
                ?? Self.previewImageFromWardrobeMatches(suggestion)
            if let sourceId = entry.source_wardrobe_item_id {
                sourceWardrobeItem = Self.resolveWardrobeSource(from: entry, suggestion: suggestion, itemId: sourceId)
            }
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

