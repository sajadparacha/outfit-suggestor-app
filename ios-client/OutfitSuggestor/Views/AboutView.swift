//
//  AboutView.swift
//  OutfitSuggestor
//

import SwiftUI

struct AboutView: View {
    var isAdmin: Bool = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 16) {
                Text("AI Outfit Suggestor")
                    .font(.title.bold())
                Text("Your Personal AI Fashion Stylist")
                    .foregroundColor(.secondary)
                Text("Upload a photo of any clothing item and get outfit recommendations. When logged in, manage your wardrobe, view history, and use Random from Wardrobe or Random from History.")
                    .padding(.vertical, 8)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Features")
                        .font(.headline)
                    Text("• Wardrobe Insights — AI-powered gap analysis with a summary score, top priorities, top items to add cards, an on-demand full shopping list (View shopping list on the summary — export CSV or send to WhatsApp), coverage dashboard, and Google Shopping via color taps (not a debug report).")
                    Text("• Outfit suggestions with occasion, season, and style filters")
                    Text("• Digital wardrobe and outfit history when logged in")
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
                Text(AboutCopy.techStackDescription(isAdmin: isAdmin))
                    .font(.caption)
                    .foregroundColor(.secondary)
                Divider()
                Text("Developed by Sajjad Ahmed Paracha")
                    .font(.headline)
                Link("GitHub", destination: URL(string: "https://github.com/sajadparacha")!)
                Link("LinkedIn", destination: URL(string: "https://www.linkedin.com/in/sajjadparacha/")!)
                Spacer(minLength: 40)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .navigationTitle("About")
    }
}
