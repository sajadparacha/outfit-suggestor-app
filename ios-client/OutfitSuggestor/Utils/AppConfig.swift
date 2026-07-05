//
//  AppConfig.swift
//  OutfitSuggestor
//
//  Centralized app configuration values.
//

import Foundation
import Combine

enum AppConfig {
    /// Local backend when developing on simulator/Mac (parity with `frontend/.env.development`).
    static let localAPIBaseURL = "http://localhost:8001"
    /// Production Railway backend for Release builds and deployed web (`frontend/.env.production`).
    static let productionAPIBaseURL = "https://web-production-dfcf8.up.railway.app"

    private static let userDefaultsAPIKey = "api_base_url_override"
    private static let defaultEnableAdminTestRunner = false
    private static let uiTestFlag = "UI_TEST_MODE"

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

#if DEBUG
        return localAPIBaseURL
#else
        return productionAPIBaseURL
#endif
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

    static var isUITestMode: Bool {
        let processInfo = ProcessInfo.processInfo
        return processInfo.arguments.contains(uiTestFlag) || processInfo.environment[uiTestFlag] == "1"
    }
}

@MainActor
final class AppRequestActivity: ObservableObject {
    static let shared = AppRequestActivity()

    @Published private(set) var inFlightCount = 0

    var isBusy: Bool { inFlightCount > 0 }

    func begin() {
        inFlightCount += 1
    }

    func end() {
        inFlightCount = max(0, inFlightCount - 1)
    }
}
