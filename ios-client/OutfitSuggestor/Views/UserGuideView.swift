//
//  UserGuideView.swift
//  OutfitSuggestor
//
//  In-app user guide matching the web application's UserGuide component
//

import SwiftUI

struct UserGuideView: View {
    var isAdmin: Bool = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Hero
                VStack(spacing: 8) {
                    Image(systemName: "book.fill")
                        .font(.largeTitle)
                        .foregroundColor(.indigo)
                    Text("User Guide")
                        .font(.title)
                        .fontWeight(.bold)
                    Text("Learn how to get the most out of AI Outfit Suggestor")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding()
                
                GuideSection(
                    icon: "sparkles",
                    title: "Getting Outfit Suggestions",
                    color: .teal,
                    steps: [
                        "Tap the photo area or the camera icon to upload a clothing image.",
                        "Optionally set your occasion, season, and style preferences using the pickers. In summer, suggestions lean lighter and skip heavy coats or wool blazers unless you ask for them.",
                        "Add any free-text notes about your preferences.",
                        "Tap \"Get Outfit Suggestion\" to receive AI-powered recommendations.",
                        "View the five core pieces (shirt, trousers, blazer, shoes, belt). Blazer is your structured layer; jackets and coats are separate categories and may appear as optional outerwear in Also wear when the season fits.",
                        "Read the AI's reasoning in Why this works."
                    ],
                    tip: "Upload shirts, blazers, jackets, coats, or shoes—the AI adapts to what you provide. Blazers complete structured outfits; jackets and coats are optional layering."
                )
                
                GuideSection(
                    icon: "arrow.right.circle",
                    title: "Getting Alternate Outfits",
                    color: .purple,
                    steps: [
                        "After receiving a suggestion, tap \"Generate Another Look\" below the result.",
                        "Use secondary actions to make it more formal or casual, limit picks to your wardrobe, or change occasion.",
                        "Repeat as many times as you like for fresh ideas from the same photo."
                    ],
                    tip: "Each alternate request tells the AI to avoid repeating the previous suggestion."
                )
                
                GuideSection(
                    icon: "tshirt",
                    title: "Managing Your Wardrobe",
                    color: .blue,
                    steps: [
                        "Filter chips group shirts and trousers; blazers are structured layers (not casual jackets). Jackets and coats have their own chips for outerwear.",
                        "Tap \"+\" to add a new item — upload a photo and the AI will analyze it.",
                        "Use search to find specific items by name, color, or description.",
                        "Swipe left on an item to delete, or tap to edit.",
                        GuideCopy.wardrobeSingleItemStep,
                        "Tap Select items, choose 1 to 5 pieces with one item per slot (shirt, trousers, blazer, outerwear, sweater, shoes, belt). Jackets and coats count as outerwear; sweaters have their own slot. Only one of blazer, outerwear, or sweater at a time. Expand Preferences, then tap Complete outfit with AI."
                    ],
                    tip: "Preferences on Wardrobe stay in sync with Suggest and Insights. Picking a second item in the same slot shows Choose one item per outfit slot; blazer plus jacket or sweater shows Choose only one of blazer, outerwear, or sweater."
                )
                
                GuideSection(
                    icon: "switch.2",
                    title: "Wardrobe-Only Mode",
                    color: .orange,
                    steps: [
                        GuideCopy.wardrobeOnlyModeStep,
                        "Great for deciding what to wear from what you already own.",
                        "Completing an outfit from selected wardrobe pieces always uses your saved items."
                    ],
                    tip: nil
                )
                
                GuideSection(
                    icon: "dice",
                    title: "Random Picks",
                    color: .pink,
                    steps: [
                        "\"Random from Wardrobe\" — AI combines items from your wardrobe into a complete outfit (not random database picks).",
                        "\"Random from History\" — Rotates through varied saved looks from your history for quick inspiration.",
                        "Both options respect your current occasion, season, and style filters."
                    ],
                    tip: nil
                )
                
                if AdminVisibility.guideIncludesModelImagesSection(isAdmin: isAdmin) {
                    GuideSection(
                        icon: "photo.artframe",
                        title: "AI Model Images",
                        color: .indigo,
                        steps: [
                            "Enable \"Include AI model preview\" in Advanced options before requesting a suggestion.",
                            "Choose your preferred AI model (DALL-E 3, Stable Diffusion, or Nano Banana).",
                            "The AI generates an image of a model wearing your recommended outfit.",
                            "Tap the generated image for a full-screen view.",
                            "Your location is used (with permission) to customize the model's appearance."
                        ],
                        tip: "Model image generation takes 10–30 seconds. Be patient!"
                    )
                }
                
                GuideSection(
                    icon: "chart.bar.xaxis",
                    title: "Wardrobe Insights",
                    color: .teal,
                    steps: [
                        "Open Insights from Profile to get an AI-powered wardrobe analysis.",
                        "Set occasion, season, and style, then tap Analyze My Wardrobe.",
                        "Review your gap score, top priorities, and items to add next.",
                        "Check the coverage dashboard for category health—including blazers, jackets, coats, sweaters, and ties for business or formal occasions.",
                        "Tap a category in Detailed category analysis for recommendations.",
                        "Tap a best color to search Google Shopping for that category and color.",
                        "Tap Shop similar on any item to search Google Shopping.",
                        "After results load, tap Shopping list for Buy, Look for, and Search online columns.",
                        "Tap style · color chips for focused Google Shopping searches, or Search all for the top options.",
                        "Use Copy list, Export to WhatsApp, or Export as PDF to share a numbered list with one link per item."
                    ],
                    tip: isAdmin
                        ? GuideCopy.adminDiagnosticsTip
                        : "After analysis, preferences collapse into a context bar — tap Change preferences to re-run."
                )
                
                GuideSection(
                    icon: "clock.arrow.circlepath",
                    title: "Outfit History",
                    color: .green,
                    steps: [
                        "The History tab shows all your past outfit suggestions.",
                        "Search and sort by newest or oldest.",
                        "Tap any entry to load it back into the suggestion view.",
                        "Swipe left to delete entries you no longer want."
                    ],
                    tip: nil
                )

                if isAdmin {
                    GuideSection(
                        icon: "sparkles",
                        title: "Understanding Your Results",
                        color: .purple,
                        steps: [
                            "View shirt, trousers, blazer, shoes, and belt with short descriptions.",
                            "Why this works summarizes the styling logic in friendly language.",
                            "After a result, tap Generate Another Look for a fresh outfit from the same photo."
                        ],
                        tip: GuideCopy.adminShowAiPromptTip
                    )

                    GuideSection(
                        icon: "gearshape",
                        title: "Account & Navigation",
                        color: .gray,
                        steps: [
                            "Settings — Email, name, password, and shortcuts to Insights and Guide.",
                            "Insights — Action-focused wardrobe analysis with gap score, coverage dashboard, and buy-next guidance.",
                            "Guide — Step-by-step help and tips (this page).",
                            "About — Product story, features, and creator links.",
                            "Reports — \(GuideCopy.reportsNavDescription)"
                        ],
                        tip: nil
                    )
                }
                
                Spacer(minLength: 40)
            }
            .padding()
        }
        .navigationTitle("Guide")
        .navigationBarTitleDisplayMode(.large)
    }
}

private struct GuideSection: View {
    let icon: String
    let title: String
    let color: Color
    let steps: [String]
    let tip: String?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.title3)
                Text(title)
                    .font(.headline)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(index + 1)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(color)
                            .frame(width: 20, height: 20)
                            .background(color.opacity(0.15))
                            .clipShape(Circle())
                        Text(step)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            if let tip = tip {
                HStack(alignment: .top, spacing: 8) {
                    Text("💡")
                    Text(tip)
                        .font(.caption)
                        .foregroundColor(.orange)
                }
                .padding(10)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
}
