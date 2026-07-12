//
//  WardrobeListView.swift
//  OutfitSuggestor
//

import SwiftUI
import UIKit

struct WardrobeListView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var response: WardrobeListResponse?
    @State private var wardrobeSummary: WardrobeSummary?
    @State private var allWardrobeItems: [WardrobeItem] = []
    @State private var categoryCounts: [String: Int] = [:]
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var hasLoaded = false
    @State private var isRequestInFlight = false
    @State private var showAddSheet = false
    @State private var categoryFilter = "All"
    @State private var searchText = ""
    @State private var categoryInfoMessage: String?
    @State private var categoryInfoDismissTask: Task<Void, Never>?
    @State private var pendingDeleteItem: WardrobeItem?
    @State private var pendingDeleteTask: Task<Void, Never>?
    var initialCategoryFilter: String?
    var onConsumeCategoryFilter: (() -> Void)?
    var onGetSuggestionFromItem: ((WardrobeItem) -> Void)?
    var onCompleteOutfitFromSelection: (([WardrobeItem]) -> Void)?
    var onSelectHistorySuggestion: ((OutfitHistoryEntry) -> Void)?
    @Binding var filters: OutfitFilters
    @Binding var preferenceText: String
    @Binding var useWardrobeOnly: Bool
    var isAuthenticated: Bool = false
    @StateObject private var pastSuggestionsLoader = WardrobePastSuggestionsLoader()
    @State private var editingItem: WardrobeItem?
    @State private var fullScreenImage: UIImage?
    @AppStorage("wardrobe_flow_tip_dismissed") private var flowTipDismissed = false
    @State private var isCompletionSelectionMode = false
    @State private var completionSelection = WardrobeMultiSelectState()
    @State private var completionSelectionMessage: String?
    @State private var completionPreferencesExpanded = true
    @State private var categoryFiltersExpanded = true
    
    private var categoryVisibleItems: [WardrobeItem] {
        if categoryFilter == "All" {
            return allWardrobeItems
        }
        return allWardrobeItems.filter {
            WardrobeCategoryDisplay.matchesCategoryFilter($0.category, filter: categoryFilter)
        }
    }
    
    private var filteredItems: [WardrobeItem] {
        let items = categoryVisibleItems
        if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return items }
        let query = searchText.lowercased()
        return items.filter { item in
            (item.description?.lowercased().contains(query) ?? false) ||
            (item.color?.lowercased().contains(query) ?? false) ||
            (item.name?.lowercased().contains(query) ?? false) ||
            item.category.lowercased().contains(query)
        }
    }

    private var displayedItems: [WardrobeItem] {
        guard let pendingDeleteItem else { return filteredItems }
        return filteredItems.filter { $0.id != pendingDeleteItem.id }
    }

    private var selectedCompletionItems: [WardrobeItem] {
        WardrobeCompletionThumbnails.selectedItemsInOrder(
            selectedItemIds: completionSelection.selectedItemIds,
            allItems: allWardrobeItems
        )
    }

    private var selectedCompletionThumbnailItems: [WardrobeItem] {
        WardrobeCompletionThumbnails.thumbnailItemsInOrder(
            selectedItemIds: completionSelection.selectedItemIds,
            allItems: allWardrobeItems
        )
    }

    private var completionThumbnailSize: CGFloat {
        isRegularWidth ? 52 : 48
    }

    private var visibleWardrobeItemIDsLabel: String {
        displayedItems.map { String($0.id) }.joined(separator: ",")
    }

    private var isRegularWidth: Bool {
        horizontalSizeClass == .regular
    }

    private var visibleCategoryFilterChips: [String] {
        if let wardrobeSummary {
            return WardrobeCategoryDisplay.visibleFilterChipKeys(from: wardrobeSummary)
        }
        return WardrobeCategoryDisplay.visibleFilterChipKeys(from: categoryCounts)
    }

    private var completionSelectionSummary: String {
        completionSelection.selectionSummary(for: allWardrobeItems)
    }

    private var completionStatusText: String? {
        if let completionSelectionMessage, !completionSelectionMessage.isEmpty {
            return completionSelectionMessage
        }
        return nil
    }

    private var showsCompletionPreferences: Bool {
        onCompleteOutfitFromSelection != nil && (isCompletionSelectionMode || hasCompletionEligibleItems)
    }

    private var hasCompletionEligibleItems: Bool {
        allWardrobeItems.contains { completionSelection.isEligible($0) }
    }

    private var completionPreferencesGridColumns: Int {
        isRegularWidth ? 4 : 2
    }

    private var activeCategoryFilterSummary: String {
        let label = WardrobeCategoryDisplay.filterChipLabel(for: categoryFilter)
        return "\(label) (\(countForCategory(categoryFilter)))"
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading wardrobe…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = errorMessage {
                VStack {
                    Text(err).foregroundColor(.red).padding()
                    Button("Retry") { Task { await load() } }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if allWardrobeItems.isEmpty {
                VStack(spacing: 16) {
                    Text("No wardrobe items yet.")
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    Button("Add item") { showAddSheet = true }
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if response != nil {
                VStack(spacing: 0) {
                    wardrobeFlowTip
                        .padding(.horizontal)
                        .padding(.top, 8)

                    categoryFilterChips
                        .padding(.horizontal)
                        .padding(.top, 8)
                        .padding(.bottom, 6)
                    
                    if let categoryInfoMessage, !categoryInfoMessage.isEmpty {
                        HStack(spacing: 8) {
                            Image(systemName: "info.circle.fill")
                                .foregroundColor(AppTheme.accent)
                            Text(categoryInfoMessage)
                                .font(.footnote)
                                .foregroundColor(AppTheme.textSecondary)
                                .accessibilityIdentifier("wardrobe.categoryInfoToastText")
                            Spacer()
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 6)
                        .accessibilityElement(children: .combine)
                        .accessibilityIdentifier("wardrobe.categoryInfoToast")
                    }
                    
                    TextField("Search wardrobe...", text: $searchText)
                        .textFieldStyle(.roundedBorder)
                        .padding(.horizontal)
                        .padding(.vertical, 8)
                        .accessibilityIdentifier("wardrobe.searchField")

                    completionSelectionPanel
                        .padding(.horizontal)
                        .padding(.bottom, 8)
                    
                    ScrollView {
                        // Native Menu popover stacks above LazyVStack siblings (no web z-index fix needed).
                        LazyVStack(spacing: 12) {
                            ForEach(displayedItems) { item in
                                let isSelected = completionSelection.isSelected(item)
                                WardrobeCardView(
                                    item: item,
                                    image: WardrobeImageData.decodeUIImage(from: item.image_data),
                                    onGetSuggestion: onGetSuggestionFromItem == nil ? nil : { onGetSuggestionFromItem?(item) },
                                    onPastSuggestions: { Task { await pastSuggestionsLoader.open(for: item) } },
                                    isPastSuggestionsLoading: pastSuggestionsLoader.loadingItemId == item.id,
                                    onEdit: { editingItem = item },
                                    onDelete: { scheduleDelete(item: item) },
                                    onShowImage: { image in fullScreenImage = image },
                                    isCompletionSelectionMode: isCompletionSelectionMode,
                                    isSelectedForCompletion: isSelected,
                                    isCompletionEligible: completionSelection.isEligible(item),
                                    completionSlotLabel: completionSelection.slot(for: item)?.displayName,
                                    onToggleCompletionSelection: { toggleCompletionSelection(for: item) }
                                )
                                .accessibilityIdentifier("wardrobe.row.\(item.id)")
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 32)
                    }
                    .accessibilityIdentifier("wardrobe.itemsList")
                    .overlay(alignment: .topLeading) {
                        Color.clear
                            .frame(width: 1, height: 1)
                            .accessibilityElement(children: .ignore)
                            .accessibilityIdentifier("wardrobe.visibleItemIDs")
                            .accessibilityLabel(visibleWardrobeItemIDsLabel)
                    }
                }
                .adaptiveContent(maxWidth: 1080)
                .overlay(alignment: .bottom) {
                    if pendingDeleteItem != nil {
                        HStack(spacing: 12) {
                            Text("Item deleted.")
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(AppTheme.textPrimary)
                                .accessibilityIdentifier("wardrobe.deleteUndoToastText")
                            Spacer()
                            Button("Undo", action: undoPendingDelete)
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(AppTheme.accent)
                                .accessibilityIdentifier("wardrobe.deleteUndoButton")
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(AppTheme.bgSecondary.opacity(0.96))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(AppTheme.border, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .shadow(color: .black.opacity(0.25), radius: 12, y: 4)
                        .padding(.horizontal)
                        .padding(.bottom, 12)
                        .accessibilityElement(children: .contain)
                        .accessibilityIdentifier("wardrobe.deleteUndoToast")
                    }
                }
            }
        }
        .overlay {
            if pastSuggestionsLoader.showsProgressPanel {
                VStack {
                    Spacer()
                    AiProgressPanelView(
                        operationType: pastSuggestionsLoader.progressOperationType,
                        message: pastSuggestionsLoader.progressMessage,
                        onCancel: {}
                    )
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .navigationTitle("Wardrobe")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: { showAddSheet = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .onAppear {
            applyInitialCategoryFilterIfNeeded()
            guard !hasLoaded else { return }
            hasLoaded = true
            Task { await load() }
        }
        .onChange(of: initialCategoryFilter) { _ in
            applyInitialCategoryFilterIfNeeded()
        }
        .onDisappear {
            categoryInfoDismissTask?.cancel()
            categoryInfoDismissTask = nil
            Task { await commitPendingDelete() }
        }
        .sheet(isPresented: $showAddSheet) {
            WardrobeFormView(item: nil, onSaved: { showAddSheet = false; Task { await load() } }, onCancel: { showAddSheet = false })
        }
        .sheet(isPresented: $pastSuggestionsLoader.showSheet) {
            historySuggestionsSheet
        }
        .sheet(item: $editingItem) { item in
            WardrobeFormView(
                item: item,
                onSaved: { Task { await load() } },
                onCancel: { editingItem = nil }
            )
        }
        .fullScreenCover(isPresented: Binding(get: { fullScreenImage != nil }, set: { if !$0 { fullScreenImage = nil } })) {
            if let image = fullScreenImage {
                FullScreenImageView(image: image) {
                    fullScreenImage = nil
                }
            }
        }
    }
    
    @ViewBuilder
    private var wardrobeFlowTip: some View {
        if !flowTipDismissed {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("How to style from wardrobe")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)
                    Spacer()
                    Button("Dismiss") { flowTipDismissed = true }
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                }
                Text("1. Pick an item  2. \(WardrobeCardUx.flowTipStep2Fragment)  3. On Suggest, set preferences and Generate Outfit")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(12)
            .background(AppTheme.accentSoft)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(AppTheme.gradientStart.opacity(0.3), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .accessibilityIdentifier("wardrobe.flowTip")
        }
    }

    @ViewBuilder
    private var completionSelectionPanel: some View {
        if onCompleteOutfitFromSelection != nil {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "checklist")
                        .font(.title3)
                        .foregroundColor(AppTheme.accent)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Complete an outfit from your wardrobe")
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(AppTheme.textPrimary)
                        Text("Select 1 to 5 pieces—one item per slot (shirt, trousers, blazer, outerwear, sweater, shoes, or belt). Choose only one of blazer, outerwear, or sweater.")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer()
                    Button(isCompletionSelectionMode ? "Cancel" : "Select items") {
                        toggleCompletionSelectionMode()
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.accent)
                    .disabled(!hasCompletionEligibleItems && !isCompletionSelectionMode)
                    .accessibilityIdentifier("wardrobe.multiSelect.toggle")
                }

                if isCompletionSelectionMode {
                    VStack(alignment: .leading, spacing: 10) {
                        if showsCompletionPreferences {
                            completionPreferencesSection
                        }

                        HStack {
                            Text(completionStatusText ?? completionSelectionSummary)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(completionSelectionMessage == nil
                                    ? AppTheme.textSecondary
                                    : AppTheme.accent)
                                .accessibilityIdentifier("wardrobe.multiSelect.status")
                            Spacer()
                            Button("Clear selection") {
                                completionSelection.clear()
                                completionSelectionMessage = nil
                            }
                            .font(.caption.weight(.semibold))
                            .foregroundColor(AppTheme.textSecondary)
                            .disabled(completionSelection.selectedCount == 0)
                            .accessibilityIdentifier("wardrobe.multiSelect.clear")
                        }

                        if completionSelection.selectedCount > 0 {
                            completionSelectionThumbnailsRow
                        }

                        Button(action: completeSelectedOutfit) {
                            Label(completionSelection.actionTitle, systemImage: "sparkles")
                                .font(.headline.weight(.semibold))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 13)
                        }
                        .buttonStyle(GradientButtonStyle(isEnabled: completionSelection.canCompleteOutfit))
                        .disabled(!completionSelection.canCompleteOutfit)
                        .accessibilityLabel(completionSelection.actionTitle)
                        .accessibilityIdentifier("wardrobe.multiSelect.complete")
                    }
                } else if showsCompletionPreferences {
                    completionPreferencesSection
                } else if !hasCompletionEligibleItems {
                    Text("Add eligible wardrobe items to use AI outfit completion.")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
            }
            .padding(14)
            .background(AppTheme.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(AppTheme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .accessibilityIdentifier("wardrobe.multiSelect.panel")
        }
    }

    private var categoryFilterChips: some View {
        DisclosureGroup(isExpanded: $categoryFiltersExpanded) {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: isRegularWidth ? 130 : 106), spacing: 10)],
                alignment: .leading,
                spacing: 10
            ) {
                ForEach(visibleCategoryFilterChips, id: \.self) { category in
                    categoryFilterChipButton(for: category)
                }
            }
            .padding(.top, 4)
        } label: {
            HStack(spacing: 8) {
                Text("Filter by")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                if !categoryFiltersExpanded {
                    Text(activeCategoryFilterSummary)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }
        }
        .padding(14)
        .background(AppTheme.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityIdentifier("wardrobe.categoryFilters")
    }

    private func categoryFilterChipButton(for category: String) -> some View {
        let isActive = categoryFilter == category
        return Button {
            guard categoryFilter != category else { return }
            categoryInfoDismissTask?.cancel()
            categoryInfoDismissTask = nil
            categoryInfoMessage = nil
            if category != "All" && countForCategory(category) == 0 {
                categoryFilter = "All"
                showCategoryInfoToast("No items found in \(WardrobeCategoryDisplay.filterChipLabel(for: category)). Showing all wardrobe items.")
            } else {
                categoryFilter = category
            }
        } label: {
            Text("\(WardrobeCategoryDisplay.filterChipLabel(for: category)) (\(countForCategory(category)))")
                .font(.body.weight(.semibold))
                .foregroundColor(isActive ? .white : AppTheme.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
                .padding(.horizontal, 16)
                .padding(.vertical, 11)
                .background(isActive ? AppTheme.accent : AppTheme.surface)
                .overlay(
                    Capsule()
                        .stroke(isActive ? AppTheme.accent.opacity(0.35) : AppTheme.border, lineWidth: 1)
                )
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("wardrobe.chip.\(category.lowercased())")
    }

    @ViewBuilder
    private var completionSelectionThumbnailsRow: some View {
        let items = selectedCompletionThumbnailItems
        if !items.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: isRegularWidth ? 10 : 8) {
                    ForEach(items) { item in
                        if let image = WardrobeImageData.decodeUIImage(from: item.image_data) {
                            ZStack(alignment: .topTrailing) {
                                Button {
                                    fullScreenImage = image
                                } label: {
                                    Image(uiImage: image)
                                        .resizable()
                                        .scaledToFill()
                                        .frame(width: completionThumbnailSize, height: completionThumbnailSize)
                                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                                .stroke(AppTheme.border, lineWidth: 1)
                                        )
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(
                                    WardrobeCompletionThumbnails.viewImageAccessibilityLabel(for: item)
                                )
                                .accessibilityIdentifier(
                                    WardrobeCompletionThumbnails.thumbnailAccessibilityId(itemId: item.id)
                                )

                                Button {
                                    removeFromCompletionSelection(item)
                                } label: {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 20, height: 20)
                                        .background(Circle().fill(Color.black.opacity(0.72)))
                                }
                                .buttonStyle(.plain)
                                .padding(2)
                                .accessibilityLabel(completionThumbnailRemoveAccessibilityLabel(for: item))
                                .accessibilityIdentifier(completionThumbnailRemoveAccessibilityId(itemId: item.id))
                            }
                            .frame(width: completionThumbnailSize, height: completionThumbnailSize)
                        }
                    }
                }
            }
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier(WardrobeCompletionThumbnails.rowAccessibilityId)
        }
    }

    private func toggleCompletionSelectionMode() {
        withAnimation {
            isCompletionSelectionMode.toggle()
            if isCompletionSelectionMode {
                completionPreferencesExpanded = true
            }
            completionSelection.clear()
            completionSelectionMessage = nil
        }
    }

    private func toggleCompletionSelection(for item: WardrobeItem) {
        guard isCompletionSelectionMode else { return }
        let result = completionSelection.toggle(item)
        completionSelectionMessage = result.message
        if result == .selected || result == .deselected {
            completionPreferencesExpanded = true
            if completionSelection.canCompleteOutfit {
                completionSelectionMessage = nil
            }
        }
    }

    private func removeFromCompletionSelection(_ item: WardrobeItem) {
        withAnimation {
            completionSelection.remove(item)
            completionSelectionMessage = nil
        }
    }

    private func completionThumbnailRemoveAccessibilityId(itemId: Int) -> String {
        "wardrobe.multiSelect.remove.\(itemId)"
    }

    private func completionThumbnailRemoveAccessibilityLabel(for item: WardrobeItem) -> String {
        let slot = WardrobeCompletionSlot.normalized(from: item.category)
        let name = slot?.summaryLabel ?? item.category
        return "Remove \(name)"
    }

    @ViewBuilder
    private var completionPreferencesSection: some View {
        DisclosureGroup(isExpanded: $completionPreferencesExpanded) {
            FiltersView(
                filters: $filters,
                preferenceText: $preferenceText,
                layout: .grid,
                useWardrobeOnly: $useWardrobeOnly,
                showWardrobeOnly: isAuthenticated,
                showSharedHint: true,
                gridColumnCount: completionPreferencesGridColumns,
                filterAccessibilityPrefix: "wardrobe.completion",
                wardrobeOnlyCheckboxAccessibilityId: WardrobeCompletionCopy.wardrobeOnlyCheckboxAccessibilityId
            )
            .padding(.top, 4)
        } label: {
            Text(MainFlowUxCopy.preferencesSection)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
        }
        .accessibilityIdentifier(WardrobeCompletionCopy.preferencesPanelAccessibilityId)
    }

    private func completeSelectedOutfit() {
        guard completionSelection.canCompleteOutfit else {
            completionSelectionMessage = "Select at least 1 item"
            return
        }
        onCompleteOutfitFromSelection?(selectedCompletionItems)
        withAnimation {
            isCompletionSelectionMode = false
            completionSelection.clear()
            completionSelectionMessage = nil
        }
    }

    private func countForCategory(_ category: String) -> Int {
        if let wardrobeSummary {
            return WardrobeCategoryDisplay.filterChipCount(from: wardrobeSummary, filterKey: category)
        }
        if category == "All" {
            return response?.total ?? 0
        }
        return categoryCounts[category.lowercased()] ?? 0
    }
    
    private func applyInitialCategoryFilterIfNeeded() {
        guard let seed = initialCategoryFilter?
            .trimmingCharacters(in: .whitespacesAndNewlines),
              !seed.isEmpty else { return }

        let normalized = seed.lowercased()
        if normalized == "all" {
            categoryFilter = "All"
        } else if WardrobeCategoryDisplay.allFilterChipKeys.contains(where: { $0.lowercased() == normalized }) {
            categoryFilter = WardrobeCategoryDisplay.allFilterChipKeys.first(where: { $0.lowercased() == normalized }) ?? seed
        } else {
            categoryFilter = seed
        }
        categoryFiltersExpanded = true
        onConsumeCategoryFilter?()
    }

    private func rebuildCategoryCounts(from items: [WardrobeItem]) {
        categoryCounts = WardrobeCategoryDisplay.rebuildCategoryCounts(from: items)
    }

    private func rebuildCategoryCounts(from summary: WardrobeSummary) {
        categoryCounts = WardrobeCategoryDisplay.rebuildCategoryCounts(from: summary)
    }

    private func scheduleDelete(item: WardrobeItem) {
        Task { @MainActor in
            await commitPendingDelete()
            completionSelection.remove(item)
            pendingDeleteItem = item
            pendingDeleteTask?.cancel()
            pendingDeleteTask = Task {
                try? await Task.sleep(nanoseconds: 5_000_000_000)
                guard !Task.isCancelled else { return }
                await commitPendingDelete()
            }
        }
    }

    @MainActor
    private func undoPendingDelete() {
        pendingDeleteTask?.cancel()
        pendingDeleteTask = nil
        pendingDeleteItem = nil
    }

    @MainActor
    private func commitPendingDelete() async {
        guard let item = pendingDeleteItem else { return }
        pendingDeleteTask?.cancel()
        pendingDeleteTask = nil

        do {
            try await APIService.shared.deleteWardrobeItem(id: item.id)
            pendingDeleteItem = nil
            await load()
        } catch {
            pendingDeleteItem = nil
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    private func load() async {
        guard !isRequestInFlight else { return }
        isRequestInFlight = true
        isLoading = true
        errorMessage = nil
        defer { isRequestInFlight = false }
        do {
            async let summaryTask = APIService.shared.getWardrobeSummary()
            let loaded = try await loadAllWardrobeItems()
            let summary = try await summaryTask

            allWardrobeItems = loaded.items
            response = loaded.response
            wardrobeSummary = summary
            rebuildCategoryCounts(from: summary)
            if categoryFilter != "All" && countForCategory(categoryFilter) == 0 {
                categoryFilter = "All"
            }
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            allWardrobeItems = []
            response = nil
            wardrobeSummary = nil
            categoryCounts = [:]
            categoryInfoDismissTask?.cancel()
            categoryInfoDismissTask = nil
            categoryInfoMessage = nil
        }
    }

    private func loadAllWardrobeItems() async throws -> (items: [WardrobeItem], response: WardrobeListResponse) {
        let pageSize = 100
        var offset = 0
        var allItems: [WardrobeItem] = []
        var lastResponse: WardrobeListResponse?

        while true {
            let page = try await APIService.shared.getWardrobe(category: nil, limit: pageSize, offset: offset)
            lastResponse = page
            allItems.append(contentsOf: page.items)
            if page.items.isEmpty || allItems.count >= page.total {
                break
            }
            offset += page.items.count
        }

        guard let lastResponse else {
            throw APIServiceError.invalidResponse
        }

        return (allItems, WardrobeListResponse(
            items: allItems,
            total: lastResponse.total,
            limit: lastResponse.total,
            offset: 0
        ))
    }

    private func showCategoryInfoToast(_ message: String) {
        categoryInfoDismissTask?.cancel()
        categoryInfoMessage = message
        categoryInfoDismissTask = Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            guard !Task.isCancelled else { return }
            await MainActor.run {
                if categoryInfoMessage == message {
                    categoryInfoMessage = nil
                }
                categoryInfoDismissTask = nil
            }
        }
    }

    private var historySuggestionsSheet: some View {
        NavigationView {
            VStack(spacing: 14) {
                if let sourceItem = pastSuggestionsLoader.sourceItem {
                    HStack(spacing: 12) {
                        if let image = WardrobeImageData.decodeUIImage(from: sourceItem.image_data) {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 48, height: 48)
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        } else {
                            Image(systemName: "photo")
                                .frame(width: 48, height: 48)
                                .foregroundColor(.secondary)
                                .background(Color.white.opacity(0.06))
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("History Suggestions")
                                .font(.title3.weight(.semibold))
                            Text("Showing history outfits for selected item: \(sourceItem.category.capitalized)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                }

                Group {
                if !pastSuggestionsLoader.suggestions.isEmpty {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(pastSuggestionsLoader.suggestions) { entry in
                                HistorySuggestionCardView(entry: entry) {
                                    onSelectHistorySuggestion?(entry)
                                    pastSuggestionsLoader.showSheet = false
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 12)
                    }
                    .accessibilityIdentifier("wardrobe.historySuggestionsList")
                } else if let error = pastSuggestionsLoader.error {
                    VStack(spacing: 16) {
                        Text(error)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        Button("Close") {
                            pastSuggestionsLoader.showSheet = false
                        }
                        .buttonStyle(.bordered)
                    }
                    .accessibilityIdentifier("wardrobe.historySuggestionsError")
                } else {
                    ProgressView("Loading...")
                        .accessibilityIdentifier("wardrobe.historySuggestionsLoading")
                }
            }
            }
            .padding(.top, 8)
            .background(
                LinearGradient(
                    colors: [AppTheme.bgPrimary, AppTheme.bgSecondary],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
            )
            .navigationTitle("Past Suggestions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        pastSuggestionsLoader.showSheet = false
                    }
                }
            }
        }
    }

}

struct WardrobeCardView: View {
    let item: WardrobeItem
    let image: UIImage?
    let onGetSuggestion: (() -> Void)?
    let onPastSuggestions: () -> Void
    var isPastSuggestionsLoading: Bool = false
    let onEdit: () -> Void
    let onDelete: () -> Void
    let onShowImage: (UIImage) -> Void
    var isCompletionSelectionMode: Bool = false
    var isSelectedForCompletion: Bool = false
    var isCompletionEligible: Bool = true
    var completionSlotLabel: String? = nil
    var onToggleCompletionSelection: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 14) {
                imageBlock

                VStack(alignment: .leading, spacing: 6) {
                    Text(WardrobeCategoryDisplay.wardrobeCategoryLabel(item.category))
                        .font(.title3.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)
                        .accessibilityIdentifier("wardrobe.row.category.\(item.id)")

                    Text("Color: \(item.color?.isEmpty == false ? item.color! : "—")")
                        .font(.title3.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)

                    Text(item.description?.isEmpty == false ? item.description! : "No description available.")
                        .font(.title3)
                        .foregroundColor(AppTheme.textSecondary)
                        .lineLimit(3)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            if isCompletionSelectionMode {
                completionSelectionRow
            } else {
                HStack(spacing: 10) {
                    if let onGetSuggestion {
                        WardrobeTopActionButton(
                            title: WardrobeCardUx.styleThisItemTitle,
                            systemImage: "sparkles",
                            isPrimary: true,
                            accessibilityLabel: WardrobeCardUx.styleThisItemAccessibilityLabel,
                            accessibilityIdentifier: WardrobeCardUx.heroButtonIdentifier(itemId: item.id),
                            action: onGetSuggestion
                        )
                        .frame(maxWidth: .infinity, minHeight: 48)
                    }

                    wardrobeOverflowMenu
                }
            }
        }
        .padding(14)
        .background(isSelectedForCompletion ? AppTheme.accentSoft : AppTheme.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(isSelectedForCompletion ? AppTheme.accent : AppTheme.border, lineWidth: isSelectedForCompletion ? 2 : 1)
        )
        // Rounds card chrome only. SwiftUI Menu below uses native popover presentation
        // outside this view's bounds, so overflow items are not clipped (unlike web).
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var completionSelectionRow: some View {
        HStack(spacing: 10) {
            if isCompletionEligible {
                Button {
                    onToggleCompletionSelection?()
                } label: {
                    Label(
                        isSelectedForCompletion ? "Selected" : "Select",
                        systemImage: isSelectedForCompletion ? "checkmark.circle.fill" : "circle"
                    )
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(isSelectedForCompletion ? .white : AppTheme.textPrimary)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .background(isSelectedForCompletion ? AppTheme.accent : AppTheme.accentSoft)
                    .overlay(
                        Capsule()
                            .stroke(isSelectedForCompletion ? AppTheme.accent.opacity(0.35) : AppTheme.border, lineWidth: 1)
                    )
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(isSelectedForCompletion ? "Selected for outfit completion" : "Select for outfit completion")
                .accessibilityIdentifier("wardrobe.multiSelect.item.\(item.id)")
            } else {
                Label("Not eligible for completion", systemImage: "minus.circle")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .background(AppTheme.bgSecondary.opacity(0.7))
                    .clipShape(Capsule())
                    .accessibilityIdentifier("wardrobe.multiSelect.unsupported.\(item.id)")
            }

            if let completionSlotLabel {
                Text(completionSlotLabel)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(AppTheme.bgSecondary.opacity(0.7))
                    .clipShape(Capsule())
            }
        }
    }

    /// Native SwiftUI `Menu` — popover is presented by UIKit and is not clipped by card `clipShape`.
    private var wardrobeOverflowMenu: some View {
        Menu {
            Button {
                if let image {
                    onShowImage(image)
                }
            } label: {
                Label(
                    WardrobeCardMenuAction.viewImage.title,
                    systemImage: WardrobeCardMenuAction.viewImage.systemImage
                )
            }
            .disabled(image == nil)
            .accessibilityIdentifier(
                WardrobeCardUx.menuItemIdentifier(itemId: item.id, action: .viewImage)
            )

            Button(action: onEdit) {
                Label(
                    WardrobeCardMenuAction.edit.title,
                    systemImage: WardrobeCardMenuAction.edit.systemImage
                )
            }
            .accessibilityIdentifier(
                WardrobeCardUx.menuItemIdentifier(itemId: item.id, action: .edit)
            )

            Button(action: onPastSuggestions) {
                Label(
                    WardrobeCardMenuAction.history.title,
                    systemImage: WardrobeCardMenuAction.history.systemImage
                )
            }
            .disabled(isPastSuggestionsLoading)
            .accessibilityLabel(
                isPastSuggestionsLoading
                    ? WardrobeCardUx.pastSuggestionsLoadingAccessibilityLabel
                    : WardrobeCardUx.pastSuggestionsAccessibilityLabel
            )
            .accessibilityIdentifier(
                WardrobeCardUx.menuItemIdentifier(itemId: item.id, action: .history)
            )

            Button(role: .destructive, action: onDelete) {
                Label(
                    WardrobeCardMenuAction.delete.title,
                    systemImage: WardrobeCardMenuAction.delete.systemImage
                )
            }
            .accessibilityIdentifier(
                WardrobeCardUx.menuItemIdentifier(itemId: item.id, action: .delete)
            )
        } label: {
            Image(systemName: "ellipsis.circle")
                .font(.title2)
                .foregroundColor(AppTheme.textPrimary)
                .frame(width: 48, height: 48)
                .accessibilityElement(children: .ignore)
                .accessibilityAddTraits(.isButton)
                .accessibilityLabel(WardrobeCardUx.menuTriggerAccessibilityLabel)
                .accessibilityIdentifier(WardrobeCardUx.menuTriggerIdentifier(itemId: item.id))
        }
    }

    private var imageBlock: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 130, height: 130)
                    .clipped()
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(AppTheme.accent, lineWidth: 2)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .accessibilityHidden(true)
            } else {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white.opacity(0.06))
                    .frame(width: 130, height: 130)
                    .overlay(
                        Image(systemName: "photo")
                            .font(.title3)
                            .foregroundColor(AppTheme.textSecondary)
                    )
                    .accessibilityHidden(true)
            }
        }
        .overlay(alignment: .topTrailing) {
            if isSelectedForCompletion {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(.white)
                    .background(AppTheme.accent.clipShape(Circle()))
                    .padding(6)
                    .accessibilityHidden(true)
            }
        }
    }
}

struct WardrobeTopActionButton: View {
    let title: String
    let systemImage: String
    let isPrimary: Bool
    var isLoading: Bool = false
    var accessibilityLabel: String? = nil
    var accessibilityIdentifier: String? = nil
    let action: () -> Void

    private var displayTitle: String {
        isLoading ? "Loading…" : title
    }

    var body: some View {
        Group {
            if let accessibilityIdentifier {
                buttonCore
                    .accessibilityIdentifier(accessibilityIdentifier)
            } else {
                buttonCore
            }
        }
    }

    private var buttonCore: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                    Text("Loading…")
                        .font(.subheadline.weight(.semibold))
                } else {
                    Label(title, systemImage: systemImage)
                }
            }
            .font(.subheadline.weight(.semibold))
            .lineLimit(1)
            .minimumScaleFactor(0.82)
            .foregroundColor(isPrimary ? .white : AppTheme.textPrimary)
            .frame(maxWidth: .infinity, minHeight: 50)
            .padding(.horizontal, 14)
            .background(isPrimary ? AppTheme.accent : AppTheme.accentSoft)
            .overlay(
                Capsule()
                    .stroke(isPrimary ? AppTheme.accent.opacity(0.25) : AppTheme.border, lineWidth: 1)
            )
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel(accessibilityLabel ?? displayTitle)
    }
}

