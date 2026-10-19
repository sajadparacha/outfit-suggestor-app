import XCTest
import UIKit
@testable import OutfitSuggestor

/// Spec: .cursor/specs/api-response-size.md — thumbnails in lists, detail fetch for full photos,
/// paginated history, server-side Past Suggestions filter, text-only random pool.
@MainActor
final class APIResponseSizeTests: XCTestCase {
    override func setUp() {
        super.setUp()
        FullImageCache.shared.removeAll()
    }

    override func tearDown() {
        MockURLProtocol.requestHandler = nil
        FullImageCache.shared.removeAll()
        super.tearDown()
    }

    // MARK: - URL building

    func testOutfitHistoryURLIncludesPagingParams() throws {
        let url = try XCTUnwrap(APIService.outfitHistoryURL(baseURL: "https://api.test", limit: 20, offset: 40))
        XCTAssertEqual(url.path, "/api/outfit-history")
        let query = queryDict(url)
        XCTAssertEqual(query["limit"], "20")
        XCTAssertEqual(query["offset"], "40")
        XCTAssertNil(query["wardrobe_item_id"])
        XCTAssertNil(query["include_images"])
    }

    func testOutfitHistoryURLIncludesWardrobeItemIdAndIncludeImagesFalse() throws {
        let url = try XCTUnwrap(APIService.outfitHistoryURL(
            baseURL: "https://api.test",
            limit: 100,
            offset: 0,
            wardrobeItemId: 7,
            includeImages: false
        ))
        let query = queryDict(url)
        XCTAssertEqual(query["limit"], "100")
        XCTAssertEqual(query["offset"], "0")
        XCTAssertEqual(query["wardrobe_item_id"], "7")
        XCTAssertEqual(query["include_images"], "false")
    }

    func testOutfitHistoryURLNeverRequestsMoreThan100() throws {
        let url = try XCTUnwrap(APIService.outfitHistoryURL(baseURL: "https://api.test", limit: 200))
        XCTAssertEqual(queryDict(url)["limit"], "100")
        XCTAssertEqual(APIService.outfitHistoryMaxLimit, 100)
    }

    func testDetailURLs() {
        XCTAssertEqual(
            APIService.outfitHistoryEntryURL(baseURL: "https://api.test", id: 9)?.absoluteString,
            "https://api.test/api/outfit-history/9"
        )
        XCTAssertEqual(
            APIService.wardrobeItemURL(baseURL: "https://api.test", id: 3)?.absoluteString,
            "https://api.test/api/wardrobe/3"
        )
    }

    func testGetOutfitHistorySendsAllQueryParams() async throws {
        var captured: URL?
        let service = makeService { request in
            captured = request.url
            return (self.ok(request), "[]".data(using: .utf8)!)
        }

        let entries = try await service.getOutfitHistory(limit: 20, offset: 20, wardrobeItemId: 5, includeImages: false)

        XCTAssertTrue(entries.isEmpty)
        let url = try XCTUnwrap(captured)
        XCTAssertEqual(url.path, "/api/outfit-history")
        let query = queryDict(url)
        XCTAssertEqual(query["limit"], "20")
        XCTAssertEqual(query["offset"], "20")
        XCTAssertEqual(query["wardrobe_item_id"], "5")
        XCTAssertEqual(query["include_images"], "false")
    }

    func testGetOutfitHistoryDefaultsToFirstPageOf20() async throws {
        var captured: URL?
        let service = makeService { request in
            captured = request.url
            return (self.ok(request), "[]".data(using: .utf8)!)
        }

        _ = try await service.getOutfitHistory()

        let query = queryDict(try XCTUnwrap(captured))
        XCTAssertEqual(query["limit"], "20")
        XCTAssertEqual(query["offset"], "0")
        XCTAssertNil(query["include_images"])
    }

    func testGetOutfitHistoryEntryHitsDetailEndpointAndDecodesFullPhoto() async throws {
        var captured: URLRequest?
        let service = makeService { request in
            captured = request
            return (self.ok(request), Self.historyEntryJSON(id: 9, imageData: "\"full-photo\"").data(using: .utf8)!)
        }

        let entry = try await service.getOutfitHistoryEntry(id: 9)

        XCTAssertEqual(captured?.url?.path, "/api/outfit-history/9")
        XCTAssertEqual(captured?.httpMethod ?? "GET", "GET")
        XCTAssertEqual(captured?.value(forHTTPHeaderField: "Authorization"), "Bearer token-123")
        XCTAssertEqual(entry.id, 9)
        XCTAssertEqual(entry.image_data, "full-photo")
        XCTAssertEqual(entry.image_thumbnail, "entry-thumb")
    }

