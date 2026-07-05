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
        uploadImage: UIImage?,
        sourceWardrobeCategory: String? = nil
    ) -> String {
        let uploadCategory = resolvedUploadCategory(
            suggestion: suggestion,
            sourceWardrobeCategory: sourceWardrobeCategory
        )
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

    static func normalizedUploadCategory(from raw: String?) -> String? {
        guard let raw = raw?.lowercased(), !raw.isEmpty else {
            return nil
        }
        switch raw {
        case "shirt", "shirts": return "shirt"
        case "trouser", "trousers", "pant", "pants": return "trouser"
        case "blazer", "blazers": return "blazer"
        case "jacket", "jackets", "coat", "coats", "outerwear": return "outerwear"
        case "shoe", "shoes": return "shoes"
        case "belt", "belts": return "belt"
        default: return nil
        }
    }

    static func resolvedUploadCategory(
        suggestion: OutfitSuggestion,
        sourceWardrobeCategory: String? = nil
    ) -> String? {
        OutfitUploadCategory.resolvedUploadCategory(
            suggestion: suggestion,
            sourceWardrobeCategory: sourceWardrobeCategory
        )
    }

    static func resolvedUploadCategory(suggestion: OutfitSuggestion) -> String? {
        resolvedUploadCategory(suggestion: suggestion, sourceWardrobeCategory: nil)
    }

    /// When styling from a wardrobe item, prefer its category over API blazer/slot mismatches (jacket/coat → outerwear).
    static func applyingSourceWardrobeUploadCategory(
        to suggestion: OutfitSuggestion,
        sourceCategory: String?
    ) -> OutfitSuggestion {
        guard let sourceCategory, !sourceCategory.isEmpty else { return suggestion }
        guard let normalized = normalizedUploadCategory(from: sourceCategory) else {
            return suggestion
        }
        guard suggestion.upload_matched_category != normalized else {
            return ensureOuterwearForJacketSource(suggestion, sourceCategory: sourceCategory)
        }
        var updated = suggestion
        updated.upload_matched_category = normalized
        return ensureOuterwearForJacketSource(updated, sourceCategory: sourceCategory)
    }

    private static func ensureOuterwearForJacketSource(
        _ suggestion: OutfitSuggestion,
        sourceCategory: String
    ) -> OutfitSuggestion {
        let normalizedSource = sourceCategory.lowercased()
        guard ["jacket", "jackets", "coat", "coats", "outerwear"].contains(normalizedSource) else {
            return suggestion
        }
        guard OutfitItemCardSourceTag.resolvedUploadCategory(suggestion: suggestion) == "outerwear" else {
            return suggestion
        }
        var updated = suggestion
        let existing = updated.outerwear?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if existing.isEmpty || ["null", "none", "n/a"].contains(existing.lowercased()) {
            let label = normalizedSource.contains("coat") ? "coat" : "jacket"
            updated.outerwear = "Your wardrobe \(label) (uploaded item)"
        }
        return updated
    }
}