struct WardrobeActionButton: View {
    let title: String
    let systemImage: String
    var isLoading: Bool = false
    var isPrimary: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                } else {
                    Image(systemName: systemImage)
                        .font(.caption.weight(.bold))
                }
                Text(isLoading ? "Loading..." : title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
            }
            .foregroundColor(isPrimary ? .white : AppTheme.accent)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(isPrimary ? AppTheme.accent : AppTheme.accentSoft)
            .overlay(
                Capsule()
                    .stroke(isPrimary ? AppTheme.accent.opacity(0.2) : AppTheme.accent.opacity(0.35), lineWidth: 1)
            )
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

struct HistorySuggestionCardView: View {
    let entry: OutfitHistoryEntry
    let onUse: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("SUGGESTION #\(entry.id)")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.secondary)
                    Text(formattedDate(entry.created_at))
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.08))
                        .clipShape(Capsule())
                }

                Spacer()

                Button("Use This", action: onUse)
                    .font(.headline.weight(.semibold))
                    .padding(.horizontal, 18)
                    .padding(.vertical, 10)
                    .foregroundColor(.white)
                    .background(AppTheme.accent)
                    .clipShape(Capsule())
                    .accessibilityIdentifier(WardrobeCardUx.historyUseThisIdentifier(entryId: entry.id))
            }

            if let prompt = entry.text_input, !prompt.isEmpty {
                Text("Prompt: \(prompt)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                SuggestionSlotCell(icon: "👔", title: "Shirt", value: entry.shirt)
                SuggestionSlotCell(icon: "👖", title: "Trouser", value: entry.trouser)
                SuggestionSlotCell(icon: "🧥", title: "Blazer", value: entry.blazer)
                SuggestionSlotCell(icon: "👞", title: "Shoes", value: entry.shoes)
            }

            SuggestionSlotCell(icon: "🎀", title: "Belt", value: entry.belt)

            VStack(alignment: .leading, spacing: 8) {
                Text("WHY THIS WORKS")
                    .font(.caption.weight(.bold))
                    .foregroundColor(AppTheme.accent)
                Text(entry.reasoning)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(4)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white.opacity(0.04))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(AppTheme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .padding(14)
        .glassCard()
    }

    private func formattedDate(_ raw: String) -> String {
        if let date = ISO8601DateFormatter().date(from: raw) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            formatter.timeStyle = .short
            return formatter.string(from: date)
        }
        return raw
    }
}

struct SuggestionSlotCell: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("\(icon) \(title): \(value)")
                .font(.subheadline.weight(.medium))
                .foregroundColor(.white.opacity(0.95))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.05))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}
