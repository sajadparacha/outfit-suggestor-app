//
//  HeroView.swift
//  OutfitSuggestor
//
//  Hero section view
//

import SwiftUI

struct HeroView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 50))
                .foregroundColor(.blue)
            
            Text("AI-Powered Style Assistant")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("Upload a photo of your clothing and get complete outfit suggestions")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .padding(.vertical, 30)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color.blue.opacity(0.1), Color.purple.opacity(0.1)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .padding(.horizontal)
    }
}

struct HeroView_Previews: PreviewProvider {
    static var previews: some View {
        HeroView()
    }
}

