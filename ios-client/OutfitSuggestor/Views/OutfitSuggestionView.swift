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
                        .foregroundColor(.yellow)
                    Text("Why This Outfit Works")
                        .font(.headline)
                }
                
                Text(suggestion.reasoning)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.blue.opacity(0.1))
            .cornerRadius(12)
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
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
                    .foregroundColor(.primary)
                if thumbnailImage != nil {
                    Text("(from wardrobe)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            
            Spacer()
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
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
            )
        )
        .padding()
    }
}

