//
//  AppConfig.swift
//  OutfitSuggestor
//
//  Centralized app configuration values.
//

import Foundation

enum AppConfig {
    private static let defaultAPIBaseURL = "https://web-production-dfcf8.up.railway.app"
    private static let userDefaultsAPIKey = "api_base_url_override"
    private static let defaultEnableAdminTestRunner = false

    static var apiBaseURL: String {
        if let override = UserDefaults.standard.string(forKey: userDefaultsAPIKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines),
           !override.isEmpty {
            return override
        }

        if let plistValue = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String {
            let trimmed = plistValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                return trimmed
            }
        }

        return defaultAPIBaseURL
    }

    static var enableAdminTestRunner: Bool {
        if let value = Bundle.main.object(forInfoDictionaryKey: "ENABLE_ADMIN_TEST_RUNNER") as? Bool {
            return value
        }
#if DEBUG
        return true
#else
        return defaultEnableAdminTestRunner
#endif
    }
}
