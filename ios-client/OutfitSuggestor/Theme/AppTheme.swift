//
//  AppTheme.swift
//  OutfitSuggestor
//
//  Shared visual tokens to align iOS with web app styling.
//

import SwiftUI

enum AppTheme {
    static let bgPrimary = Color(red: 0.04, green: 0.06, blue: 0.10)   // slate-950-ish
    static let bgSecondary = Color(red: 0.07, green: 0.10, blue: 0.16) // slate-900-ish
    static let surface = Color.white.opacity(0.06)
    static let border = Color.white.opacity(0.12)
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.72)
    static let accent = Color(red: 0.00, green: 0.70, blue: 0.64)      // #00B3A4-ish
    static let accentSoft = Color(red: 0.00, green: 0.70, blue: 0.64).opacity(0.18)
}

struct GlassCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(AppTheme.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(AppTheme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

extension View {
    func glassCard() -> some View {
        modifier(GlassCardModifier())
    }
}
