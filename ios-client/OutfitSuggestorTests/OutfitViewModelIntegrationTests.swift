import XCTest
import UIKit
@testable import OutfitSuggestor

@MainActor
final class OutfitViewModelIntegrationTests: XCTestCase {
    private var originalToken: String?
    private var originalUser: User?

    override func setUp() {
        super.setUp()
        originalToken = AuthService.shared.authToken
        originalUser = AuthService.shared.currentUser
    }

    override func tearDown() {
        AuthService.shared.authToken = originalToken
        AuthService.shared.currentUser = originalUser
        super.tearDown()
    }

    func testGetRandomFromWardrobeSetsSuggestionOnSuccess() async {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let mock = MockAPIService()
        mock.randomOutfitResult = .success(
            OutfitSuggestion(
                shirt: "blue shirt",
                trouser: "grey trouser",
                blazer: "navy blazer",
                shoes: "brown shoes",
                belt: "brown belt",
                reasoning: "clean business casual"
            )
        )
        let viewModel = OutfitViewModel(apiService: mock)

        await viewModel.getRandomFromWardrobe()

        XCTAssertEqual(viewModel.currentSuggestion?.shirt, "blue shirt")
        XCTAssertFalse(viewModel.showError)
        XCTAssertEqual(mock.randomOutfitCalls, 1)
    }

    func testCompleteOutfitFromOneWardrobeItemCallsAPIAndSetsSuggestion() async {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let mock = MockAPIService()
        mock.wardrobeItemsResult = .success(
            OutfitSuggestion(
                shirt: "selected blue shirt",
                trouser: "navy trouser",
                blazer: "gray blazer",
                shoes: "black loafers",
                belt: "black belt",
                reasoning: "completed around one selected wardrobe piece"
            )
        )
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.filters.occasion = "work"
        viewModel.filters.season = "all-season"
        viewModel.filters.style = "smart-casual"
        viewModel.preferenceText = "no sneakers"

        await viewModel.completeOutfitFromWardrobeItems([
            makeWardrobeItem(id: 11, category: "shirt")
        ])

        XCTAssertEqual(mock.wardrobeItemsCalls.count, 1)
        XCTAssertEqual(mock.wardrobeItemsCalls.first?.selectedIds, [11])
        XCTAssertEqual(mock.wardrobeItemsCalls.first?.textInput, "no sneakers")
        XCTAssertEqual(mock.wardrobeItemsCalls.first?.occasion, "work")
        XCTAssertEqual(mock.wardrobeItemsCalls.first?.style, "smart-casual")
        XCTAssertEqual(viewModel.currentSuggestion?.reasoning, "completed around one selected wardrobe piece")
        XCTAssertEqual(viewModel.inputPanelSource, .wardrobe)
        XCTAssertFalse(viewModel.showError)
    }

    func testCompleteOutfitFromMultipleWardrobeItemsCallsAPIAndSetsSuggestion() async {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let mock = MockAPIService()
        mock.wardrobeItemsResult = .success(
            OutfitSuggestion(
                shirt: "selected blue shirt",
                trouser: "selected navy trouser",
                blazer: "gray blazer",
                shoes: "black loafers",
                belt: "black belt",
                reasoning: "completed around selected wardrobe pieces"
            )
        )
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.filters.occasion = "work"
        viewModel.filters.season = "all-season"
        viewModel.filters.style = "smart-casual"
        viewModel.preferenceText = "no sneakers"

        await viewModel.completeOutfitFromWardrobeItems([
            makeWardrobeItem(id: 11, category: "shirt"),
            makeWardrobeItem(id: 12, category: "trouser")
        ])

        XCTAssertEqual(mock.wardrobeItemsCalls.count, 1)
        XCTAssertEqual(mock.wardrobeItemsCalls.first?.selectedIds, [11, 12])
        XCTAssertEqual(mock.wardrobeItemsCalls.first?.textInput, "no sneakers")
        XCTAssertEqual(mock.wardrobeItemsCalls.first?.occasion, "work")
        XCTAssertEqual(mock.wardrobeItemsCalls.first?.style, "smart-casual")
        XCTAssertEqual(viewModel.currentSuggestion?.reasoning, "completed around selected wardrobe pieces")
        XCTAssertEqual(viewModel.inputPanelSource, .wardrobe)
        XCTAssertFalse(viewModel.showError)
    }

