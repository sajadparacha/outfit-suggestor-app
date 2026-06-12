//
//  OutfitItemCardView.swift
//  OutfitSuggestor
//
//  Item card for outfit result — short name, one-line reason, source tag.
//

import SwiftUI
import UIKit

struct OutfitItemCardView: View {
    let category: String
    let description: String
    let thumbnailImage: UIImage?
    let sourceTag: String
    @State private var isExpanded = false

    private var parsed: OutfitItemCardText {
        OutfitItemCardTextParser.parse(description)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.white.opacity(0.06))
                    .frame(height: 120)
                if let img = thumbnailImage {
                    Image(uiImage: img)
                        .resizable()
                        .scaledToFill()
                        .frame(height: 120)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                } else {
                    Text("✦")
                        .font(.title)
                        .foregroundColor(AppTheme.textSecondary)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(AppTheme.border, lineWidth: 1)
            )

            Text(category)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
                .textCase(.uppercase)

            Text(parsed.shortName.isEmpty ? description : parsed.shortName)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
                .lineLimit(2)

            if let reason = parsed.oneLineReason {
                Text(reason)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .lineLimit(2)
            }

            Text(sourceTag)
                .font(.caption2.weight(.medium))
                .foregroundColor(AppTheme.accent)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(AppTheme.accentSoft)
                .clipShape(Capsule())

            if description.count > 80 {
                DisclosureGroup("Details", isExpanded: $isExpanded) {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, 4)
                }
                .font(.caption.weight(.medium))
                .foregroundColor(AppTheme.textSecondary)
            }
        }
        .padding(12)
        .background(Color.white.opacity(0.04))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

enum OutfitItemCardSourceTag {
    static func resolve(
        category: String,
        suggestion: OutfitSuggestion,
        uploadImage: UIImage?
    ) -> String {
        let uploadCategory = resolvedUploadCategory(suggestion: suggestion)
        let hasWardrobeThumb = OutfitItemThumbnail.thumbnailImage(
            suggestion: suggestion,
            category: category,
            uploadImage: nil
        ) != nil
        let useUpload = uploadImage != nil && category == uploadCategory

        if useUpload {
            return MainFlowUxCopy.tagFromUpload
        }
        if hasWardrobeThumb {
            return MainFlowUxCopy.tagFromWardrobe
        }
        return MainFlowUxCopy.tagAiSuggested
    }

    static func resolvedUploadCategory(suggestion: OutfitSuggestion) -> String? {
        let categories: [(String, String)] = [
            ("shirt", suggestion.shirt),
            ("trouser", suggestion.trouser),
            ("blazer", suggestion.blazer),
            ("shoes", suggestion.shoes),
            ("belt", suggestion.belt),
        ]

        if let textMatch = categories.first(where: { _, value in
            let lower = value.lowercased()
            return lower.contains("uploaded image")
                || lower.contains("from your upload")
                || lower.contains("your upload")
        })?.0 {
            return textMatch
        }

        guard let raw = suggestion.upload_matched_category?.lowercased(), !raw.isEmpty else {
            return nil
        }
        switch raw {
        case "shirt", "shirts": return "shirt"
        case "trouser", "trousers", "pant", "pants": return "trouser"
        case "blazer", "blazers", "jacket", "jackets": return "blazer"
        case "shoe", "shoes": return "shoes"
        case "belt", "belts": return "belt"
        default: return nil
        }
    }
}
