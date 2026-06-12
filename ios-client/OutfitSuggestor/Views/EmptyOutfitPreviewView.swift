//
//  EmptyOutfitPreviewView.swift
//  OutfitSuggestor
//
//  Placeholder panel shown before the first outfit result loads.
//

import SwiftUI

struct EmptyOutfitPreviewView: View {
    private var flatlayGradient: LinearGradient {
        LinearGradient(
            colors: [
                Color(red: 0.12, green: 0.16, blue: 0.23),
                Color(red: 0.06, green: 0.09, blue: 0.16),
                Color(red: 0.19, green: 0.18, blue: 0.51),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                flatlayGradient
                AppTheme.accentGradientVertical
                    .opacity(0.3)

                VStack(spacing: 20) {
                    HStack(spacing: 16) {
                        Text("👔")
                            .font(.system(size: 44))
                            .accessibilityLabel("Shirt")
                        Text("👞")
                            .font(.system(size: 36))
                            .accessibilityLabel("Shoes")
                        Text("🧥")
                            .font(.system(size: 36))
                            .accessibilityLabel("Jacket")
                        Text("👖")
                            .font(.system(size: 36))
                            .accessibilityLabel("Jeans")
                    }

                    VStack(spacing: 6) {
                        Text(MainFlowUxCopy.emptyPreviewHeadline)
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(AppTheme.textPrimary)
                            .multilineTextAlignment(.center)
                        Text(MainFlowUxCopy.emptyPreviewSubline)
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, 12)
                }
                .padding(.vertical, 32)
                .padding(.horizontal, 16)
            }
            .frame(minHeight: 280)
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .padding(.horizontal)
        .accessibilityIdentifier("main.emptyOutfitPreview")
    }
}
