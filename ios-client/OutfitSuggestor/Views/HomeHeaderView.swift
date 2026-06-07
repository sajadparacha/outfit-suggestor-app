//
//  HomeHeaderView.swift
//  OutfitSuggestor
//

import SwiftUI

struct HomeHeaderView: View {
    var onProfileTap: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "sparkles")
                    .font(.title3.weight(.semibold))
                    .foregroundColor(AppTheme.gradientStart)
                Text("Outfit Suggestor")
                    .font(.headline.weight(.bold))
                    .foregroundColor(AppTheme.textPrimary)
            }

            Spacer()

            Button(action: onProfileTap) {
                Image(systemName: "person.crop.circle")
                    .font(.title2)
                    .foregroundColor(AppTheme.textPrimary)
                    .frame(width: 40, height: 40)
                    .background(AppTheme.surface)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(AppTheme.border, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("home.profileButton")
        }
        .padding(.horizontal)
        .padding(.top, 4)
    }
}