    func testGetRandomFromWardrobeClearsUploadAndSetsPreviewState() async {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let b64 = makeBase64TestImage()
        let mock = MockAPIService()
        mock.randomOutfitResult = .success(
            OutfitSuggestion(
                shirt: "wardrobe shirt",
                trouser: "grey trouser",
                blazer: "navy blazer",
                shoes: "brown shoes",
                belt: "brown belt",
                reasoning: "from wardrobe",
                matching_wardrobe_items: MatchingWardrobeItems(
                    shirt: [
                        MatchingWardrobeItem(
                            id: 1,
                            category: "shirt",
                            color: "blue",
                            description: "wardrobe shirt",
                            image_data: b64
                        )
                    ],
                    trouser: nil,
                    blazer: nil,
                    shoes: nil,
                    belt: nil
                )
            )
        )
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.selectedImage = makeTestImage()
        viewModel.sourceWardrobeItem = OutfitViewModel.WardrobeSourceContext(
            id: 99,
            category: "shirt",
            color: "red"
        )

        await viewModel.getRandomFromWardrobe()

        XCTAssertNil(viewModel.selectedImage)
        XCTAssertNil(viewModel.sourceWardrobeItem)
        XCTAssertTrue(viewModel.loadedFromRandomPick)
        XCTAssertNotNil(viewModel.flowPreviewImage)
    }

    func testGetRandomFromWardrobeLogsOutOnSessionExpiredError() async {
        AuthService.shared.authToken = "expired-token"
        AuthService.shared.currentUser = makeUser()
        let mock = MockAPIService()
        mock.randomOutfitResult = .failure(APIServiceError.serverError("Session expired or invalid. Please log in again."))
        let viewModel = OutfitViewModel(apiService: mock)

        await viewModel.getRandomFromWardrobe()
        await waitForLoggedOutState()

        XCTAssertTrue(viewModel.showError)
        XCTAssertNil(AuthService.shared.authToken)
        XCTAssertNil(AuthService.shared.currentUser)
    }

    func testSuggestPreferencesCarryToInsightsContext() {
        let viewModel = OutfitViewModel(apiService: MockAPIService())
        viewModel.filters.occasion = "work"
        viewModel.filters.season = "summer"
        viewModel.filters.style = "smart-casual"
        viewModel.preferenceText = "navy and brown, no sneakers"

        let request = WardrobeGapAnalysisRequest(
            occasion: viewModel.filters.occasion,
            season: viewModel.filters.season,
            style: viewModel.filters.style,
            text_input: viewModel.preferenceText,
            analysis_mode: "free"
        )

        XCTAssertEqual(request.occasion, "work")
        XCTAssertEqual(request.season, "summer")
        XCTAssertEqual(request.style, "smart-casual")
        XCTAssertEqual(request.text_input, "navy and brown, no sneakers")
    }

    func testFilterEnumsAlignWithSharedWebOptions() {
        XCTAssertEqual(Occasion.workout.apiValue, "workout")
        XCTAssertEqual(Style.smartCasual.apiValue, "smart-casual")
        XCTAssertEqual(Style.vintage.apiValue, "vintage")
    }

    func testGetRandomFromHistoryUsesEntryFromAPI() async {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let mock = MockAPIService()
        mock.historyResult = .success([
            OutfitHistoryEntry(
                id: 1,
                created_at: "2026-01-01T00:00:00Z",
                text_input: "formal",
                image_data: nil,
                model_image: nil,
                shirt: "white shirt",
                trouser: "black trouser",
                blazer: "black blazer",
                shoes: "black shoes",
                belt: "black belt",
                reasoning: "classic formal"
            )
        ])
        let viewModel = OutfitViewModel(apiService: mock)

        await viewModel.getRandomFromHistory()

        XCTAssertEqual(viewModel.currentSuggestion?.shirt, "white shirt")
        XCTAssertEqual(mock.historyCalls, 1)
    }