    func testGetWardrobeItemHitsDetailEndpoint() async throws {
        var captured: URL?
        let service = makeService { request in
            captured = request.url
            let json = """
            {"id": 3, "category": "shirt", "image_data": "full-shirt", "image_thumbnail": "thumb-shirt"}
            """
            return (self.ok(request), json.data(using: .utf8)!)
        }

        let item = try await service.getWardrobeItem(id: 3)

        XCTAssertEqual(captured?.path, "/api/wardrobe/3")
        XCTAssertEqual(item.image_data, "full-shirt")
        XCTAssertEqual(item.image_thumbnail, "thumb-shirt")
    }

    // MARK: - Decoding

    func testDecodesHistoryEntryThumbnailsWithNullImageData() throws {
        let entry = try JSONDecoder().decode(
            OutfitHistoryEntry.self,
            from: Self.historyEntryJSON(id: 1, imageData: "null").data(using: .utf8)!
        )

        XCTAssertNil(entry.image_data)
        XCTAssertEqual(entry.image_thumbnail, "entry-thumb")
        let shirt = try XCTUnwrap(entry.matching_wardrobe_items?.shirt?.first)
        XCTAssertNil(shirt.image_data)
        XCTAssertEqual(shirt.image_thumbnail, "shirt-thumb")
        XCTAssertEqual(entry.inputThumbnailOrFullImageData, "entry-thumb")
        XCTAssertEqual(shirt.thumbnailOrFullImageData, "shirt-thumb")
    }

    func testDecodesWardrobeListItemThumbnailWithNullImageData() throws {
        let json = """
        {"items": [{"id": 4, "category": "trouser", "image_data": null, "image_thumbnail": "trouser-thumb"}],
         "total": 1, "limit": 50, "offset": 0}
        """
        let response = try JSONDecoder().decode(WardrobeListResponse.self, from: json.data(using: .utf8)!)
        let item = try XCTUnwrap(response.items.first)
        XCTAssertNil(item.image_data)
        XCTAssertEqual(item.image_thumbnail, "trouser-thumb")
        XCTAssertEqual(item.thumbnailOrFullImageData, "trouser-thumb")
    }

    func testDecodesLegacyPayloadWithoutThumbnailField() throws {
        let json = """
        {"id": 5, "category": "shoes", "image_data": "legacy-full"}
        """
        let item = try JSONDecoder().decode(WardrobeItem.self, from: json.data(using: .utf8)!)
        XCTAssertNil(item.image_thumbnail)
        XCTAssertEqual(item.thumbnailOrFullImageData, "legacy-full")
    }

    // MARK: - Thumbnail-or-full helper

    func testThumbnailOrFullPrefersThumbnailAndIgnoresEmptyStrings() {
        XCTAssertEqual(ImageThumbnailData.thumbnailOrFull(thumbnail: "t", full: "f"), "t")
        XCTAssertEqual(ImageThumbnailData.thumbnailOrFull(thumbnail: nil, full: "f"), "f")
        XCTAssertEqual(ImageThumbnailData.thumbnailOrFull(thumbnail: "", full: "f"), "f")
        XCTAssertNil(ImageThumbnailData.thumbnailOrFull(thumbnail: nil, full: nil))
        XCTAssertNil(ImageThumbnailData.thumbnailOrFull(thumbnail: "", full: ""))
        XCTAssertEqual(ImageThumbnailData.fullOrThumbnail(full: "f", thumbnail: "t"), "f")
        XCTAssertEqual(ImageThumbnailData.fullOrThumbnail(full: nil, thumbnail: "t"), "t")

        let detail = makeEntry(id: 1, imageData: "full", thumbnail: "thumb")
        XCTAssertEqual(detail.inputThumbnailOrFullImageData, "thumb", "Lists render the thumbnail")
        XCTAssertEqual(detail.inputFullOrThumbnailImageData, "full", "Flows use the full photo from detail")
    }

