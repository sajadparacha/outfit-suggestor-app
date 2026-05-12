//
//  UserGuideView.swift
//  OutfitSuggestor
//
//  In-app user guide matching the web application's UserGuide component
//

import SwiftUI

struct UserGuideView: View {
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
                        "Optionally set your occasion, season, and style preferences using the pickers.",
                        "Add any free-text notes about your preferences.",
                        "Tap \"Get Outfit Suggestion\" to receive AI-powered recommendations.",
                        "View the complete outfit (shirt, trousers, blazer, shoes, belt) and the AI's reasoning."
                    ],
                    tip: "Upload any clothing item — shirts, blazers, shoes, or even partial outfits. The AI adapts to what you provide."
                )
                
                GuideSection(
                    icon: "arrow.right.circle",
                    title: "Getting Alternate Outfits",
                    color: .purple,
                    steps: [
                        "After receiving a suggestion, tap \"Next Outfit\" below the result.",
                        "The AI will suggest a completely different outfit for the same photo.",
                        "Repeat as many times as you like for fresh ideas."
                    ],
                    tip: "Each \"Next\" request tells the AI to avoid repeating the previous suggestion."
                )
                
                GuideSection(
                    icon: "tshirt",
                    title: "Managing Your Wardrobe",
                    color: .blue,
                    steps: [
                        "Go to the Wardrobe tab to view your saved clothing items.",
                        "Tap \"+\" to add a new item — upload a photo and the AI will analyze it.",
                        "Use category filters or search to find specific items.",
                        "Swipe left on an item to delete, or tap to edit.",
                        "Tap \"Get suggestion\" on any item to build an outfit around it."
                    ],
                    tip: "The app automatically detects duplicate items before adding them to prevent clutter."
                )
                
                GuideSection(
                    icon: "switch.2",
                    title: "Wardrobe-Only Mode",
                    color: .orange,
                    steps: [
                        "Enable \"Use wardrobe only\" toggle in the suggestion screen.",
                        "The AI will only suggest items from your existing wardrobe.",
                        "Great for deciding what to wear from what you already own."
                    ],
                    tip: nil
                )
                
                GuideSection(
                    icon: "dice",
                    title: "Random Picks",
                    color: .pink,
                    steps: [
                        "\"Random from Wardrobe\" — The AI picks items from your wardrobe to build a complete outfit.",
                        "\"Random from History\" — Shows a random past suggestion for quick inspiration.",
                        "Both options respect your current occasion, season, and style filters."
                    ],
                    tip: nil
                )
                
                GuideSection(
                    icon: "photo.artframe",
                    title: "AI Model Images",
                    color: .indigo,
                    steps: [
                        "Enable \"Generate model image\" before requesting a suggestion.",
                        "Choose your preferred AI model (DALL-E 3, Stable Diffusion, or Nano Banana).",
                        "The AI generates an image of a model wearing your recommended outfit.",
                        "Tap the generated image for a full-screen view.",
                        "Your location is used (with permission) to customize the model's appearance."
                    ],
                    tip: "Model image generation takes 10–30 seconds. Be patient!"
                )
                
                GuideSection(
                    icon: "chart.bar.xaxis",
                    title: "Wardrobe Insights",
                    color: .teal,
                    steps: [
                        "Go to the Insights tab to analyze gaps in your wardrobe.",
                        "Set your context (occasion, season, style) and tap \"Analyze\".",
                        "View owned vs. missing colors and styles per category.",
                        "See personalized shopping recommendations for what to buy next."
                    ],
                    tip: "Use \"Premium\" mode for ChatGPT-powered analysis with deeper insights."
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
