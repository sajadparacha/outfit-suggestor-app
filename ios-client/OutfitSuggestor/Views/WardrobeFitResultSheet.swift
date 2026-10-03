//
//  WardrobeFitResultSheet.swift
//  OutfitSuggestor
//
//  Result sheet for wardrobe fit evaluate (“How this fits”).
//

import SwiftUI

struct WardrobeFitResultSheet: View {
    @ObservedObject var viewModel: WardrobeFitEvaluateViewModel
    var onGetOutfitWithItem: ((WardrobeItem) -> Void)?
    var onOpenInsights: (() -> Void)?
    var onAddToWardrobe: ((UIImage, WardrobeAnalyzeResponse?) -> Void)?

    @Environment(\.openURL) private var openURL
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var imageViewer = WardrobeFitImageViewer()
    @State private var expandedCategories: Set<String> = []

    private var isRegularWidth: Bool {
        horizontalSizeClass == .regular
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    goalStrip
                    if viewModel.showGoalEditor {
                        goalEditor
                    }
                    contentBody
                }
                .padding(16)
                .adaptiveContent(maxWidth: isRegularWidth ? 720 : 980)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(
                LinearGradient(
                    colors: [AppTheme.bgPrimary, AppTheme.bgSecondary],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
            )
            .navigationTitle(viewModel.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(WardrobeFitEvaluateCopy.close) {
                        viewModel.dismiss()
                    }
                    .accessibilityIdentifier("wardrobe.fit.close")
                }
            }
        }
        .accessibilityIdentifier("wardrobe.fit.sheet")
        .fullScreenCover(isPresented: Binding(get: { imageViewer.isOpen }, set: { if !$0 { imageViewer.dismiss() } })) {
            if let image = imageViewer.image {
                FullScreenImageView(image: image) {
                    imageViewer.dismiss()
                }
            }
        }
    }

    private var goalStrip: some View {
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(WardrobeFitEvaluateCopy.goalStripPrefix)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
                Text(viewModel.goalSummaryLine)
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(AppTheme.textPrimary)
            }
            Spacer(minLength: 8)
            Button(WardrobeFitEvaluateCopy.changeGoal) {
                viewModel.showGoalEditor.toggle()
            }
            .font(.subheadline.weight(.semibold))
            .foregroundColor(AppTheme.accent)
            .accessibilityIdentifier("wardrobe.fit.changeGoal")
        }
        .padding(12)
        .background(AppTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
    }

    private var goalEditor: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(InsightsCopy.dressCodeTitle)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
            InsightsFlowLayout(spacing: 8) {
                ForEach(InsightsLifestyle.dressCodeOptions) { option in
                    goalChip(
                        label: option.label,
                        selected: viewModel.dressCode == option.value
                    ) {
                        viewModel.dressCode = option.value
                    }
                }
            }

            Text(InsightsCopy.lifestyleMixTitle)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
            InsightsFlowLayout(spacing: 8) {
                ForEach(InsightsLifestyle.mixOptions) { option in
                    goalChip(
                        label: option.label,
                        selected: viewModel.lifestyleMix.contains(option.value),
                        badge: option.value == viewModel.primaryLifestyle ? InsightsCopy.primaryBadge : nil
                    ) {
                        if viewModel.lifestyleMix.contains(option.value) {
                            viewModel.setPrimaryLifestyle(option.value)
                        } else {
                            viewModel.toggleLifestyle(option.value)
                        }
                    }
                    .onLongPressGesture {
                        viewModel.setPrimaryLifestyle(option.value)
                    }
                }
            }

            Text(InsightsCopy.stylePrimaryTitle)
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
            InsightsFlowLayout(spacing: 8) {
                ForEach(InsightsLifestyle.stylePrimaryOptions) { option in
                    goalChip(
                        label: option.label,
                        selected: viewModel.stylePrimary == option.value
                    ) {
                        viewModel.stylePrimary = option.value
                    }
                }
            }

            TextField(WardrobeFitEvaluateCopy.notesPlaceholder, text: $viewModel.textInput, axis: .vertical)
                .lineLimit(2...4)
                .textFieldStyle(.roundedBorder)
                .accessibilityIdentifier("wardrobe.fit.notes")

            Button(WardrobeFitEvaluateCopy.applyGoal) {
                Task { await viewModel.applyGoalAndReevaluate() }
            }
            .font(.subheadline.weight(.semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(AppTheme.accent)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .accessibilityIdentifier("wardrobe.fit.applyGoal")
        }
        .padding(12)
        .background(AppTheme.accentSoft)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    @ViewBuilder
    private var contentBody: some View {
        if viewModel.isLoading {
            HStack(spacing: 12) {
                ProgressView()
                Text(viewModel.loadingMessage)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 24)
            .accessibilityIdentifier("wardrobe.fit.loading")
        } else if let error = viewModel.errorMessage {
            VStack(alignment: .leading, spacing: 12) {
                Text(error)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                Button(WardrobeFitEvaluateCopy.retry) {
                    Task { await viewModel.retry() }
                }
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.accent)
                .accessibilityIdentifier("wardrobe.fit.retry")
            }
            .accessibilityIdentifier("wardrobe.fit.error")
        } else if let result = viewModel.result {
            successContent(result)
        }
    }

    private func successContent(_ result: WardrobeFitEvaluateResponse) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            candidateHeader(result)

            Text(result.summary_text)
                .font(.body.weight(.medium))
                .foregroundColor(AppTheme.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("wardrobe.fit.summary")

            verdictChip(result.verdict)

            pairsSection(result)

            missingSection(result.missing_for_goal, stylePrimary: result.goal.style_primary ?? viewModel.stylePrimary)

            secondaryActions
        }
    }

    private func candidateHeader(_ result: WardrobeFitEvaluateResponse) -> some View {
        HStack(spacing: 12) {
            let candidateFullImage = WardrobeFitImageViewer.resolveImage(
                imageData: result.candidate.image_data,
                localImage: viewModel.candidateImage
            )
            if candidateFullImage != nil {
                Button {
                    imageViewer.selectCandidate(
                        imageData: result.candidate.image_data,
                        localImage: viewModel.candidateImage
                    )
                } label: {
                    fitThumb(
                        imageData: result.candidate.image_data,
                        localImage: viewModel.candidateImage,
                        size: isRegularWidth ? 72 : 64
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(WardrobeFitEvaluateCopy.viewFullImage)
                .accessibilityIdentifier("wardrobe.fit.candidateThumb")
            } else {
                fitThumb(
                    imageData: result.candidate.image_data,
                    localImage: viewModel.candidateImage,
                    size: isRegularWidth ? 72 : 64
                )
                .accessibilityIdentifier("wardrobe.fit.candidateThumb")
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(result.candidate.label)
                    .font(.title3.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                if let color = result.candidate.color, !color.isEmpty {
                    Text(color)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                }
                Text(WardrobeCategoryDisplay.wardrobeCategoryLabel(result.candidate.category))
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
            }
            Spacer(minLength: 0)
        }
        .accessibilityIdentifier("wardrobe.fit.candidate")
    }

    private func verdictChip(_ verdict: WardrobeFitVerdict) -> some View {
        let label = WardrobeFitEvaluateCopy.verdictLabel(verdict)
        let colors = verdictColors(verdict)
        return Text(label)
            .font(.caption.weight(.bold))
            .foregroundColor(colors.fg)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(colors.bg)
            .clipShape(Capsule())
            .accessibilityIdentifier("wardrobe.fit.verdict")
            .accessibilityLabel(label)
    }

    private func verdictColors(_ verdict: WardrobeFitVerdict) -> (bg: Color, fg: Color) {
        switch verdict {
        case .strongFit:
            return (AppTheme.accent.opacity(0.25), AppTheme.accent)
        case .weakFit:
            return (Color.orange.opacity(0.22), Color.orange)
        case .redundant:
            return (AppTheme.bgSecondary, AppTheme.textSecondary)
        }
    }

    private func pairsSection(_ result: WardrobeFitEvaluateResponse) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(WardrobeFitEvaluateCopy.sectionPairs)
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            if viewModel.hasEmptyPairs {
                Text(WardrobeFitEvaluateCopy.emptyPairs)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .accessibilityIdentifier("wardrobe.fit.emptyPairs")
            } else {
                ForEach(result.pairs_with.filter { $0.count > 0 }) { row in
                    pairRow(row)
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .accessibilityIdentifier("wardrobe.fit.pairs")
    }

    private func pairRow(_ row: WardrobeFitPairCategory) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(WardrobeCategoryDisplay.wardrobeCategoryLabel(row.category))
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                Text(WardrobeFitEvaluateCopy.pairsWithLabel(count: row.count))
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(AppTheme.accent)
                    .accessibilityIdentifier("wardrobe.fit.pairCount.\(row.category)")
            }
            let expanded = expandedCategories.contains(row.category)
            let visible = WardrobeFitPairExpansion.visibleItems(for: row, expanded: expanded)
            if expanded {
                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: thumbSize, maximum: thumbSize), spacing: 8, alignment: .leading)],
                    alignment: .leading,
                    spacing: 8
                ) {
                    ForEach(visible) { item in
                        pairThumb(item)
                    }
                }
                .accessibilityIdentifier("wardrobe.fit.pairGrid.\(row.category)")
            } else {
                HStack(spacing: 8) {
                    ForEach(visible) { item in
                        pairThumb(item)
                    }
                }
            }
            if WardrobeFitPairExpansion.showsToggle(count: row.count) {
                Button(WardrobeFitPairExpansion.toggleTitle(count: row.count, expanded: expanded)) {
                    if expanded {
                        expandedCategories.remove(row.category)
                    } else {
                        expandedCategories.insert(row.category)
                    }
                }
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.accent)
                .frame(minHeight: 44)
                .accessibilityIdentifier("wardrobe.fit.pairToggle.\(row.category)")
            }
        }
        .accessibilityIdentifier("wardrobe.fit.pair.\(row.category)")
    }

    private var thumbSize: CGFloat {
        isRegularWidth ? 48 : 44
    }

    @ViewBuilder
    private func pairThumb(_ item: WardrobeFitPairItem) -> some View {
        if WardrobeFitPairExpansion.opensViewer(item) {
            Button {
                imageViewer.selectPair(item)
            } label: {
                fitThumb(imageData: item.image_data, size: thumbSize)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(WardrobeFitEvaluateCopy.viewFullImageLabel(itemLabel: item.label))
            .accessibilityIdentifier("wardrobe.fit.pairThumb.\(item.id)")
        } else {
            fitThumb(imageData: item.image_data, size: thumbSize)
                .accessibilityLabel(item.label)
        }
    }

    private func missingSection(_ missing: WardrobeFitMissing, stylePrimary: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(WardrobeFitEvaluateCopy.sectionGap)
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            Text(missing.label)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)

            Text(missing.reason)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            if missing.candidate_fills_this_gap {
                Text("This piece fills that gap.")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.accent)
            }

            HStack(spacing: 10) {
                if let category = missing.category, !category.isEmpty {
                    Button(InsightsCopy.shopSimilarButton) {
                        InsightsShoppingSearch.open(
                            category: category,
                            colors: [],
                            styles: [],
                            defaultStyle: stylePrimary,
                            openURL: openURL
                        )
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.accent)
                    .accessibilityIdentifier("wardrobe.fit.shopSimilar")
                }
                if let onOpenInsights, viewModel.showsOpenInsights(hasHandler: true) {
                    Button(WardrobeFitEvaluateCopy.openInsights) {
                        viewModel.dismiss()
                        onOpenInsights()
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.accent)
                    .accessibilityIdentifier("wardrobe.fit.openInsights")
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.accentSoft)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .accessibilityIdentifier("wardrobe.fit.missing")
    }

    private var secondaryActions: some View {
        VStack(spacing: 10) {
            if let item = viewModel.sourceItem, let onGetOutfitWithItem {
                Button {
                    onGetOutfitWithItem(item)
                    viewModel.dismiss()
                } label: {
                    Text(WardrobeFitEvaluateCopy.getOutfitWithItem)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .background(AppTheme.accent.opacity(0.85))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("wardrobe.fit.getOutfit")
            }

            if viewModel.isCheckBeforeBuy, let image = viewModel.candidateImage, let onAddToWardrobe {
                Button {
                    let attributes = viewModel.analyzedAttributes
                    viewModel.dismiss()
                    onAddToWardrobe(image, attributes)
                } label: {
                    Label(WardrobeFitEvaluateCopy.addToWardrobe, systemImage: "plus.circle")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.accent)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(AppTheme.accentSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("wardrobe.fit.addToWardrobe")
            }

            Button(WardrobeFitEvaluateCopy.close) {
                viewModel.dismiss()
            }
            .font(.subheadline.weight(.semibold))
            .foregroundColor(AppTheme.textPrimary)
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(AppTheme.bgSecondary.opacity(0.7))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .accessibilityIdentifier("wardrobe.fit.closeSecondary")
        }
    }

    private func goalChip(label: String, selected: Bool, badge: String? = nil, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(label)
                if let badge {
                    Text(badge)
                        .font(.caption2.weight(.bold))
                }
            }
            .font(.caption.weight(.semibold))
            .foregroundColor(selected ? .white : AppTheme.textPrimary)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(selected ? AppTheme.accent : AppTheme.bgSecondary.opacity(0.7))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func fitThumb(imageData: String?, localImage: UIImage? = nil, size: CGFloat) -> some View {
        Group {
            if let image = localImage ?? WardrobeImageData.decodeUIImage(from: imageData) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                Image(systemName: "tshirt")
                    .foregroundColor(AppTheme.textSecondary)
            }
        }
        .frame(width: size, height: size)
        .background(AppTheme.bgSecondary.opacity(0.7))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

/// Collapsed/expanded visibility for a "Works with what you own" category.
enum WardrobeFitPairExpansion {
    static let collapsedLimit = 3

    static func visibleItems(for row: WardrobeFitPairCategory, expanded: Bool) -> [WardrobeFitPairItem] {
        expanded ? row.items : Array(row.items.prefix(collapsedLimit))
    }

    static func showsToggle(count: Int) -> Bool {
        count > collapsedLimit
    }

    static func toggleTitle(count: Int, expanded: Bool) -> String {
        expanded ? WardrobeFitEvaluateCopy.showLess : WardrobeFitEvaluateCopy.viewAll(count)
    }

    static func opensViewer(_ item: WardrobeFitPairItem) -> Bool {
        WardrobeFitImageViewer.resolveImage(imageData: item.image_data) != nil
    }
}

/// Full-screen viewer state for fit-sheet thumbnails; items without image data never open.
struct WardrobeFitImageViewer {
    private(set) var image: UIImage?

    var isOpen: Bool { image != nil }

    static func resolveImage(imageData: String?, localImage: UIImage? = nil) -> UIImage? {
        localImage ?? WardrobeImageData.decodeUIImage(from: imageData)
    }

    mutating func selectCandidate(imageData: String?, localImage: UIImage? = nil) {
        guard let resolved = Self.resolveImage(imageData: imageData, localImage: localImage) else { return }
        image = resolved
    }

    mutating func selectPair(_ item: WardrobeFitPairItem) {
        guard let resolved = Self.resolveImage(imageData: item.image_data) else { return }
        image = resolved
    }

    mutating func dismiss() {
        image = nil
    }
}
