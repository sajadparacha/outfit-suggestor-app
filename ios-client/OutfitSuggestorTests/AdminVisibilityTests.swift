import XCTest
@testable import OutfitSuggestor

final class AdminVisibilityTests: XCTestCase {
    // MARK: - Admin flag helpers

    func testIsAdminReturnsFalseForNilUser() {
        XCTAssertFalse(AdminVisibility.isAdmin(user: nil))
    }

    func testIsAdminReturnsFalseWhenFlagMissingOrFalse() {
        XCTAssertFalse(AdminVisibility.isAdmin(user: makeUser(isAdmin: false)))
        XCTAssertFalse(AdminVisibility.isAdmin(user: makeUser(isAdmin: nil)))
    }

    func testIsAdminReturnsTrueForAdminUser() {
        XCTAssertTrue(AdminVisibility.isAdmin(user: makeUser(isAdmin: true)))
    }

    func testShouldShowSettingsAdminSectionMatchesIsAdmin() {
        XCTAssertFalse(AdminVisibility.shouldShowSettingsAdminSection(for: makeUser(isAdmin: false)))
        XCTAssertTrue(AdminVisibility.shouldShowSettingsAdminSection(for: makeUser(isAdmin: true)))
    }

    func testEffectiveShowAiPromptResponseRequiresAdminAndToggle() {
        XCTAssertFalse(AdminVisibility.effectiveShowAiPromptResponse(isAdmin: false, toggleEnabled: true))
        XCTAssertFalse(AdminVisibility.effectiveShowAiPromptResponse(isAdmin: false, toggleEnabled: false))
        XCTAssertFalse(AdminVisibility.effectiveShowAiPromptResponse(isAdmin: true, toggleEnabled: false))
        XCTAssertTrue(AdminVisibility.effectiveShowAiPromptResponse(isAdmin: true, toggleEnabled: true))
    }

    // MARK: - Guide / About copy gating

    func testGuideHidesAdminSectionsForNonAdmin() {
        XCTAssertFalse(AdminVisibility.guideIncludesModelImagesSection(isAdmin: false))
        XCTAssertFalse(AdminVisibility.guideIncludesReportsNavRow(isAdmin: false))
    }

    func testGuideShowsAdminSectionsForAdmin() {
        XCTAssertTrue(AdminVisibility.guideIncludesModelImagesSection(isAdmin: true))
        XCTAssertTrue(AdminVisibility.guideIncludesReportsNavRow(isAdmin: true))
    }

    func testAboutOmitsAdminDiagnosticsForNonAdmin() {
        let description = AboutCopy.techStackDescription(isAdmin: false)
        XCTAssertFalse(description.localizedCaseInsensitiveContains("admin diagnostics"))
        XCTAssertEqual(description, AboutCopy.generalTechStack)
    }

    func testAboutIncludesAdminDiagnosticsForAdmin() {
        let description = AboutCopy.techStackDescription(isAdmin: true)
        XCTAssertTrue(description.localizedCaseInsensitiveContains("admin diagnostics"))
    }

    func testGuideCopyContainsAdminOnlyStrings() {
        XCTAssertTrue(GuideCopy.adminShowAiPromptTip.contains("Show AI prompt"))
        XCTAssertTrue(GuideCopy.adminDiagnosticsTip.contains("Admin diagnostics"))
        XCTAssertTrue(GuideCopy.reportsNavDescription.contains("Admins only"))
    }

    func testGuideAndAboutCopyMentionWardrobeCompletion() {
        XCTAssertTrue(GuideCopy.wardrobeMultiSelectStep.contains("Select items"))
        XCTAssertTrue(GuideCopy.wardrobeMultiSelectStep.contains("Complete outfit with AI"))
        XCTAssertTrue(AboutCopy.wardrobeCompletionFeature.contains("complete outfits"))
        XCTAssertTrue(AboutCopy.wardrobeCompletionFeature.contains("selected wardrobe pieces"))
    }

    // MARK: - Settings admin section visibility pattern
    //
    // SettingsView gates the Admin section with:
    //   AdminVisibility.shouldShowSettingsAdminSection(for: auth.currentUser)
    // Reports link uses accessibilityIdentifier "profile.reportsLink" (admin only).

    private func makeUser(isAdmin: Bool?) -> User {
        User(
            id: 1,
            email: "test@example.com",
            full_name: "Tester",
            is_active: true,
            is_admin: isAdmin,
            email_verified: true,
            created_at: "2026-01-01T00:00:00Z"
        )
    }
}
