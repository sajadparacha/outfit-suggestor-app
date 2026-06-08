//
//  AdminVisibility.swift
//  OutfitSuggestor
//
//  Pure helpers for admin-only UI gating (testable, defense in depth).
//

import Foundation

enum AdminVisibility {
    static func isAdmin(user: User?) -> Bool {
        user?.is_admin == true
    }

    static func shouldShowSettingsAdminSection(for user: User?) -> Bool {
        isAdmin(user: user)
    }

    /// Combines admin role with user toggle — never show prompt/response panels to non-admins.
    static func effectiveShowAiPromptResponse(isAdmin: Bool, toggleEnabled: Bool) -> Bool {
        isAdmin && toggleEnabled
    }

    static func guideIncludesModelImagesSection(isAdmin: Bool) -> Bool {
        isAdmin
    }

    static func guideIncludesReportsNavRow(isAdmin: Bool) -> Bool {
        isAdmin
    }

    static func aboutIncludesAdminDiagnostics(isAdmin: Bool) -> Bool {
        isAdmin
    }
}

enum GuideCopy {
    static let adminShowAiPromptTip =
        "Toggle Show AI prompt & response in Advanced options to peek at technical details on outfit suggestions."
    static let adminDiagnosticsTip =
        "Premium analysis runs can include mode used, cost, full AI prompt, and full AI response in Admin diagnostics."
    static let reportsNavDescription = "Admins only—usage and access insights."
}

enum AboutCopy {
    static let generalTechStack =
        "Built with React (web), SwiftUI (iOS), FastAPI, OpenAI GPT-4 Vision, and more."
    static let adminDiagnosticsSuffix = " Includes transparent admin diagnostics for administrators."

    static func techStackDescription(isAdmin: Bool) -> String {
        isAdmin ? generalTechStack + adminDiagnosticsSuffix : generalTechStack
    }
}