    func testGetRandomFromHistoryClearsUploadAndSetsPreviewState() async {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let b64 = makeBase64TestImage()
        let mock = MockAPIService()
        mock.historyResult = .success([
            OutfitHistoryEntry(
                id: 1,
                created_at: "2026-01-01T00:00:00Z",
                text_input: "formal",
                image_data: b64,
                model_image: nil,
                shirt: "white shirt",
                trouser: "black trouser",
                blazer: "black blazer",
                shoes: "black shoes",
                belt: "black belt",
                reasoning: "classic formal",
                source_wardrobe_item_id: 42,
                shirt_id: 42
            )
        ])
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.selectedImage = makeTestImage()
        viewModel.sourceWardrobeItem = OutfitViewModel.WardrobeSourceContext(
            id: 5,
            category: "trouser",
            color: "black"
        )

        await viewModel.getRandomFromHistory()

        XCTAssertNil(viewModel.selectedImage)
        XCTAssertTrue(viewModel.loadedFromRandomPick)
        XCTAssertNotNil(viewModel.flowPreviewImage)
        XCTAssertEqual(viewModel.sourceWardrobeItem?.id, 42)
        XCTAssertEqual(viewModel.sourceWardrobeItem?.category, "shirt")
    }

    func testGetRandomFromHistorySetsSummaryFiltersAndHistorySource() async {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let mock = MockAPIService()
        mock.historyResult = .success([
            OutfitHistoryEntry(
                id: 3,
                created_at: "2026-01-03T00:00:00Z",
                text_input: "navy and brown",
                image_data: nil,
                model_image: nil,
                shirt: "navy shirt",
                trouser: "brown trouser",
                blazer: "none",
                shoes: "loafers",
                belt: "brown belt",
                reasoning: "smart casual",
                occasion: "work",
                season: "summer",
                style: "vintage"
            )
        ])
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.filters.occasion = "everyday"
        viewModel.filters.season = "all-season"
        viewModel.filters.style = "classic"

        await viewModel.getRandomFromHistory()

        XCTAssertEqual(viewModel.inputPanelSource, .history)
        XCTAssertEqual(viewModel.compactSummaryFilters.occasion, "work")
        XCTAssertEqual(viewModel.compactSummaryFilters.season, "summer")
        XCTAssertEqual(viewModel.compactSummaryFilters.style, "vintage")
        XCTAssertEqual(viewModel.compactSummaryPreferenceText, "navy and brown")
    }

    func testGetRandomFromHistoryClearsStalePreviewBeforeApplyingEntry() async {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let staleImage = makeTestImage()
        let entryImageB64 = makeBase64TestImage()
        let mock = MockAPIService()
        mock.historyResult = .success([
            OutfitHistoryEntry(
                id: 4,
                created_at: "2026-01-04T00:00:00Z",
                text_input: nil,
                image_data: entryImageB64,
                model_image: nil,
                shirt: "green shirt",
                trouser: "khaki trouser",
                blazer: "none",
                shoes: "sneakers",
                belt: "none",
                reasoning: "casual"
            )
        ])
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.flowPreviewImage = staleImage
        viewModel.sourceWardrobeItem = OutfitViewModel.WardrobeSourceContext(
            id: 9,
            category: "trouser",
            color: "black"
        )

        await viewModel.getRandomFromHistory()

        XCTAssertNil(viewModel.sourceWardrobeItem)
        XCTAssertNotNil(viewModel.flowPreviewImage)
        XCTAssertNotEqual(viewModel.flowPreviewImage?.pngData(), staleImage.pngData())
    }

    func testGetRandomFromHistoryClearsStaleWardrobeSourceWhenNoSourceId() async {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let mock = MockAPIService()
        mock.historyResult = .success([
            OutfitHistoryEntry(
                id: 2,
                created_at: "2026-01-02T00:00:00Z",
                text_input: nil,
                image_data: nil,
                model_image: nil,
                shirt: "casual shirt",
                trouser: "jeans",
                blazer: "none",
                shoes: "sneakers",
                belt: "none",
                reasoning: "casual"
            )
        ])
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.sourceWardrobeItem = OutfitViewModel.WardrobeSourceContext(
            id: 5,
            category: "trouser",
            color: "black"
        )

        await viewModel.getRandomFromHistory()

        XCTAssertNil(viewModel.sourceWardrobeItem)
        XCTAssertEqual(viewModel.inputPanelSource, .history)
    }

