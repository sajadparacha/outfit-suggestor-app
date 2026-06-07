//
//  HeroView.swift
//  OutfitSuggestor
//
//  Hero section view
//

import SwiftUI

struct HeroView: View {
    private let headlineFont = Font.system(size: 32, weight: .bold)

    var body: some View {
        VStack(spacing: 14) {
            VStack(spacing: 0) {
                Text("Dress Better.")
                    .font(headlineFont)
                    .foregroundColor(AppTheme.textPrimary)
                GradientText(text: "Every Day.", font: headlineFont)
            }
            .multilineTextAlignment(.center)

            Text("Upload a clothing item and get complete outfit suggestions tailored to you.")
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
        }
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity)
    }
}

struct HeroView_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            AppTheme.bgPrimary.ignoresSafeArea()
            HeroView()
        }
    }
}
