//
//  WardrobeListView.swift
//  OutfitSuggestor
//

import SwiftUI
import UIKit

private let wardrobeCategoryOptions = ["All", "shirt", "trouser", "blazer", "shoes", "belt", "other"]

struct WardrobeListView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var response: WardrobeListResponse?
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
    var onGetSuggestionFromItem: ((Int) -> Void)?
    var onSelectHistorySuggestion: ((OutfitHistoryEntry) -> Void)?
    @State private var historyLoadingForItem: Int?
    @State private var showHistorySuggestionsSheet = false
    @State private var historySuggestions: [OutfitHistoryEntry] = []
    @State private var historySuggestionsError: String?
    @State private var historySourceItem: WardrobeItem?
    @State private var editingItem: WardrobeItem?
    @State private var fullScreenImage: UIImage?
    @State private var historyImageIndex: Set<String> = []
    @State private var historyItemIdIndex: Set<Int> = []
    
    private var categoryVisibleItems: [WardrobeItem] {
        if categoryFilter == "All" {
            return allWardrobeItems
        }
        return allWardrobeItems.filter { matchesCategoryFilter($0.category, filter: categoryFilter) }
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

    private var visibleWardrobeItemIDsLabel: String {
        filteredItems.map { String($0.id) }.joined(separator: ",")
    }

    private var isRegularWidth: Bool {
        horizontalSizeClass == .regular
    }

    private var rowActionsWidth: CGFloat {
        isRegularWidth ? 190 : 150
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
                    
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(filteredItems) { item in
                                WardrobeCardView(
                                    item: item,
                                    image: decodeBase64Image(item.image_data),
                                    showPastSuggestions: itemHasPastSuggestions(item) || historyLoadingForItem == item.id,
                                    isPastSuggestionsLoading: historyLoadingForItem == item.id,
                                    onGetSuggestion: onGetSuggestionFromItem == nil ? nil : { onGetSuggestionFromItem?(item.id) },
                                    onPastSuggestions: { Task { await openHistorySuggestions(for: item) } },
                                    onEdit: { editingItem = item },
                                    onDelete: { deleteItem(id: item.id) },
                                    onShowImage: { image in fullScreenImage = image }
                                )
                                .accessibilityIdentifier("wardrobe.row.\(item.id)")
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 12)
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
            guard !hasLoaded else { return }
            hasLoaded = true
            Task { await load() }
        }
        .onDisappear {
            categoryInfoDismissTask?.cancel()
            categoryInfoDismissTask = nil
        }
        .sheet(isPresented: $showAddSheet) {
            WardrobeFormView(item: nil, onSaved: { showAddSheet = false; Task { await load() } }, onCancel: { showAddSheet = false })
        }
        .sheet(isPresented: $showHistorySuggestionsSheet) {
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
    
    private var categoryFilterChips: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Filter by:")
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
            
            LazyVGrid(columns: [GridItem(.adaptive(minimum: isRegularWidth ? 130 : 106), spacing: 10)], alignment: .leading, spacing: 10) {
                ForEach(wardrobeCategoryOptions, id: \.self) { category in
                    let isActive = categoryFilter == category
                    Button {
                        guard categoryFilter != category else { return }
                        categoryInfoDismissTask?.cancel()
                        categoryInfoDismissTask = nil
                        categoryInfoMessage = nil
                        if category != "All" && countForCategory(category) == 0 {
                            categoryFilter = "All"
                            showCategoryInfoToast("No items found in \(displayName(for: category)). Showing all wardrobe items.")
                        } else {
                            categoryFilter = category
                        }
                    } label: {
                        Text("\(displayName(for: category)) (\(countForCategory(category)))")
                            .font(.body.weight(.semibold))
                            .foregroundColor(isActive ? .white : AppTheme.textPrimary)
                            .lineLimit(1)
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
            }
        }
    }

    private func displayName(for category: String) -> String {
        switch category.lowercased() {
        case "all": return "All"
        case "shirt": return "Shirt"
        case "trouser": return "Trousers"
        case "blazer": return "Blazer"
        case "shoes": return "Shoes"
        case "belt": return "Belt"
        default: return "Other"
        }
    }
    
    private func countForCategory(_ category: String) -> Int {
        if category == "All" {
            return response?.total ?? 0
        }
        return categoryCounts[category.lowercased()] ?? 0
    }
    
    private func matchesCategoryFilter(_ itemCategory: String, filter: String) -> Bool {
        let normalized = itemCategory.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch filter.lowercased() {
        case "shirt":
            return ["shirt", "t_shirt", "t-shirt", "polo"].contains(normalized)
        case "trouser":
            return ["trouser", "trousers", "pants", "jeans", "shorts"].contains(normalized)
        case "blazer":
            return ["blazer", "jacket", "suit"].contains(normalized)
        case "shoes":
            return ["shoe", "shoes"].contains(normalized)
        case "belt":
            return ["belt", "belts"].contains(normalized)
        case "other":
            return !matchesCategoryFilter(itemCategory, filter: "shirt")
                && !matchesCategoryFilter(itemCategory, filter: "trouser")
                && !matchesCategoryFilter(itemCategory, filter: "blazer")
                && !matchesCategoryFilter(itemCategory, filter: "shoes")
                && !matchesCategoryFilter(itemCategory, filter: "belt")
        default:
            return false
        }
    }
    
    private func rebuildCategoryCounts(from items: [WardrobeItem]) {
        var counts: [String: Int] = [
            "shirt": 0,
            "trouser": 0,
            "blazer": 0,
            "shoes": 0,
            "belt": 0,
            "other": 0
        ]
        for item in items {
            if matchesCategoryFilter(item.category, filter: "shirt") {
                counts["shirt", default: 0] += 1
            } else if matchesCategoryFilter(item.category, filter: "trouser") {
                counts["trouser", default: 0] += 1
            } else if matchesCategoryFilter(item.category, filter: "blazer") {
                counts["blazer", default: 0] += 1
            } else if matchesCategoryFilter(item.category, filter: "shoes") {
                counts["shoes", default: 0] += 1
            } else if matchesCategoryFilter(item.category, filter: "belt") {
                counts["belt", default: 0] += 1
            } else {
                counts["other", default: 0] += 1
            }
        }
        categoryCounts = counts
    }

    private func deleteItem(id: Int) {
        Task {
            do {
                try await APIService.shared.deleteWardrobeItem(id: id)
                await load()
            } catch {
                await MainActor.run { errorMessage = error.localizedDescription }
            }
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
            let allResponse = try await APIService.shared.getWardrobe(category: nil, limit: 100)
            allWardrobeItems = allResponse.items
            response = allResponse
            rebuildCategoryCounts(from: allResponse.items)
            if categoryFilter != "All" && countForCategory(categoryFilter) == 0 {
                categoryFilter = "All"
            }
            isLoading = false
            await refreshHistoryIndex(for: allResponse.items)
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            historyImageIndex = []
            historyItemIdIndex = []
            allWardrobeItems = []
            categoryCounts = [:]
            categoryInfoDismissTask?.cancel()
            categoryInfoDismissTask = nil
            categoryInfoMessage = nil
        }
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

    @MainActor
    private func openHistorySuggestions(for item: WardrobeItem) async {
        historyLoadingForItem = item.id
        historySourceItem = item
        historySuggestionsError = nil
        historySuggestions = []
        defer { historyLoadingForItem = nil }

        do {
            let allHistory = try await APIService.shared.getOutfitHistory(limit: 100)
            let matches = allHistory.filter { entry in
                historyEntryReferencesItem(entry, item: item)
            }
            historySuggestions = matches
            if matches.isEmpty {
                historySuggestionsError = "No history suggestions found for this wardrobe item yet."
            }
            showHistorySuggestionsSheet = true
        } catch {
            historySuggestionsError = error.localizedDescription
            showHistorySuggestionsSheet = true
        }
    }

    private func historyEntryReferencesItem(_ entry: OutfitHistoryEntry, item: WardrobeItem) -> Bool {
        if entry.source_wardrobe_item_id == item.id {
            return true
        }
        let slotIds = [entry.shirt_id, entry.trouser_id, entry.blazer_id, entry.shoes_id, entry.belt_id]
        if slotIds.contains(where: { $0 == item.id }) {
            return true
        }
        guard let itemImage = item.image_data, let entryImage = entry.image_data else {
            return false
        }
        return itemImage == entryImage
    }

    @MainActor
    private func refreshHistoryIndex(for items: [WardrobeItem]) async {
        guard !items.isEmpty else {
            historyImageIndex = []
            historyItemIdIndex = []
            return
        }
        do {
            let allHistory = try await APIService.shared.getOutfitHistory(limit: 100)
            historyImageIndex = Set(
                allHistory.compactMap { $0.image_data?.isEmpty == false ? $0.image_data : nil }
            )
            historyItemIdIndex = Set(
                allHistory.flatMap { entry in
                    [
                        entry.source_wardrobe_item_id,
                        entry.shirt_id,
                        entry.trouser_id,
                        entry.blazer_id,
                        entry.shoes_id,
                        entry.belt_id
                    ].compactMap { $0 }
                }
            )
        } catch {
            historyImageIndex = []
            historyItemIdIndex = []
        }
    }

    private func itemHasPastSuggestions(_ item: WardrobeItem) -> Bool {
        if historyItemIdIndex.contains(item.id) {
            return true
        }
        guard let imageData = item.image_data else { return false }
        return historyImageIndex.contains(imageData)
    }

    private var historySuggestionsSheet: some View {
        NavigationView {
            VStack(spacing: 14) {
                if let sourceItem = historySourceItem {
                    HStack(spacing: 12) {
                        if let image = decodeBase64Image(sourceItem.image_data) {
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
                if let error = historySuggestionsError {
                    VStack(spacing: 16) {
                        Text(error)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        Button("Close") {
                            showHistorySuggestionsSheet = false
                        }
                        .buttonStyle(.bordered)
                    }
                } else if historySuggestions.isEmpty {
                    ProgressView("Loading...")
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(historySuggestions) { entry in
                                HistorySuggestionCardView(entry: entry) {
                                    onSelectHistorySuggestion?(entry)
                                    showHistorySuggestionsSheet = false
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 12)
                    }
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
                        showHistorySuggestionsSheet = false
                    }
                }
            }
        }
    }

    private func decodeBase64Image(_ value: String?) -> UIImage? {
        guard let raw = value, !raw.isEmpty else { return nil }
        let payload = raw.contains("base64,") ? String(raw.split(separator: ",").last ?? "") : raw
        let cleaned = payload.replacingOccurrences(of: "\\s", with: "", options: .regularExpression)
        guard let data = Data(base64Encoded: cleaned) else { return nil }
        return UIImage(data: data)
    }
}

struct WardrobeCardView: View {
    let item: WardrobeItem
    let image: UIImage?
    let showPastSuggestions: Bool
    let isPastSuggestionsLoading: Bool
    let onGetSuggestion: (() -> Void)?
    let onPastSuggestions: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void
    let onShowImage: (UIImage) -> Void
    private let actionButtonWidth: CGFloat = 220
    private let actionButtonHeight: CGFloat = 52

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            imageBlock

            VStack(alignment: .leading, spacing: 6) {
                Text(item.category.capitalized)
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

            VStack(alignment: .trailing, spacing: 10) {
                if let onGetSuggestion {
                    WardrobeTopActionButton(
                        title: "Get Suggestion",
                        systemImage: "sparkles",
                        isPrimary: true,
                        action: onGetSuggestion
                    )
                    .frame(width: actionButtonWidth, height: actionButtonHeight)
                    .accessibilityIdentifier("wardrobe.getSuggestion.\(item.id)")
                } else {
                    Color.clear
                        .frame(width: actionButtonWidth, height: actionButtonHeight)
                }

                if showPastSuggestions {
                    WardrobeTopActionButton(
                        title: isPastSuggestionsLoading ? "Loading..." : "Past Suggestions",
                        systemImage: "clock.arrow.circlepath",
                        isPrimary: false,
                        action: onPastSuggestions
                    )
                    .frame(width: actionButtonWidth, height: actionButtonHeight)
                    .disabled(isPastSuggestionsLoading)
                    .accessibilityIdentifier("wardrobe.pastSuggestions.\(item.id)")
                } else {
                    Color.clear
                        .frame(width: actionButtonWidth, height: actionButtonHeight)
                }

                HStack(spacing: 10) {
                    Button(action: onEdit) {
                        Image(systemName: "pencil")
                            .font(.body.weight(.semibold))
                    }
                    .buttonStyle(.plain)
                    .foregroundColor(AppTheme.accent)

                    Button(role: .destructive, action: onDelete) {
                        Image(systemName: "trash")
                            .font(.body.weight(.semibold))
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(width: actionButtonWidth, alignment: .trailing)
        }
        .padding(14)
        .background(AppTheme.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(AppTheme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var imageBlock: some View {
        Group {
            if let image {
                Button(action: { onShowImage(image) }) {
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
                }
                .buttonStyle(.plain)
            } else {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white.opacity(0.06))
                    .frame(width: 130, height: 130)
                    .overlay(
                        Image(systemName: "photo")
                            .font(.title3)
                            .foregroundColor(AppTheme.textSecondary)
                    )
            }
        }
    }
}

struct WardrobeTopActionButton: View {
    let title: String
    let systemImage: String
    let isPrimary: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
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