    func testGetNextSuggestionSendsPreviousOutfitText() async {
        let mock = MockAPIService()
        mock.suggestionResult = .success(makeAlternateSuggestion())
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.selectedImage = makeTestImage()
        viewModel.currentSuggestion = makePreviousSuggestion()

        await viewModel.getNextSuggestion()

        XCTAssertEqual(mock.suggestionCalls.count, 1)
        XCTAssertEqual(mock.suggestionCalls.first?.previousOutfitText?.contains("White oxford shirt"), true)
        XCTAssertEqual(viewModel.currentSuggestion?.shirt, "Updated blue shirt")
    }

    func testGetNextSuggestionMoreFormalIncludesPromptModifier() async {
        let mock = MockAPIService()
        mock.suggestionResult = .success(makeAlternateSuggestion())
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.selectedImage = makeTestImage()
        viewModel.currentSuggestion = makePreviousSuggestion()

        await viewModel.getNextSuggestion(variation: .moreFormal)

        let prompt = mock.suggestionCalls.first?.textInput ?? ""
        XCTAssertTrue(prompt.contains("more formal"))
        XCTAssertTrue(prompt.contains("Previous outfit"))
    }

    func testGetNextSuggestionWardrobeOnlyForcesWardrobeFlag() async {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let mock = MockAPIService()
        mock.suggestionResult = .success(makeAlternateSuggestion())
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.selectedImage = makeTestImage()
        viewModel.currentSuggestion = makePreviousSuggestion()

        await viewModel.getNextSuggestion(variation: .wardrobeOnly)

        XCTAssertTrue(viewModel.useWardrobeOnly)
        XCTAssertEqual(mock.suggestionCalls.first?.useWardrobeOnly, true)
        XCTAssertTrue(mock.suggestionCalls.first?.textInput.contains("wardrobe") ?? false)
    }

    func testStartUseWardrobeOnlyFromResultRequiresAuthentication() async {
        AuthService.shared.authToken = nil
        AuthService.shared.currentUser = nil
        let mock = MockAPIService()
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.selectedImage = makeTestImage()
        viewModel.currentSuggestion = makePreviousSuggestion()

        viewModel.startUseWardrobeOnlyFromResult()
        try? await Task.sleep(nanoseconds: 200_000_000)

        XCTAssertTrue(viewModel.showError)
        XCTAssertEqual(mock.suggestionCalls.count, 0)
    }

    func testOutfitVariationModifierPromptTextsAreDistinct() {
        XCTAssertTrue(OutfitViewModel.OutfitVariationModifier.moreFormal.promptText.contains("formal"))
        XCTAssertTrue(OutfitViewModel.OutfitVariationModifier.moreCasual.promptText.contains("casual"))
        XCTAssertTrue(OutfitViewModel.OutfitVariationModifier.wardrobeOnly.promptText.contains("wardrobe"))
        XCTAssertTrue(OutfitViewModel.OutfitVariationModifier.wardrobeOnly.forcesWardrobeOnly)
    }

    func testPreloadWardrobeItemForSuggestionClearsPriorResultAndPreviewState() {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let viewModel = OutfitViewModel(apiService: MockAPIService())
        viewModel.currentSuggestion = makePreviousSuggestion()
        viewModel.flowPreviewImage = makeTestImage()
        viewModel.loadedFromRandomPick = true

        let loaded = viewModel.preloadWardrobeItemForSuggestion(item: makeWardrobeItem(id: 42))

        XCTAssertTrue(loaded)
        XCTAssertNil(viewModel.currentSuggestion)
        XCTAssertNil(viewModel.flowPreviewImage)
        XCTAssertFalse(viewModel.loadedFromRandomPick)
        XCTAssertNotNil(viewModel.selectedImage)
        XCTAssertEqual(viewModel.sourceWardrobeItem?.id, 42)
        XCTAssertEqual(viewModel.sourceWardrobeItem?.category, "shirt")
        XCTAssertEqual(viewModel.sourceWardrobeItem?.color, "blue")
        XCTAssertTrue(viewModel.highlightGenerateButton)
    }

