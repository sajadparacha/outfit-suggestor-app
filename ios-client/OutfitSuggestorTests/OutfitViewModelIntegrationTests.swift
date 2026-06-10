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
        viewModel.filters.occasion = "business"
        viewModel.filters.season = "summer"
        viewModel.filters.style = "business casual"
        viewModel.preferenceText = "navy and brown, no sneakers"

        let request = WardrobeGapAnalysisRequest(
            occasion: viewModel.filters.occasion,
            season: viewModel.filters.season,
            style: viewModel.filters.style,
            text_input: viewModel.preferenceText,
            analysis_mode: "free"
        )

        XCTAssertEqual(request.occasion, "business")
        XCTAssertEqual(request.season, "summer")
        XCTAssertEqual(request.style, "business casual")
        XCTAssertEqual(request.text_input, "navy and brown, no sneakers")
    }

    func testFilterEnumsAlignWithSharedWebOptions() {
        XCTAssertEqual(Occasion.sports.apiValue, "sports")
        XCTAssertEqual(Style.businessCasual.apiValue, "business casual")
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
        viewModel.filters.occasion = "business"
        viewModel.filters.season = "summer"
        viewModel.filters.style = "vintage"
        viewModel.preferenceText = "navy and brown"
        viewModel.useWardrobeOnly = true
        viewModel.showDuplicateModal = true
        viewModel.existingDuplicateSuggestion = makePreviousSuggestion()

        viewModel.resetSessionState()

        XCTAssertNil(viewModel.selectedImage)
        XCTAssertNil(viewModel.currentSuggestion)
        XCTAssertNil(viewModel.sourceWardrobeItem)
        XCTAssertFalse(viewModel.highlightGenerateButton)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.loadingMessage)
        XCTAssertNil(viewModel.loadingContext)
        XCTAssertEqual(viewModel.filters.occasion, "casual")
        XCTAssertEqual(viewModel.filters.season, "all")
        XCTAssertEqual(viewModel.filters.style, "modern")
        XCTAssertEqual(viewModel.preferenceText, "")
        XCTAssertFalse(viewModel.useWardrobeOnly)
        XCTAssertFalse(viewModel.showDuplicateModal)
        XCTAssertNil(viewModel.existingDuplicateSuggestion)
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

    var randomOutfitResult: Result<OutfitSuggestion, Error> = .failure(APIServiceError.invalidResponse)
    var historyResult: Result<[OutfitHistoryEntry], Error> = .failure(APIServiceError.invalidResponse)
    var suggestionResult: Result<OutfitSuggestion, Error> = .failure(APIServiceError.invalidResponse)
    var randomOutfitCalls = 0
    var historyCalls = 0
    var suggestionCalls: [RecordedSuggestionCall] = []

    func getSuggestion(
        image: UIImage,
        textInput: String,
        useWardrobeOnly: Bool,
        generateModelImage: Bool,
        imageModel: String,
        location: String?,
        previousOutfitText: String?,
        sourceWardrobeItemId: Int?
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
        location: String?
    ) async throws -> OutfitSuggestion {
        throw APIServiceError.invalidResponse
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
