//
//  HeroView.swift
//  OutfitSuggestor
//
//  Hero section view
//

import SwiftUI

struct HeroView: View {
    var body: some View {
        VStack(spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .foregroundColor(AppTheme.accent)
                Text("Premium AI Stylist")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.accent)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(AppTheme.accentSoft)
            .clipShape(Capsule())

            Text("Style Better,\nWith Context")
                .font(.system(size: 30, weight: .bold))
                .multilineTextAlignment(.center)
                .foregroundColor(AppTheme.textPrimary)

            Text("Upload a photo and get complete outfit suggestions with reasoning, history, and wardrobe-aware matches.")
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            HStack(spacing: 8) {
                heroChip("Smart Matching")
                heroChip("History")
                heroChip("Insights")
            }
        }
        .padding(.vertical, 24)
        .frame(maxWidth: .infinity)
        .background(
            ZStack {
                LinearGradient(
                    colors: [AppTheme.bgSecondary, AppTheme.bgPrimary],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                Circle()
                    .fill(AppTheme.accent.opacity(0.24))
                    .frame(width: 140, height: 140)
                    .blur(radius: 26)
                    .offset(x: -90, y: -70)
                Circle()
                    .fill(Color.cyan.opacity(0.18))
                    .frame(width: 120, height: 120)
                    .blur(radius: 24)
                    .offset(x: 120, y: -40)
            }
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .cornerRadius(16)
        .padding(.horizontal)
    }

    private func heroChip(_ text: String) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .foregroundColor(AppTheme.textSecondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color.white.opacity(0.08))
            .clipShape(Capsule())
    }
}

struct HeroView_Previews: PreviewProvider {
    static var previews: some View {
        HeroView()
    }
}

