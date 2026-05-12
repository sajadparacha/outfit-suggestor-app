import XCTest
@testable import OutfitSuggestor

final class AppConfigTests: XCTestCase {
    private let overrideKey = "api_base_url_override"

    override func setUp() {
        super.setUp()
        UserDefaults.standard.removeObject(forKey: overrideKey)
    }

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: overrideKey)
        super.tearDown()
    }

    func testApiBaseURLUsesOverrideWhenPresent() {
        UserDefaults.standard.set("https://example.test", forKey: overrideKey)

        XCTAssertEqual(AppConfig.apiBaseURL, "https://example.test")
    }

    func testApiBaseURLFallsBackToDefaultWhenOverrideBlank() {
        UserDefaults.standard.set("   ", forKey: overrideKey)

        XCTAssertEqual(AppConfig.apiBaseURL, "https://web-production-dfcf8.up.railway.app")
    }
}
