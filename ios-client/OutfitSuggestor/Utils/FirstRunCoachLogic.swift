//
//  FirstRunCoachLogic.swift
//  OutfitSuggestor
//
//  First-run coach copy and step-state helpers (testable, mirrors web spec).
//

import Foundation

enum FirstRunCoachCopy {
    static let storageKeyDismissed = "first_run_coach_dismissed"
    static let storageKeyPrefsExpanded = "first_run_prefs_expanded"

    static let collapsedPreferencesLabel = "Occasion, season, style (optional)"
    static let expandButton = "Expand"
    static let emptyPreviewHeadline = "Your outfit appears here"
    static let emptyPreviewSubline = "Upload a photo, set preferences, then tap Generate Outfit"
    static let readyToGenerateHint = "Ready — tap Generate Outfit"

    enum Step: Int, CaseIterable {
        case upload = 1
        case generate = 2
        case explore = 3

        var title: String {
            switch self {
            case .upload: return "Upload"
            case .generate: return "Generate"
            case .explore: return "Explore"
            }
        }

        var subtitle: String {
            switch self {
            case .upload: return "Add any clothing photo"
            case .generate: return "AI builds a full outfit"
            case .explore: return "Try another look or save"
            }
        }

        var accessibilityIdentifier: String {
            "main.firstRunCoach.step\(rawValue)"
        }
    }
}

enum FirstRunCoachLogic {
    static func shouldShowCoach(dismissed: Bool) -> Bool {
        !dismissed
    }

    static func shouldCollapsePreferences(coachDismissed: Bool, prefsExpanded: Bool) -> Bool {
        !coachDismissed && !prefsExpanded
    }

    static func activeStep(hasImage: Bool, hasSuggestion: Bool) -> FirstRunCoachCopy.Step {
        if hasSuggestion { return .explore }
        if hasImage { return .generate }
        return .upload
    }

    static func isStepCompleted(_ step: FirstRunCoachCopy.Step, hasImage: Bool, hasSuggestion: Bool) -> Bool {
        switch step {
        case .upload:
            return hasImage
        case .generate:
            return hasSuggestion
        case .explore:
            return false
        }
    }
}