    func testPreloadWardrobeItemForSuggestionRequiresImageData() {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let viewModel = OutfitViewModel(apiService: MockAPIService())
        viewModel.currentSuggestion = makePreviousSuggestion()

        let loaded = viewModel.preloadWardrobeItemForSuggestion(
            item: makeWardrobeItem(id: 7, includeImage: false)
        )

        XCTAssertFalse(loaded)
        XCTAssertNotNil(viewModel.currentSuggestion)
        XCTAssertTrue(viewModel.showError)
    }

    func testResetSessionStateClearsMainFlowOnLogout() {
        let viewModel = OutfitViewModel(apiService: MockAPIService())
        viewModel.selectedImage = makeTestImage()
        viewModel.currentSuggestion = makePreviousSuggestion()
        viewModel.sourceWardrobeItem = OutfitViewModel.WardrobeSourceContext(id: 42, category: "shirt", color: "blue")
        viewModel.highlightGenerateButton = true
        viewModel.errorMessage = "Something went wrong"
        viewModel.showError = true
        viewModel.isLoading = true
        viewModel.loadingMessage = "Working..."
        viewModel.loadingContext = .suggestion
        viewModel.filters.occasion = "work"
        viewModel.filters.season = "summer"
        viewModel.filters.style = "vintage"
        viewModel.preferenceText = "navy and brown"
        viewModel.useWardrobeOnly = true
        viewModel.showDuplicateModal = true
        viewModel.existingDuplicateSuggestion = makePreviousSuggestion()

        viewModel.resetSessionState()

        XCTAssertNil(viewModel.selectedImage)
        XCTAssertNil(viewModel.flowPreviewImage)
        XCTAssertFalse(viewModel.loadedFromRandomPick)
        XCTAssertEqual(viewModel.inputPanelSource, .none)
        XCTAssertNil(viewModel.summaryFilters)
        XCTAssertNil(viewModel.summaryPreferenceText)
        XCTAssertNil(viewModel.currentSuggestion)
        XCTAssertNil(viewModel.sourceWardrobeItem)
        XCTAssertFalse(viewModel.highlightGenerateButton)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.loadingMessage)
        XCTAssertNil(viewModel.loadingContext)
        XCTAssertEqual(viewModel.filters.occasion, "everyday")
        XCTAssertEqual(viewModel.filters.season, "all-season")
        XCTAssertEqual(viewModel.filters.style, "classic")
        XCTAssertEqual(viewModel.preferenceText, "")
        XCTAssertFalse(viewModel.useWardrobeOnly)
        XCTAssertFalse(viewModel.showDuplicateModal)
        XCTAssertNil(viewModel.existingDuplicateSuggestion)
    }

    func testStartFreshUploadClearsResultAndSetsImage() {
        let viewModel = OutfitViewModel(apiService: MockAPIService())
        viewModel.currentSuggestion = makePreviousSuggestion()
        viewModel.loadedFromRandomPick = true
        viewModel.inputPanelSource = .history
        viewModel.summaryFilters = OutfitFilters()
        viewModel.summaryPreferenceText = "prior notes"
        viewModel.flowPreviewImage = makeTestImage()
        viewModel.sourceWardrobeItem = OutfitViewModel.WardrobeSourceContext(
            id: 1,
            category: "shirt",
            color: "blue"
        )
        let newImage = makeTestImage()

        viewModel.startFreshUpload(image: newImage)

        XCTAssertNil(viewModel.currentSuggestion)
        XCTAssertFalse(viewModel.loadedFromRandomPick)
        XCTAssertEqual(viewModel.inputPanelSource, .none)
        XCTAssertNil(viewModel.summaryFilters)
        XCTAssertNil(viewModel.summaryPreferenceText)
        XCTAssertNil(viewModel.flowPreviewImage)
        XCTAssertNil(viewModel.sourceWardrobeItem)
        XCTAssertEqual(viewModel.selectedImage?.pngData(), newImage.pngData())
    }

    func testGenerateAnotherFromResultHydratesHistoryPreviewAndCallsSuggestionAPI() async {
        let mock = MockAPIService()
        mock.suggestionResult = .success(makeAlternateSuggestion())
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.currentSuggestion = makePreviousSuggestion()
        viewModel.inputPanelSource = .history
        viewModel.flowPreviewImage = makeTestImage()
        viewModel.loadedFromRandomPick = true

        await viewModel.generateAnotherFromResult()

        XCTAssertNotNil(viewModel.selectedImage)
        XCTAssertNil(viewModel.flowPreviewImage)
        XCTAssertFalse(viewModel.loadedFromRandomPick)
        XCTAssertEqual(mock.suggestionCalls.count, 1)
        XCTAssertEqual(viewModel.currentSuggestion?.shirt, "Updated blue shirt")
    }

    func testGenerateAnotherFromResultCallsRandomWardrobeWithoutUpload() async {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let mock = MockAPIService()
        mock.randomOutfitResult = .success(
            OutfitSuggestion(
                shirt: "new wardrobe shirt",
                trouser: "grey trouser",
                blazer: "navy blazer",
                shoes: "brown shoes",
                belt: "brown belt",
                reasoning: "another random look"
            )
        )
        let viewModel = OutfitViewModel(apiService: mock)
        viewModel.currentSuggestion = makePreviousSuggestion()
        viewModel.inputPanelSource = .wardrobeRandom
        viewModel.loadedFromRandomPick = true
        viewModel.flowPreviewImage = makeTestImage()

        await viewModel.generateAnotherFromResult()

        XCTAssertEqual(mock.randomOutfitCalls, 1)
        XCTAssertEqual(mock.suggestionCalls.count, 0)
        XCTAssertEqual(viewModel.currentSuggestion?.shirt, "new wardrobe shirt")
    }

    func testCanGenerateAnotherFromResultForWardrobeRandomWithoutUpload() {
        let viewModel = OutfitViewModel(apiService: MockAPIService())
        viewModel.currentSuggestion = makePreviousSuggestion()
        viewModel.inputPanelSource = .wardrobeRandom
        viewModel.flowPreviewImage = makeTestImage()

        XCTAssertTrue(viewModel.canGenerateAnotherFromResult)
    }

    func testCanRefineWardrobeOnlyFromResultForWardrobeRandomWithoutUpload() {
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()
        let viewModel = OutfitViewModel(apiService: MockAPIService())
        viewModel.currentSuggestion = makePreviousSuggestion()
        viewModel.inputPanelSource = .wardrobeRandom

        XCTAssertTrue(viewModel.canRefineWardrobeOnlyFromResult)
    }

    func testResetSessionStatePreservesGuestSessionId() {
        let sessionIdBefore = GuestSession.sessionId()
        let viewModel = OutfitViewModel(apiService: MockAPIService())
        viewModel.selectedImage = makeTestImage()
        viewModel.currentSuggestion = makePreviousSuggestion()

        viewModel.resetSessionState()

        XCTAssertEqual(GuestSession.sessionId(), sessionIdBefore)
    }

    private func makePreviousSuggestion() -> OutfitSuggestion {
        OutfitSuggestion(
            shirt: "White oxford shirt",
            trouser: "Navy chinos",
            blazer: "Soft gray blazer",
            shoes: "Brown loafers",
            belt: "Brown belt",
            reasoning: "Smart casual baseline."
        )
    }

    private func makeAlternateSuggestion() -> OutfitSuggestion {
        OutfitSuggestion(
            shirt: "Updated blue shirt",
            trouser: "Charcoal trousers",
            blazer: "Structured blazer",
            shoes: "Black shoes",
            belt: "Black belt",
            reasoning: "Alternate look."
        )
    }

    private func makeTestImage() -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 8, height: 8))
        return renderer.image { context in
            UIColor.systemBlue.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 8, height: 8))
        }
    }

    private func makeBase64TestImage() -> String {
        makeTestImage().pngData()!.base64EncodedString()
    }

    private func makeWardrobeItem(id: Int, category: String = "shirt", includeImage: Bool = true) -> WardrobeItem {
        WardrobeItem(
            id: id,
            category: category,
            name: "Blue \(category)",
            description: "Casual blue \(category)",
            color: "blue",
            brand: nil,
            size: nil,
            image_data: includeImage ? makeBase64TestImage() : nil,
            tags: nil,
            condition: nil,
            wear_count: 0,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z"
        )
    }

    private func makeUser() -> User {
        User(
            id: 1,
            email: "ios@test.com",
            full_name: "iOS Tester",
            is_active: true,
            is_admin: false,
            email_verified: true,
            created_at: "2026-01-01T00:00:00Z"
        )
    }

    private func waitForLoggedOutState(timeoutNanoseconds: UInt64 = 2_000_000_000) async {
        let pollInterval: UInt64 = 50_000_000
        var elapsed: UInt64 = 0
        while elapsed < timeoutNanoseconds {
            if AuthService.shared.authToken == nil, AuthService.shared.currentUser == nil {
                return
            }
            try? await Task.sleep(nanoseconds: pollInterval)
            elapsed += pollInterval
        }
    }
}