    func testListRenderingUsesThumbnailForEntryMatchedAndWardrobeItems() {
        let thumb = makeBase64TestImage()
        let matched = MatchingWardrobeItem(
            id: 11, category: "shirt", color: nil, description: nil, image_data: nil, image_thumbnail: thumb
        )
        XCTAssertNotNil(OutfitItemThumbnail.wardrobeUIImage(from: matched))

        let entry = makeEntry(id: 1, imageData: nil, thumbnail: "entry-thumb")
        XCTAssertEqual(entry.recentLookThumbnailData, "entry-thumb")

        let item = WardrobeItem(id: 2, category: "shirt", image_data: nil, image_thumbnail: thumb)
        XCTAssertTrue(WardrobeCompletionThumbnails.hasDecodableImageData(item.thumbnailOrFullImageData))
        XCTAssertEqual(
            WardrobeCompletionThumbnails.thumbnailItemsInOrder(selectedItemIds: [2], allItems: [item]).map(\.id),
            [2]
        )
    }

    // MARK: - History pagination

    func testHistoryPagerAppendsPagesAndStopsOnShortPage() async {
        let mock = ResponseSizeMockAPIService()
        mock.historyPages = [makeEntries(1...20), makeEntries(21...40), makeEntries(41...45)]
        let pager = HistoryPageLoader(apiService: mock)

        await pager.loadFirstPage()
        XCTAssertEqual(pager.entries.count, 20)
        XCTAssertTrue(pager.hasMore)

        await pager.loadMore()
        XCTAssertEqual(pager.entries.count, 40)
        XCTAssertTrue(pager.hasMore)

        await pager.loadMore()
        XCTAssertEqual(pager.entries.count, 45)
        XCTAssertFalse(pager.hasMore)

        await pager.loadMore()
        XCTAssertEqual(mock.historyRequests.count, 3, "No request after a short page")
        XCTAssertEqual(mock.historyRequests.map(\.offset), [0, 20, 40])
        XCTAssertEqual(mock.historyRequests.map(\.limit), [20, 20, 20])
        XCTAssertTrue(mock.historyRequests.allSatisfy { $0.limit <= 100 })
        XCTAssertTrue(mock.historyRequests.allSatisfy { $0.includeImages })
        XCTAssertEqual(pager.entries.map(\.id), Array(1...45))
    }

    func testHistoryPagerLoadsMoreOnlyNearLastRows() async {
        let mock = ResponseSizeMockAPIService()
        mock.historyPages = [makeEntries(1...20), makeEntries(21...25)]
        let pager = HistoryPageLoader(apiService: mock)
        await pager.loadFirstPage()
        let ids = pager.entries.map(\.id)

        await pager.loadMoreIfNeeded(currentEntryId: 5, visibleIds: ids)
        XCTAssertEqual(mock.historyRequests.count, 1)

        await pager.loadMoreIfNeeded(currentEntryId: 20, visibleIds: ids)
        XCTAssertEqual(mock.historyRequests.count, 2)
        XCTAssertEqual(pager.entries.count, 25)
        XCTAssertFalse(pager.hasMore)
    }

    func testHistoryPagerShortFirstPageHasNoMore() async {
        let mock = ResponseSizeMockAPIService()
        mock.historyPages = [makeEntries(1...4)]
        let pager = HistoryPageLoader(apiService: mock)

        await pager.loadFirstPage()

        XCTAssertFalse(pager.hasMore)
        XCTAssertEqual(pager.entries.count, 4)
    }

    func testHistoryPagerLoadAllRemainingUsesPagesOf100ForSearch() async {
        let mock = ResponseSizeMockAPIService()
        mock.historyPages = [makeEntries(1...20), makeEntries(21...120), makeEntries(121...130)]
        let pager = HistoryPageLoader(apiService: mock)

        await pager.loadFirstPage()
        await pager.loadAllRemaining()

        XCTAssertEqual(pager.entries.count, 130)
        XCTAssertFalse(pager.hasMore)
        XCTAssertEqual(mock.historyRequests.map(\.limit), [20, 100, 100])
        XCTAssertEqual(mock.historyRequests.map(\.offset), [0, 20, 120])
        XCTAssertTrue(mock.historyRequests.allSatisfy { $0.limit <= 100 })
    }

    func testHistoryPagerLoadMoreErrorKeepsEntries() async {
        let mock = ResponseSizeMockAPIService()
        mock.historyPages = [makeEntries(1...20)]
        let pager = HistoryPageLoader(apiService: mock)
        await pager.loadFirstPage()

        mock.historyError = APIServiceError.invalidResponse
        let ok = await pager.loadMore()

        XCTAssertFalse(ok)
        XCTAssertEqual(pager.entries.count, 20)
        XCTAssertTrue(pager.hasMore, "Retry allowed on next scroll")
        XCTAssertNil(pager.errorMessage)
    }

