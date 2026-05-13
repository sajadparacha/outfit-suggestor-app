import XCTest
import UIKit
@testable import OutfitSuggestor

final class APIServiceIntegrationTests: XCTestCase {
    override func tearDown() {
        MockURLProtocol.requestHandler = nil
        super.tearDown()
    }

    func testGetRandomOutfitDecodesRandomResponseShape() async throws {
        let service = makeService { request in
            XCTAssertEqual(request.url?.path, "/api/wardrobe/random-outfit")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer token-123")
            return (
                HTTPURLResponse(
                    url: request.url!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                """
                {
                  "shirt":"white oxford shirt",
                  "trouser":"navy trouser",
                  "blazer":"charcoal blazer",
                  "shoes":"brown loafers",
                  "belt":"brown belt",
                  "reasoning":"balanced smart-casual outfit"
                }
                """.data(using: .utf8)!
            )
        }

        let suggestion = try await service.getRandomOutfit(occasion: "casual", season: "all", style: "modern")
        XCTAssertEqual(suggestion.shirt, "white oxford shirt")
        XCTAssertEqual(suggestion.belt, "brown belt")
    }

    func testGetRandomOutfitDecodesOutfitSuggestionShape() async throws {
        let service = makeService { request in
            (
                HTTPURLResponse(
                    url: request.url!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                """
                {
                  "shirt":"black shirt",
                  "trouser":"grey trouser",
                  "blazer":"black blazer",
                  "shoes":"black derby",
                  "belt":"black belt",
                  "reasoning":"formal monochrome look",
                  "upload_matched_category":"shirt"
                }
                """.data(using: .utf8)!
            )
        }

        let suggestion = try await service.getRandomOutfit(occasion: "formal", season: "winter", style: "classic")
        XCTAssertEqual(suggestion.shirt, "black shirt")
        XCTAssertEqual(suggestion.reasoning, "formal monochrome look")
    }

    func testGetRandomOutfitReturnsFriendlyAuthErrorOn401() async {
        let service = makeService { request in
            (
                HTTPURLResponse(
                    url: request.url!,
                    statusCode: 401,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                #"{"detail":"Could not validate credentials"}"#.data(using: .utf8)!
            )
        }

        do {
            _ = try await service.getRandomOutfit(occasion: "casual", season: "all", style: "modern")
            XCTFail("Expected APIServiceError.serverError for 401")
        } catch let APIServiceError.serverError(message) {
            XCTAssertTrue(message.localizedCaseInsensitiveContains("log in again"))
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
    }

    func testGetSuggestionAcceptsPreviousOutfitTextInput() async throws {
        let image = UIGraphicsImageRenderer(size: CGSize(width: 4, height: 4)).image { context in
            UIColor.black.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 4, height: 4))
        }

        let service = makeService { request in
            XCTAssertEqual(request.url?.path, "/api/suggest-outfit")
            return (
                HTTPURLResponse(
                    url: request.url!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                """
                {
                  "shirt":"navy shirt",
                  "trouser":"beige trouser",
                  "blazer":"sand blazer",
                  "shoes":"white sneaker",
                  "belt":"tan belt",
                  "reasoning":"lighter summer contrast"
                }
                """.data(using: .utf8)!
            )
        }

        _ = try await service.getSuggestion(
            image: image,
            textInput: "summer smart casual",
            useWardrobeOnly: false,
            generateModelImage: false,
            imageModel: "dalle3",
            location: nil,
            previousOutfitText: "shirt: white shirt\ntrouser: black trouser"
        )
    }

    func testListIntegrationTestsDecodesWrappedResponseShape() async throws {
        let service = makeService { request in
            XCTAssertEqual(request.url?.path, "/api/admin/integration-tests")
            return (
                HTTPURLResponse(
                    url: request.url!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                )!,
                """
                {
                  "tests": [
                    {
                      "id": "api_wardrobe",
                      "name": "Wardrobe API",
                      "description": "Checks wardrobe endpoints",
                      "layer": "backend",
                      "path": "tests/integration/test_wardrobe.py"
                    }
                  ]
                }
                """.data(using: .utf8)!
            )
        }

        let tests = try await service.listIntegrationTests()
        XCTAssertEqual(tests.count, 1)
        XCTAssertEqual(tests.first?.id, "api_wardrobe")
    }

    private func makeService(
        requestHandler: @escaping MockURLProtocol.RequestHandler
    ) -> APIService {
        MockURLProtocol.requestHandler = requestHandler
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        let session = URLSession(configuration: config)
        return APIService(
            baseURL: "https://api.test",
            session: session,
            authTokenProvider: { "token-123" }
        )
    }
}

final class MockURLProtocol: URLProtocol {
    typealias RequestHandler = (URLRequest) throws -> (HTTPURLResponse, Data)
    static var requestHandler: RequestHandler?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = MockURLProtocol.requestHandler else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }

        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
