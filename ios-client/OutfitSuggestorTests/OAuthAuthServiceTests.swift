import XCTest
@testable import OutfitSuggestor

final class OAuthAuthServiceTests: XCTestCase {
    private var savedToken: String?
    private var savedUser: User?

    override func setUp() {
        super.setUp()
        savedToken = AuthService.shared.authToken
        savedUser = AuthService.shared.currentUser
    }

    override func tearDown() {
        AuthService.shared.authToken = savedToken
        AuthService.shared.currentUser = savedUser
        MockURLProtocol.requestHandler = nil
        super.tearDown()
    }

    func testOAuthLoginRequestEncodesProviderAndIdToken() throws {
        let request = OAuthLoginRequest(provider: .google, idToken: "test-id-token")
        let data = try JSONEncoder().encode(request)
        let json = try XCTUnwrap(String(data: data, encoding: .utf8))

        XCTAssertTrue(json.contains("\"provider\":\"google\""))
        XCTAssertTrue(json.contains("\"id_token\":\"test-id-token\""))
    }

    func testOAuthButtonLabelsMatchWebSpec() {
        XCTAssertEqual(OAuthCopy.googleButtonTitle, "Continue with Google")
        XCTAssertEqual(OAuthCopy.appleButtonTitle, "Continue with Apple")
        XCTAssertEqual(OAuthProvider.allCases.map(\.rawValue), ["google", "apple"])
    }

    func testOAuthLoginSuccessStoresSession() async throws {
        MockURLProtocol.requestHandler = { request in
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertEqual(request.url?.absoluteString, "https://api.test/api/auth/oauth")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")

            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 200,
                httpVersion: nil,
                headerFields: nil
            )!
            let data = """
            {
              "access_token": "oauth-access-token",
              "token_type": "bearer",
              "user": {
                "id": 42,
                "email": "oauth@example.com",
                "full_name": "OAuth User",
                "is_active": true,
                "is_admin": false,
                "email_verified": true,
                "created_at": "2026-01-01T00:00:00"
              }
            }
            """.data(using: .utf8)!
            return (response, data)
        }

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        let session = URLSession(configuration: config)
        let auth = AuthService(session: session, baseURL: "https://api.test")

        let token = try await auth.oauthLogin(provider: .apple, idToken: "apple-id-token")

        XCTAssertEqual(token.access_token, "oauth-access-token")
        XCTAssertEqual(auth.authToken, "oauth-access-token")
        XCTAssertEqual(auth.currentUser?.email, "oauth@example.com")
        XCTAssertTrue(auth.isAuthenticated)
    }

    func testOAuthLoginSurfacesServerError() async {
        MockURLProtocol.requestHandler = { request in
            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 401,
                httpVersion: nil,
                headerFields: nil
            )!
            let data = #"{"detail":"Invalid Apple ID token"}"#.data(using: .utf8)!
            return (response, data)
        }

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        let session = URLSession(configuration: config)
        let auth = AuthService(session: session, baseURL: "https://api.test")

        do {
            _ = try await auth.oauthLogin(provider: .apple, idToken: "bad-token")
            XCTFail("Expected oauthLogin to throw")
        } catch let AuthError.serverError(message) {
            XCTAssertEqual(message, "Invalid Apple ID token")
        } catch {
            XCTFail("Unexpected error: \(error)")
        }

        XCTAssertNil(auth.authToken)
        XCTAssertNil(auth.currentUser)
    }

    @MainActor
    func testGoogleSignInProviderRequiresClientID() async {
        if AppConfig.isGoogleSignInConfigured {
            // Calling fetchIDToken() would present the live Google Sign-In sheet in XCTest.
            XCTAssertFalse(AppConfig.googleClientID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            return
        }
        do {
            _ = try await GoogleSignInProvider().fetchIDToken()
            XCTFail("Expected GoogleSignInProvider to throw when unconfigured")
        } catch let error as OAuthSignInError {
            XCTAssertEqual(error, .googleSignInNotConfigured)
        } catch {
            XCTAssertFalse(String(describing: error).isEmpty)
        }
    }
}
