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
                Text(AboutCopy.tagline)
                    .font(.headline)
                    .foregroundColor(.secondary)
                Text(AboutCopy.threeRingsStory)
                    .padding(.vertical, 4)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Features")
                        .font(.headline)
                    Text(AboutCopy.outfitSuggestionsFeature)
                    Text(AboutCopy.wardrobeFeature)
                    Text(AboutCopy.historyFeature)
                    Text(aboutInsightsFeature)
                    Text(InsightsCopy.aboutStylesCatalogNote)
                    Text(AboutCopy.weekPlannerFeature)
                    Text(AboutCopy.accountFeature)
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
                Text(AboutCopy.guideLocationNote)
                    .font(.caption)
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

private let aboutInsightsFeature =
    "• Insights — gap analysis from your lifestyle mix and dress code, coverage dashboard, and a shopping list of every category that still has a gap (including empty ones), with colors and styles to buy—not one starter SKU. Insights preferences can include multiple dress codes, climates, styles, and accents. Styles come from a wardrobe catalog; AI ranks which missing tags to buy next."

