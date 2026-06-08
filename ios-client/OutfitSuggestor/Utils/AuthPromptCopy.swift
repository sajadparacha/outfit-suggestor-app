//
//  AuthPromptCopy.swift
//  OutfitSuggestor
//
//  Contextual persuasive copy for guest authentication prompts.
//  Mirrors frontend/src/utils/authPromptCopy.ts verbatim.
//

import Foundation

enum AuthPromptContext: String, CaseIterable {
    case firstOutfit = "first-outfit"
    case like
    case history
    case wardrobe
    case insights
    case settings
}

struct AuthPromptContent {
    let headline: String
    let subheadline: String?
    let primaryCTA: String
}

enum AuthPromptCopy {
    static let defaultLoginTitle = "Sign in to your account"

    static func content(for context: AuthPromptContext) -> AuthPromptContent {
        switch context {
        case .firstOutfit:
            return AuthPromptContent(
                headline: "Save this outfit and build your wardrobe.",
                subheadline: "Create a free account to keep every look you love.",
                primaryCTA: "Create account"
            )
        case .like:
            return AuthPromptContent(
                headline: "Sign in to save favorites.",
                subheadline: "Your liked outfits stay with you across devices.",
                primaryCTA: "Sign in"
            )
        case .history:
            return AuthPromptContent(
                headline: "Create an account to keep your outfit history.",
                subheadline: "Every suggestion you generate will be saved automatically.",
                primaryCTA: "Create account"
            )
        case .wardrobe:
            return AuthPromptContent(
                headline: "Upload your clothes once and get unlimited combinations.",
                subheadline: "Build a digital closet and get wardrobe-aware suggestions.",
                primaryCTA: "Create account"
            )
        case .insights:
            return AuthPromptContent(
                headline: "See what your wardrobe is missing.",
                subheadline: "Sign in to run gap analysis on your saved items.",
                primaryCTA: "Sign in"
            )
        case .settings:
            return AuthPromptContent(
                headline: "Manage your account and preferences.",
                subheadline: "Sign in to sync wardrobe, history, and settings.",
                primaryCTA: "Sign in"
            )
        }
    }

    static func prefersRegister(for context: AuthPromptContext) -> Bool {
        switch context {
        case .firstOutfit, .history, .wardrobe:
            return true
        case .like, .insights, .settings:
            return false
        }
    }
}