    func testHistoryPagerFirstPageErrorSurfacesMessage() async {
        let mock = ResponseSizeMockAPIService()
        mock.historyError = APIServiceError.serverError("boom")
        let pager = HistoryPageLoader(apiService: mock)

        await pager.loadFirstPage()

        XCTAssertEqual(pager.errorMessage, "boom")
        XCTAssertFalse(pager.hasLoadedFirstPage)
    }

    func testHistoryPagerDeleteRemovesLocallyAndShiftsOffset() async {
        let mock = ResponseSizeMockAPIService()
        mock.historyPages = [makeEntries(1...20), makeEntries(22...25)]
        let pager = HistoryPageLoader(apiService: mock)
        await pager.loadFirstPage()

        pager.remove(entryId: 3)
        XCTAssertEqual(pager.entries.count, 19)
        XCTAssertFalse(pager.entries.contains { $0.id == 3 })

        await pager.loadMore()
        XCTAssertEqual(mock.historyRequests.count, 2, "Delete must not refetch pages")
        XCTAssertEqual(mock.historyRequests.last?.offset, 19)
    }

    func testHistoryHeaderTextForMoreAndAllLoadedStates() {
        XCTAssertEqual(HistoryPageLoader.headerText(count: 20, hasMore: true), "Showing last 20 entries.")
        XCTAssertEqual(HistoryPageLoader.headerText(count: 1, hasMore: true), "Showing last 1 entry.")
        XCTAssertEqual(HistoryPageLoader.headerText(count: 45, hasMore: false), "Showing all 45 entries")
        XCTAssertEqual(HistoryPageLoader.headerText(count: 1, hasMore: false), "Showing all 1 entry")
    }

    func testHistoryHeaderTextFollowsPagerState() async {
        let mock = ResponseSizeMockAPIService()
        mock.historyPages = [makeEntries(1...20), makeEntries(21...23)]
        let pager = HistoryPageLoader(apiService: mock)

        await pager.loadFirstPage()
        XCTAssertEqual(pager.headerText, "Showing last 20 entries.")

        await pager.loadMore()
        XCTAssertEqual(pager.headerText, "Showing all 23 entries")
    }

    func testLoadingMoreAccessibilityLabel() {
        XCTAssertEqual(HistoryPageLoader.loadingMoreAccessibilityLabel, "Loading more looks")
        XCTAssertEqual(HistoryPageLoader.pageSize, 20)
    }

    // MARK: - Past Suggestions

    func testPastSuggestionsRequestsWardrobeItemIdAndPages() async {
        let mock = ResponseSizeMockAPIService()
        mock.historyPages = [makeEntries(1...20), makeEntries(21...22)]
        let loader = WardrobePastSuggestionsLoader(apiService: mock)

        await loader.open(for: WardrobeItem(id: 42, category: "shirt"))
        XCTAssertEqual(loader.suggestions.count, 20)
        XCTAssertTrue(loader.hasMore)

        await loader.loadMoreIfNeeded(currentEntryId: 20)
        XCTAssertEqual(loader.suggestions.count, 22)
        XCTAssertFalse(loader.hasMore)

        XCTAssertEqual(mock.historyRequests.map(\.wardrobeItemId), [42, 42])
        XCTAssertEqual(mock.historyRequests.map(\.offset), [0, 20])
        XCTAssertEqual(mock.historyRequests.map(\.limit), [20, 20])
    }

    // MARK: - Random pick

    func testRandomPickFetchesTextOnlyPoolThenDetailForPickedEntry() async {
        let originalToken = AuthService.shared.authToken
        let originalUser = AuthService.shared.currentUser
        defer {
            AuthService.shared.authToken = originalToken
            AuthService.shared.currentUser = originalUser
        }
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()

        let mock = ResponseSizeMockAPIService()
        mock.historyPages = [[makeEntry(id: 7, imageData: nil, thumbnail: nil)]]
        mock.detailEntries[7] = makeEntry(id: 7, imageData: makeBase64TestImage(), thumbnail: "t")
        let viewModel = OutfitViewModel(apiService: mock, fullImageCache: FullImageCache())

        await viewModel.getRandomFromHistory()

        XCTAssertEqual(mock.historyRequests.count, 1)
        XCTAssertEqual(mock.historyRequests.first?.limit, 100)
        XCTAssertEqual(mock.historyRequests.first?.includeImages, false)
        XCTAssertNil(mock.historyRequests.first?.wardrobeItemId)
        XCTAssertEqual(mock.detailRequests, [7])
        XCTAssertEqual(viewModel.currentSuggestion?.id, "7")
        XCTAssertNotNil(viewModel.flowPreviewImage, "Preview uses the full photo from the detail endpoint")
        XCTAssertFalse(viewModel.showError)
    }

