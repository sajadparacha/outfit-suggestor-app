//
//  WardrobeInsightResult.swift
//  OutfitSuggestor
//
//  Normalized wardrobe insights model (parity with web WardrobeInsightResult).
//

import Foundation

enum WardrobeScoreLabel: String, Codable, CaseIterable {
    case weak = "Weak"
    case fair = "Fair"
    case good = "Good"
    case strong = "Strong"
}

enum WardrobeCoverageStatus: String, Codable, CaseIterable {
    case good = "Good"
    case medium = "Medium"
    case weak = "Weak"
    case missing = "Missing"
    case needsNeutrals = "Needs neutrals"
    case tooCasual = "Too casual"
}

struct WardrobeInsightContext: Equatable {
    let occasion: String
    let season: String
    let style: String
}

struct WardrobeInsightScore: Equatable {
    let value: Int
    let label: WardrobeScoreLabel
    let summary: String
}

struct WardrobeInsightPriority: Identifiable, Equatable {
    let id: String
    let rank: Int
    let name: String
    let category: String
    let priority: String
}

struct WardrobeInsightMissingItem: Identifiable, Equatable {
    let id: String
    let name: String
    let category: String
    let priority: String
    let reason: String
    let bestColors: [String]
    let worksWith: [String]
}

struct WardrobeInsightCategoryHealth: Identifiable, Equatable {
    let id: String
    let category: String
    let status: WardrobeCoverageStatus
    let summary: String
    let details: String
    let ownedColors: [String]
    let ownedStyles: [String]
    let missingColors: [String]
    let missingStyles: [String]
    let recommendedStep: String
}

struct WardrobeInsightDiagnostics: Equatable {
    let missingCategories: [String]
    let colorsToAdd: [String]
    let stylesToTry: [String]
}

struct WardrobeInsightAdminData: Equatable {
    let aiPrompt: String?
    let aiRawResponse: String?
    let cost: WardrobeGapAnalysisCost?
}

struct WardrobeInsightResult: Equatable {
    let context: WardrobeInsightContext
    let score: WardrobeInsightScore
    let topPriorities: [WardrobeInsightPriority]
    let missingItems: [WardrobeInsightMissingItem]
    let categoryHealth: [WardrobeInsightCategoryHealth]
    let diagnostics: WardrobeInsightDiagnostics?
    let admin: WardrobeInsightAdminData?
}
