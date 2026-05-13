// 
//  OutfitSuggestionView.swift
//  OutfitSuggestor
//
//  View to display outfit suggestion results
//

import SwiftUI
import UIKit

struct OutfitSuggestionView: View {
    let suggestion: OutfitSuggestion
    var onNext: (() -> Void)?
    var onLike: (() -> Void)?
    var onDislike: (() -> Void)?
    var onAddToWardrobe: (() -> Void)?
    var isLoading: Bool = false
    var isAdmin: Bool = false
    @State private var showModelImageFullScreen = false
    
    private var modelImageData: Data? {
        guard let b64 = suggestion.model_image else { return nil }
        return Data(base64Encoded: b64)
    }
    
    /// Shirt thumbnail: use uploaded image only when the upload matched a shirt (upload_matched_category == "shirt"); otherwise first shirt match.
    private static func thumbnailForShirt(suggestion: OutfitSuggestion) -> UIImage? {
        if suggestion.upload_matched_category == "shirt", let data = suggestion.imageData, let img = UIImage(data: data) { return img }
        return thumbnailForCategory(suggestion: suggestion, category: "shirt")
    }
    
    /// Thumbnail for a category from matching_wardrobe_items (e.g. trouser, blazer, shoes, belt).
    private static func thumbnailForCategory(suggestion: OutfitSuggestion, category: String) -> UIImage? {
        let list: [MatchingWardrobeItem]?
        switch category {
        case "shirt": list = suggestion.matching_wardrobe_items?.shirt
        case "trouser": list = suggestion.matching_wardrobe_items?.trouser
        case "blazer": list = suggestion.matching_wardrobe_items?.blazer
        case "shoes": list = suggestion.matching_wardrobe_items?.shoes
        case "belt": list = suggestion.matching_wardrobe_items?.belt
        default: list = nil
        }
        guard let b64 = list?.first?.image_data, let data = Data(base64Encoded: b64) else { return nil }
        return UIImage(data: data)
    }
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Your Perfect Outfit")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(AppTheme.textPrimary)
            