    func testLoadFromHistoryShowsEntryThenHydratesFullPhotoFromDetail() async {
        let mock = ResponseSizeMockAPIService()
        let full = makeBase64TestImage()
        mock.detailEntries[12] = makeEntry(id: 12, imageData: full, thumbnail: "thumb")
        let viewModel = OutfitViewModel(apiService: mock, fullImageCache: FullImageCache())
        let listEntry = makeEntry(id: 12, imageData: nil, thumbnail: nil)

        viewModel.loadFromHistory(listEntry)
        XCTAssertEqual(viewModel.currentSuggestion?.id, "12")

        await viewModel.hydrateHistoryEntryPhoto(entryId: 12)

        XCTAssertEqual(viewModel.currentSuggestion?.imageData, Data(base64Encoded: full))
        XCTAssertTrue(mock.detailRequests.contains(12))
    }

    // MARK: - Session cache

    func testFullImageLoaderCachesDetailByIdAndInvalidatesWardrobeItem() async throws {
        let mock = ResponseSizeMockAPIService()
        mock.wardrobeItems[3] = WardrobeItem(id: 3, category: "shirt", image_data: "full", image_thumbnail: "thumb")
        mock.detailEntries[9] = makeEntry(id: 9, imageData: "full-entry", thumbnail: "t")
        let cache = FullImageCache()

        _ = try await FullImageLoader.wardrobeItemDetail(id: 3, api: mock, cache: cache)
        _ = try await FullImageLoader.wardrobeItemDetail(id: 3, api: mock, cache: cache)
        XCTAssertEqual(mock.wardrobeItemRequests, [3])

        cache.invalidateWardrobeItem(id: 3)
        _ = try await FullImageLoader.wardrobeItemDetail(id: 3, api: mock, cache: cache)
        XCTAssertEqual(mock.wardrobeItemRequests, [3, 3])

        let first = await FullImageLoader.historyInputFullImageData(entryId: 9, api: mock, cache: cache)
        let second = await FullImageLoader.historyInputFullImageData(entryId: 9, api: mock, cache: cache)
        XCTAssertEqual(first, "full-entry")
        XCTAssertEqual(second, "full-entry")
        XCTAssertEqual(mock.detailRequests, [9])
    }

    func testEnlargeFetchFailureReturnsNilSoThumbnailStays() async {
        let mock = ResponseSizeMockAPIService()
        let value = await FullImageLoader.wardrobeFullImageData(itemId: 99, api: mock, cache: FullImageCache())
        XCTAssertNil(value)
    }

    func testUseWardrobeListItemFetchesDetailForFullPhoto() async {
        let originalToken = AuthService.shared.authToken
        let originalUser = AuthService.shared.currentUser
        defer {
            AuthService.shared.authToken = originalToken
            AuthService.shared.currentUser = originalUser
        }
        AuthService.shared.authToken = "test-token"
        AuthService.shared.currentUser = makeUser()

        let mock = ResponseSizeMockAPIService()
        mock.wardrobeItems[5] = WardrobeItem(id: 5, category: "shirt", image_data: makeBase64TestImage())
        let viewModel = OutfitViewModel(apiService: mock, fullImageCache: FullImageCache())
        let listItem = WardrobeItem(id: 5, category: "shirt", image_data: nil, image_thumbnail: makeBase64TestImage())

        let loaded = await viewModel.preloadWardrobeItemForSuggestion(item: listItem)

        XCTAssertTrue(loaded)
        XCTAssertEqual(mock.wardrobeItemRequests, [5])
        XCTAssertNotNil(viewModel.selectedImage)
        XCTAssertEqual(viewModel.sourceWardrobeItem?.id, 5)
    }

    // MARK: - Helpers

    private func makeService(requestHandler: @escaping MockURLProtocol.RequestHandler) -> APIService {
        MockURLProtocol.requestHandler = requestHandler
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        return APIService(
            baseURL: "https://api.test",
            session: URLSession(configuration: config),
            authTokenProvider: { "token-123" }
        )
    }

