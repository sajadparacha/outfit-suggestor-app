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
    case week
    case settings
    case guestLimit = "guest-limit"
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
        case .week:
            return AuthPromptContent(
                headline: "Plan outfits for your whole week.",
                subheadline: "Sign in to enable days, generate looks, and get morning reminders.",
                primaryCTA: "Sign in"
            )
        case .settings:
            return AuthPromptContent(
                headline: "Manage your account and preferences.",
                subheadline: "Sign in to sync wardrobe, history, and settings.",
                primaryCTA: "Sign in"
            )
        case .guestLimit:
            return AuthPromptContent(
                headline: "You've used your 3 free AI outfit suggestions. Create an account to keep using the app.",
                subheadline: nil,
                primaryCTA: "Create account"
            )
        }
    }

    static func prefersRegister(for context: AuthPromptContext) -> Bool {
        switch context {
        case .firstOutfit, .history, .wardrobe, .guestLimit:
            return true
        case .like, .insights, .week, .settings:
            return false
        }
    }
}
