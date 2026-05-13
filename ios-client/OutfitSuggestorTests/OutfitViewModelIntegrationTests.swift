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
        try? await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertTrue(viewModel.showError)
        XCTAssertNil(AuthService.shared.authToken)
        XCTAssertNil(AuthService.shared.currentUser)
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
}

private final class MockAPIService: APIServiceProtocol {
    var randomOutfitResult: Result<OutfitSuggestion, Error> = .failure(APIServiceError.invalidResponse)
    var historyResult: Result<[OutfitHistoryEntry], Error> = .failure(APIServiceError.invalidResponse)
    var randomOutfitCalls = 0
    var historyCalls = 0

    func getSuggestion(
        image: UIImage,
        textInput: String,
        useWardrobeOnly: Bool,
        generateModelImage: Bool,
        imageModel: String,
        location: String?,
        previousOutfitText: String?
    ) async throws -> OutfitSuggestion {
        throw APIServiceError.invalidResponse
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