    private nonisolated func ok(_ request: URLRequest) -> HTTPURLResponse {
        HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
    }

    private func queryDict(_ url: URL) -> [String: String] {
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        return Dictionary(uniqueKeysWithValues: items.map { ($0.name, $0.value ?? "") })
    }

    private nonisolated static func historyEntryJSON(id: Int, imageData: String) -> String {
        """
        {
          "id": \(id),
          "created_at": "2026-05-01T10:00:00",
          "text_input": null,
          "image_data": \(imageData),
          "image_thumbnail": "entry-thumb",
          "model_image": null,
          "shirt": "Oxford", "trouser": "Chino", "blazer": "Navy", "shoes": "Loafer", "belt": "Brown",
          "reasoning": "Balanced",
          "shirt_id": 11,
          "matching_wardrobe_items": {
            "shirt": [{"id": 11, "category": "shirt", "color": "blue", "description": "Oxford",
                       "image_data": null, "image_thumbnail": "shirt-thumb"}]
          }
        }
        """
    }

    private func makeEntry(id: Int, imageData: String?, thumbnail: String?) -> OutfitHistoryEntry {
        OutfitHistoryEntry(
            id: id,
            created_at: "2026-01-\(String(format: "%02d", (id % 28) + 1))T00:00:00Z",
            text_input: nil,
            image_data: imageData,
            image_thumbnail: thumbnail,
            model_image: nil,
            shirt: "shirt \(id)",
            trouser: "trouser \(id)",
            blazer: "blazer \(id)",
            shoes: "shoes \(id)",
            belt: "belt \(id)",
            reasoning: "reason \(id)"
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

    private func makeEntries(_ ids: ClosedRange<Int>) -> [OutfitHistoryEntry] {
        ids.map { makeEntry(id: $0, imageData: nil, thumbnail: "t\($0)") }
    }

    private func makeBase64TestImage() -> String {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 4, height: 4))
        let image = renderer.image { context in
            UIColor.systemRed.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 4, height: 4))
        }
        return image.pngData()!.base64EncodedString()
    }
}

private final class ResponseSizeMockAPIService: APIServiceProtocol {
    struct HistoryRequest {
        let limit: Int
        let offset: Int
        let wardrobeItemId: Int?
        let includeImages: Bool
    }

    var historyPages: [[OutfitHistoryEntry]] = []
    var historyError: Error?
    var detailEntries: [Int: OutfitHistoryEntry] = [:]
    var wardrobeItems: [Int: WardrobeItem] = [:]
    private(set) var historyRequests: [HistoryRequest] = []
    private(set) var detailRequests: [Int] = []
    private(set) var wardrobeItemRequests: [Int] = []

    func getOutfitHistory(
        limit: Int,
        offset: Int,
        wardrobeItemId: Int?,
        includeImages: Bool
    ) async throws -> [OutfitHistoryEntry] {
        historyRequests.append(
            HistoryRequest(limit: limit, offset: offset, wardrobeItemId: wardrobeItemId, includeImages: includeImages)
        )
        if let historyError { throw historyError }
        return historyPages.isEmpty ? [] : historyPages.removeFirst()
    }

    func getOutfitHistoryEntry(id: Int) async throws -> OutfitHistoryEntry {
        detailRequests.append(id)
        guard let entry = detailEntries[id] else { throw APIServiceError.invalidResponse }
        return entry
    }

    func getWardrobeItem(id: Int) async throws -> WardrobeItem {
        wardrobeItemRequests.append(id)
        guard let item = wardrobeItems[id] else { throw APIServiceError.invalidResponse }
        return item
    }

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
        throw APIServiceError.invalidResponse
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
        throw APIServiceError.invalidResponse
    }

    func getWardrobeOnlySuggestion(
        occasion: String,
        season: String,
        style: String,
        textInput: String,
        previousOutfitText: String?,
        avoidOutfitTexts: [String]?
    ) async throws -> OutfitSuggestion {
        throw APIServiceError.invalidResponse
    }

    func checkOutfitDuplicate(image: UIImage) async throws -> OutfitDuplicateResponse {
        OutfitDuplicateResponse(is_duplicate: false, existing_suggestion: nil)
    }

    func getRandomOutfit(occasion: String, season: String, style: String) async throws -> OutfitSuggestion {
        throw APIServiceError.invalidResponse
    }
}
