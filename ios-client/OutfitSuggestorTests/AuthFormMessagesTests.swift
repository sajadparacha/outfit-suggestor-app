import XCTest
@testable import OutfitSuggestor

final class AuthFormMessagesTests: XCTestCase {
    func testLoginErrorDescriptionMentionsLocalDatabaseForInvalidCredentialsInDebug() {
        let message = AuthFormMessages.loginErrorDescription(
            AuthError.serverError("Incorrect email or password")
        )

        XCTAssertTrue(message.contains("Incorrect email or password"))
        XCTAssertTrue(message.contains(AppConfig.localAPIBaseURL))
        XCTAssertTrue(message.localizedCaseInsensitiveContains("local"))
    }

    func testLoginErrorDescriptionMentionsAPIHostForConnectionFailure() {
        let message = AuthFormMessages.loginErrorDescription(
            URLError(.cannotConnectToHost)
        )

        XCTAssertTrue(message.contains(AppConfig.apiBaseURL))
        XCTAssertTrue(message.localizedCaseInsensitiveContains("can't reach"))
    }
}