private final class MockAPIService: APIServiceProtocol {
    struct RecordedSuggestionCall {
        let textInput: String
        let useWardrobeOnly: Bool
        let previousOutfitText: String?
    }

    struct RecordedWardrobeItemsCall {
        let selectedIds: [Int]
        let textInput: String
        let occasion: String?
        let season: String?
        let style: String?
    }

    var randomOutfitResult: Result<OutfitSuggestion, Error> = .failure(APIServiceError.invalidResponse)
    var historyResult: Result<[OutfitHistoryEntry], Error> = .failure(APIServiceError.invalidResponse)
    var suggestionResult: Result<OutfitSuggestion, Error> = .failure(APIServiceError.invalidResponse)
    var wardrobeItemsResult: Result<OutfitSuggestion, Error> = .failure(APIServiceError.invalidResponse)
    var randomOutfitCalls = 0
    var historyCalls = 0
    var suggestionCalls: [RecordedSuggestionCall] = []
    var wardrobeItemsCalls: [RecordedWardrobeItemsCall] = []

    func getSuggestion(
        image: UIImage,
        textInput: String,
        useWardrobeOnly: Bool,
        generateModelImage: Bool,
        imageModel: String,
        location: String?,
        previousOutfitText: String?,
        sourceWardrobeItemId: Int?,
        occasion: String?,
        season: String?,
        style: String?
    ) async throws -> OutfitSuggestion {
        suggestionCalls.append(
            RecordedSuggestionCall(
                textInput: textInput,
                useWardrobeOnly: useWardrobeOnly,
                previousOutfitText: previousOutfitText
            )
        )
        return try suggestionResult.get()
    }

