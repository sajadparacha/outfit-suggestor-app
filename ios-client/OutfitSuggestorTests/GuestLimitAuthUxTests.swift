import XCTest
@testable import OutfitSuggestor

final class GuestLimitAuthUxTests: XCTestCase {
    private var savedToken: String?
    private var savedUser: User?

    override func setUp() {
        super.setUp()
        savedToken = AuthService.shared.authToken
        savedUser = AuthService.shared.currentUser
        // isGuestBlocked short-circuits when authenticated; force a guest session.
        AuthService.shared.authToken = nil
        AuthService.shared.currentUser = nil
    }

    override func tearDown() {
        AuthService.shared.authToken = savedToken
        AuthService.shared.currentUser = savedUser
        super.tearDown()
    }

    // MARK: - AuthPromptCopy parity with web authPromptCopy.ts

    func testGuestLimitCopyMatchesWebSpec() {
        let copy = AuthPromptCopy.content(for: .guestLimit)
        XCTAssertEqual(
            copy.headline,
            "You've used your 3 free AI outfit suggestions. Create an account to keep using the app."
        )
        XCTAssertNil(copy.subheadline)
        XCTAssertEqual(copy.primaryCTA, "Create account")
    }

    func testGuestLimitPrefersRegister() {
        XCTAssertTrue(AuthPromptCopy.prefersRegister(for: .guestLimit))
    }

    // MARK: - MainFlow guest-limit gate

    func testShowsGuestLimitGateForBlockedGuest() {
        XCTAssertTrue(
            MainFlowGuestLimitLogic.showsGuestLimitGate(
                isAuthenticated: false,
                isGuestBlocked: true
            )
        )
    }

    func testHidesGuestLimitGateForAuthenticatedUser() {
        XCTAssertFalse(
            MainFlowGuestLimitLogic.showsGuestLimitGate(
                isAuthenticated: true,
                isGuestBlocked: true
            )
        )
    }

    func testHidesGuestLimitGateWhenGuestNotBlocked() {
        XCTAssertFalse(
            MainFlowGuestLimitLogic.showsGuestLimitGate(
                isAuthenticated: false,
                isGuestBlocked: false
            )
        )
    }

    // MARK: - OutfitViewModel guest blocked

    @MainActor
    func testIsGuestBlockedWhenRequiresSignup() {
        let viewModel = OutfitViewModel()
        viewModel.guestRequiresSignup = true
        XCTAssertTrue(viewModel.isGuestBlocked)
    }

    @MainActor
    func testIsGuestBlockedWhenRemainingIsZero() {
        let viewModel = OutfitViewModel()
        viewModel.guestRemaining = 0
        XCTAssertTrue(viewModel.isGuestBlocked)
    }
}
