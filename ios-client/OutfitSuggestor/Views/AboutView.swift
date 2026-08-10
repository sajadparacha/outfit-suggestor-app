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
                    Text(AboutCopy.insightsFeature)
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