    func getSuggestionFromWardrobeItem(
        itemId: Int,
        textInput: String,
        generateModelImage: Bool,
        imageModel: String,
        location: String?,
        occasion: String?,
        season: String?,
        style: String?
    ) async throws -> OutfitSuggestion {
        throw APIServiceError.invalidResponse
    }

    func getSuggestionFromWardrobeItems(
        selectedWardrobeItemIds: [Int],
        textInput: String,
        occasion: String?,
        season: String?,
        style: String?
    ) async throws -> OutfitSuggestion {
        wardrobeItemsCalls.append(
            RecordedWardrobeItemsCall(
                selectedIds: selectedWardrobeItemIds,
                textInput: textInput,
                occasion: occasion,
                season: season,
                style: style
            )
        )
        return try wardrobeItemsResult.get()
    }

    func getOutfitHistory(limit: Int) async throws -> [OutfitHistoryEntry] {
        historyCalls += 1
        return try historyResult.get()
    }

    func checkOutfitDuplicate(image: UIImage) async throws -> OutfitDuplicateResponse {
        OutfitDuplicateResponse(is_duplicate: false, existing_suggestion: nil)
    }

    func getRandomOutfit(occasion: String, season: String, style: String) async throws -> OutfitSuggestion {
        randomOutfitCalls += 1
        return try randomOutfitResult.get()
    }
}
