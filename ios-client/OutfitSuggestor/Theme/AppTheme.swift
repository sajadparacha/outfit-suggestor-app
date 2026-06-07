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

    // Blue-purple gradient accents (#4facfe → #c471ed)
    static let gradientStart = Color(red: 0.31, green: 0.67, blue: 0.996) // #4facfe
    static let gradientEnd = Color(red: 0.77, green: 0.44, blue: 0.93)    // #c471ed
    static let accent = gradientStart
    static let accentSoft = gradientStart.opacity(0.18)

    static var accentGradient: LinearGradient {
        LinearGradient(
            colors: [gradientStart, gradientEnd],
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    static var accentGradientVertical: LinearGradient {
        LinearGradient(
            colors: [gradientStart, gradientEnd],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
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

struct AdaptiveContentWidthModifier: ViewModifier {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    let regularMaxWidth: CGFloat

    private var resolvedMaxWidth: CGFloat {
        horizontalSizeClass == .regular ? regularMaxWidth : .infinity
    }

    func body(content: Content) -> some View {
        content
            .frame(maxWidth: resolvedMaxWidth, alignment: .center)
            .frame(maxWidth: .infinity, alignment: .center)
    }
}

struct GradientButtonStyle: ButtonStyle {
    var isEnabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                Group {
                    if isEnabled {
                        AppTheme.accentGradient
                    } else {
                        Color.gray.opacity(0.45)
                    }
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .opacity(configuration.isPressed ? 0.88 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct GradientText: View {
    let text: String
    var font: Font = .body

    var body: some View {
        Text(text)
            .font(font)
            .foregroundColor(.clear)
            .overlay(
                AppTheme.accentGradient
                    .mask(Text(text).font(font))
            )
    }
}

extension View {
    func glassCard() -> some View {
        modifier(GlassCardModifier())
    }

    func adaptiveContent(maxWidth regularMaxWidth: CGFloat = 980) -> some View {
        modifier(AdaptiveContentWidthModifier(regularMaxWidth: regularMaxWidth))
    }

    func gradientForeground() -> some View {
        foregroundColor(.clear)
            .overlay(AppTheme.accentGradient.mask(self))
    }
}