            if let data = modelImageData, let uiImage = UIImage(data: data) {
                Button(action: { showModelImageFullScreen = true }) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 220)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
                .fullScreenCover(isPresented: $showModelImageFullScreen) {
                    FullScreenImageView(image: uiImage) { showModelImageFullScreen = false }
                }
            }
            
            // Outfit items — each card gets the thumbnail for its category (shirt = upload or shirt match, trouser = trouser match, etc.)
            VStack(spacing: 12) {
                OutfitItemCard(
                    icon: "👔",
                    label: "Shirt",
                    description: suggestion.shirt,
                    thumbnailImage: Self.thumbnailForShirt(suggestion: suggestion)
                )
                OutfitItemCard(
                    icon: "👖",
                    label: "Trouser",
                    description: suggestion.trouser,
                    thumbnailImage: Self.thumbnailForCategory(suggestion: suggestion, category: "trouser")
                )
                OutfitItemCard(
                    icon: "🧥",
                    label: "Blazer",
                    description: suggestion.blazer,
                    thumbnailImage: Self.thumbnailForCategory(suggestion: suggestion, category: "blazer")
                )
                OutfitItemCard(
                    icon: "👞",
                    label: "Shoes",
                    description: suggestion.shoes,
                    thumbnailImage: Self.thumbnailForCategory(suggestion: suggestion, category: "shoes")
                )
                OutfitItemCard(
                    icon: "🪢",
                    label: "Belt",
                    description: suggestion.belt,
                    thumbnailImage: Self.thumbnailForCategory(suggestion: suggestion, category: "belt")
                )
            }
            
            // Reasoning
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "lightbulb.fill")
                        .foregroundColor(AppTheme.accent)
                    Text("Why This Outfit Works")
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)
                }
                
                Text(suggestion.reasoning)
                    .font(.body)
                    .foregroundColor(AppTheme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.accentSoft)
            .cornerRadius(12)
            
            // Action buttons: Next outfit and Add to Wardrobe
            HStack(spacing: 12) {
                if let onNext = onNext {
                    Button(action: onNext) {
                        Label("Next Outfit", systemImage: "arrow.right.circle")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.accent)
                    .disabled(isLoading)
                }
                if let onAddToWardrobe = onAddToWardrobe {
                    Button(action: onAddToWardrobe) {
                        Label("Add to Wardrobe", systemImage: "plus.circle")
                    }
                    .buttonStyle(.bordered)
                    .tint(AppTheme.accent)
                }
            }

            HStack(spacing: 12) {
                if let onLike = onLike {
                    Button(action: onLike) {
                        Label("Like Outfit", systemImage: "hand.thumbsup")
                    }
                    .buttonStyle(.bordered)
                }
                if let onDislike = onDislike {
                    Button(action: onDislike) {
                        Label("Try Variation", systemImage: "arrow.triangle.2.circlepath")
                    }
                    .buttonStyle(.bordered)
                }
            }

            if isAdmin, let cost = suggestion.cost {
                VStack(alignment: .leading, spacing: 8) {
                    Text("AI Suggestion Cost")
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)
                    Text("GPT-4 Vision: \(formatCost(cost.gpt4_cost))")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                    if let modelCost = cost.model_image_cost, modelCost > 0 {
                        Text("Model Image: \(formatCost(modelCost))")
                            .font(.subheadline)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    Text("Total: \(formatCost(cost.total_cost))")
                        .font(.headline)
                        .foregroundColor(AppTheme.accent)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(AppTheme.accentSoft)
                .cornerRadius(12)
            }

            if isAdmin {
                VStack(alignment: .leading, spacing: 12) {
                    Text("AI Prompt & Response")
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)
                    adminCodePanel(title: "Input Prompt", text: suggestion.ai_prompt ?? "Prompt details unavailable for this run.")
                    adminCodePanel(
                        title: "AI Response",
                        text: suggestion.ai_raw_response ?? """
                        {
                          "shirt": "\(suggestion.shirt)",
                          "trouser": "\(suggestion.trouser)",
                          "blazer": "\(suggestion.blazer)",
                          "shoes": "\(suggestion.shoes)",
                          "belt": "\(suggestion.belt)",
                          "reasoning": "\(suggestion.reasoning)"
                        }
                        """
                    )
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding()
        .glassCard()
    }

    private func formatCost(_ cost: Double) -> String {
        if cost < 0.01 { return String(format: "$%.4f", cost) }
        if cost < 0.1 { return String(format: "$%.3f", cost) }
        return String(format: "$%.2f", cost)
    }

    @ViewBuilder
    private func adminCodePanel(title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
            ScrollView(.vertical, showsIndicators: true) {
                Text(text)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundColor(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(minHeight: 90, maxHeight: 140)
            .padding(8)
            .background(Color.black.opacity(0.25))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(AppTheme.border, lineWidth: 1)
            )
        }
    }
}

struct FullScreenImageView: View {
    let image: UIImage
    let onDismiss: () -> Void
    
    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
            Button("Done") {
                onDismiss()
            }
            .font(.headline)
            .foregroundColor(.white)
            .padding()
        }
        .onTapGesture { onDismiss() }
    }
}

struct OutfitItemCard: View {
    let icon: String
    let label: String
    let description: String
    var thumbnailImage: UIImage?
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(icon)
                .font(.title)
            
            if let img = thumbnailImage {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 56, height: 56)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(label)
                    .font(.headline)
                    .foregroundColor(AppTheme.textPrimary)
                if thumbnailImage != nil {
                    Text("(from wardrobe)")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            
            Spacer()
        }
        .padding()
        .background(Color.white.opacity(0.06))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .cornerRadius(12)
    }
}

struct OutfitSuggestionView_Previews: PreviewProvider {
    static var previews: some View {
        OutfitSuggestionView(
            suggestion: OutfitSuggestion(
                shirt: "Classic white dress shirt",
                trouser: "Navy blue dress trousers",
                blazer: "Charcoal gray blazer",
                shoes: "Black leather oxford shoes",
                belt: "Black leather belt",
                reasoning: "This outfit combines classic business attire with modern proportions.",
                model_image: nil,
                matching_wardrobe_items: nil
            ),
            onNext: {},
            onAddToWardrobe: {}
        )
        .padding()
    }
}

