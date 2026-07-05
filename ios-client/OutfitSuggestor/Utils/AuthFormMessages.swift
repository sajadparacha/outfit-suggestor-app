//
//  AuthFormMessages.swift
//  OutfitSuggestor
//

import Foundation

enum AuthFormMessages {
    static func loginErrorDescription(_ error: Error) -> String {
        if let authError = error as? AuthError {
            switch authError {
            case .serverError(let message):
#if DEBUG
                if message.localizedCaseInsensitiveContains("incorrect email or password") {
                    return """
                    \(message)

                    This debug build uses your local database (\(AppConfig.apiBaseURL)). \
                    Sign up to create a local account, or use credentials that exist in your local backend—not your production/Railway login.
                    """
                }
#endif
                return message
            default:
                return authError.localizedDescription
            }
        }

        if let urlError = error as? URLError {
            switch urlError.code {
            case .cannotConnectToHost, .networkConnectionLost, .notConnectedToInternet:
                return "Can't reach the API at \(AppConfig.apiBaseURL). Start the backend on port 8001, then try again."
            default:
                break
            }
        }

        return error.localizedDescription
    }
}
