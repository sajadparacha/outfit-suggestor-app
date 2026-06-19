//
//  OutfitSuggestionView.swift
//  OutfitSuggestor
//
//  View to display outfit suggestion results
//

import SwiftUI
import UIKit

struct OutfitSuggestionView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    let suggestion: OutfitSuggestion
    var occasion: String = OutfitFilters().occasion
    var season: String = OutfitFilters().season
    var style: String = OutfitFilters().style
    var uploadImage: UIImage?
    var onNext: (() -> Void)?
    var onLike: (() -> Void)?
    var onDislike: (() -> Void)?
    var onAddToWardrobe: (() -> Void)?
    var isLoading: Bool = false
    var isAdmin: Bool = false
    var showAiPromptResponse: Bool = true
    var showsActionSection: Bool = true
    @State private var showModelImageFullScreen = false

    private var modelImageData: Data? {
        guard let b64 = suggestion.model_image else { return nil }
        return Data(base64Encoded: b64)
    }

    private var heroMinHeight: CGFloat {
        horizontalSizeClass == .regular ? 360 : 280
    }

    private var contextLine: String {
        OutfitContextLine.format(occasion: occasion, season: season, style: style)
    }

    private var reasoningBullets: [String] {
        ReasoningBullets.toBullets(suggestion.reasoning)
    }

    var body: some View {
        VStack(spacing: 20) {
            Text(MainFlowUxCopy.resultTitle)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(AppTheme.textPrimary)
                .accessibilityIdentifier("main.resultTitle")

            heroSection

            Text(contextLine)
                .font(.subheadline.weight(.medium))
                .foregroundColor(AppTheme.accent)
                .frame(maxWidth: .infinity, alignment: .leading)

            itemCardsGrid

            whyThisWorksSection

            if showsActionSection {
                legacyActionSection
            }
        }
        .padding()
        .glassCard()
        .accessibilityIdentifier("main.resultCard")
    }

    @ViewBuilder
    private var heroSection: some View {
        if let data = modelImageData, let uiImage = UIImage(data: data) {
            Button(action: { showModelImageFullScreen = true }) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFit()
                    .frame(minHeight: heroMinHeight)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("main.resultHero")
            .fullScreenCover(isPresented: $showModelImageFullScreen) {
                FullScreenImageView(image: uiImage) { showModelImageFullScreen = false }
            }
        } else {
            styledOutfitPlaceholder
                .accessibilityIdentifier("main.resultHero")
        }
    }

    private var styledOutfitPlaceholder: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.12, green: 0.16, blue: 0.23),
                    Color(red: 0.06, green: 0.09, blue: 0.16),
                    Color(red: 0.19, green: 0.18, blue: 0.51),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            AppTheme.accentGradientVertical.opacity(0.3)

            VStack(spacing: 12) {
                HStack(spacing: 16) {
                    Text("👔").font(.system(size: 40))
                    Text("👖").font(.system(size: 36))
                    Text("🧥").font(.system(size: 36))
                    Text("👞").font(.system(size: 36))
                }
                Text(contextLine)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                    .multilineTextAlignment(.center)
            }
            .padding()
        }
        .frame(minHeight: heroMinHeight)
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
    }

    private var itemCardsGrid: some View {
        let columns = [
            GridItem(.flexible(), spacing: 12),
            GridItem(.flexible(), spacing: 12),
        ]

        return LazyVGrid(columns: columns, spacing: 12) {
            itemCard(category: "shirt", label: "Shirt", description: suggestion.shirt)
            itemCard(category: "trouser", label: "Trousers", description: suggestion.trouser)
            itemCard(category: "blazer", label: "Blazer", description: suggestion.blazer)
            itemCard(category: "shoes", label: "Shoes", description: suggestion.shoes)
            itemCard(category: "belt", label: "Belt", description: suggestion.belt)
        }
    }

    @ViewBuilder
    private func itemCard(category: String, label: String, description: String) -> some View {
        let thumb = OutfitItemThumbnail.thumbnailImage(
            suggestion: suggestion,
            category: category,
            uploadImage: uploadImage
        )
        let tag = OutfitItemCardSourceTag.resolve(
            category: category,
            suggestion: suggestion,
            uploadImage: uploadImage
        )

        OutfitItemCardView(
            category: label,
            description: description,
            thumbnailImage: thumb,
            sourceTag: tag
        )
    }

    private var whyThisWorksSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "lightbulb.fill")
                    .foregroundColor(AppTheme.accent)
                Text(MainFlowUxCopy.whyThisWorks)
                    .font(.headline)
                    .foregroundColor(AppTheme.textPrimary)
            }

            VStack(alignment: .leading, spacing: 8) {
                ForEach(reasoningBullets, id: \.self) { bullet in
                    HStack(alignment: .top, spacing: 8) {
                        Text("•")
                            .foregroundColor(AppTheme.accent)
                        Text(bullet)
                            .font(.body)
                            .foregroundColor(AppTheme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.accentSoft)
        .cornerRadius(12)
        .accessibilityIdentifier("main.whyThisWorks")
    }

    @ViewBuilder
    private var legacyActionSection: some View {
        HStack(spacing: 12) {
            if let onNext = onNext {
                Button(action: onNext) {
                    Label(MainFlowUxCopy.generateAnother, systemImage: "arrow.triangle.2.circlepath")
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
                    Label(MainFlowUxCopy.saveLook, systemImage: "heart")
                }
                .buttonStyle(.bordered)
            }
            if let onDislike = onDislike {
                Button(action: onDislike) {
                    Label(MainFlowUxCopy.refineMoreCasual, systemImage: "sparkles")
                }
                .buttonStyle(.bordered)
            }
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
