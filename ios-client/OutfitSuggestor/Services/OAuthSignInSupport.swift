//
//  OAuthSignInSupport.swift
//  OutfitSuggestor
//
//  Google/Apple sign-in helpers and provider seams for OAuth auth.
//

import AuthenticationServices
import Foundation
import GoogleSignIn
import UIKit

enum OAuthCopy {
    static let googleButtonTitle = "Continue with Google"
    static let appleButtonTitle = "Continue with Apple"
    static let dividerTitle = "or"
}

enum OAuthSignInError: LocalizedError, Equatable {
    case missingIdentityToken
    case googleSignInNotConfigured
    case missingPresenter

    var errorDescription: String? {
        switch self {
        case .missingIdentityToken:
            return "Sign-in did not return an identity token. Try again."
        case .googleSignInNotConfigured:
            return "Google Sign-In is not configured. Set GOOGLE_IOS_CLIENT_ID in OAuth.xcconfig (and backend GOOGLE_CLIENT_IDS), or sign in with email or Apple."
        case .missingPresenter:
            return "Unable to present Google Sign-In. Try again from the login screen."
        }
    }
}

// MARK: - Google

protocol GoogleSignInProviding {
    func fetchIDToken() async throws -> String
}

@MainActor
final class GoogleSignInProvider: GoogleSignInProviding {
    func fetchIDToken() async throws -> String {
        guard AppConfig.isGoogleSignInConfigured else {
            throw OAuthSignInError.googleSignInNotConfigured
        }

        let configuration = GIDConfiguration(
            clientID: AppConfig.googleClientID,
            serverClientID: AppConfig.googleServerClientID
        )
        GIDSignIn.sharedInstance.configuration = configuration

        guard let presenter = Self.topViewController() else {
            throw OAuthSignInError.missingPresenter
        }

        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
        guard let idToken = result.user.idToken?.tokenString, !idToken.isEmpty else {
            throw OAuthSignInError.missingIdentityToken
        }
        return idToken
    }

    private static func topViewController(
        base: UIViewController? = nil
    ) -> UIViewController? {
        let root: UIViewController? = {
            if let base { return base }
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            for scene in scenes {
                if let root = scene.windows.first(where: \.isKeyWindow)?.rootViewController {
                    return root
                }
            }
            return scenes.first?.windows.first?.rootViewController
        }()

        if let nav = root as? UINavigationController {
            return topViewController(base: nav.visibleViewController)
        }
        if let tab = root as? UITabBarController {
            return topViewController(base: tab.selectedViewController)
        }
        if let presented = root?.presentedViewController {
            return topViewController(base: presented)
        }
        return root
    }
}

// MARK: - Apple

protocol AppleSignInProviding {
    func fetchIDToken() async throws -> String
}

@MainActor
final class AppleSignInCoordinator: NSObject, AppleSignInProviding, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var continuation: CheckedContinuation<String, Error>?

    func fetchIDToken() async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.fullName, .email]
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        defer { continuation = nil }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8) else {
            continuation?.resume(throwing: OAuthSignInError.missingIdentityToken)
            return
        }
        continuation?.resume(returning: idToken)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        defer { continuation = nil }
        continuation?.resume(throwing: error)
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        for scene in scenes {
            if let window = scene.windows.first(where: \.isKeyWindow) {
                return window
            }
        }
        if let window = scenes.first?.windows.first {
            return window
        }
        return ASPresentationAnchor()
    }
}
