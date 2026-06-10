//
//  HistoryListView.swift
//  OutfitSuggestor
//

import SwiftUI
import UIKit
import Foundation

struct HistoryListView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var entries: [OutfitHistoryEntry] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var hasLoaded = false
    @State private var isRequestInFlight = false
    @State private var searchText = ""
    @State private var appliedSearchText = ""
    @State private var sortNewestFirst = true
    @State private var hasLoadedAll = false
    @State private var fullScreenImage: UIImage?
    @State private var pendingDeleteEntry: OutfitHistoryEntry?
    var onSelectEntry: (OutfitHistoryEntry) -> Void
    
    private var filteredAndSorted: [OutfitHistoryEntry] {
        var list = entries
        if !appliedSearchText.trimmingCharacters(in: .whitespaces).isEmpty {
            let q = appliedSearchText.lowercased()
            list = list.filter {
                $0.shirt.lowercased().contains(q) ||
                $0.trouser.lowercased().contains(q) ||
                $0.blazer.lowercased().contains(q) ||
                $0.shoes.lowercased().contains(q) ||
                $0.belt.lowercased().contains(q) ||
                $0.reasoning.lowercased().contains(q) ||
                ($0.text_input?.lowercased().contains(q) ?? false)
            }
        }
        list.sort { a, b in
            let cmp = a.created_at.compare(b.created_at)
            return sortNewestFirst ? (cmp == .orderedDescending) : (cmp == .orderedAscending)
        }
        return list
    }

    private var isRegularWidth: Bool {
        horizontalSizeClass == .regular
    }
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [AppTheme.bgPrimary, AppTheme.bgSecondary],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            Group {
                if isLoading {
                    ProgressView("Loading history…")
                        .tint(.white)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = errorMessage {
                    VStack(spacing: 12) {
                        Text(err)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                        Button("Retry") { Task { await load(limit: hasLoadedAll ? 200 : 2) } }
                            .buttonStyle(.borderedProminent)
                            .tint(AppTheme.accent)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if entries.isEmpty {
                    Text("No outfit history yet. Get some suggestions on the main tab.")
                        .foregroundColor(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 14) {
                            headerSection
                            searchAndSortSection
                            LazyVStack(spacing: 14) {
                                ForEach(Array(filteredAndSorted.enumerated()), id: \.element.id) { index, entry in
                                    WebStyleHistoryCardView(
                                        entry: entry,
                                        onSelect: { onSelectEntry(entry) },
                                        onDelete: { pendingDeleteEntry = entry },
                                        onViewImage: { image in fullScreenImage = image }
                                    )
                                    .accessibilityElement(children: .contain)
                                    .accessibilityIdentifier("history.card.\(entry.id)")
                                }
                            }
                        }
                        .padding(.horizontal, 14)
                        .padding(.top, 8)
                        .padding(.bottom, 16)
                        .adaptiveContent(maxWidth: 1060)
                    }
                }
            }
        }
        .navigationTitle("Looks")
        .onAppear {
            guard !hasLoaded else { return }
            hasLoaded = true
            Task { await load() }
        }
        .fullScreenCover(isPresented: Binding(get: { fullScreenImage != nil }, set: { if !$0 { fullScreenImage = nil } })) {
            if let img = fullScreenImage {
                FullScreenImageView(image: img) {
                    fullScreenImage = nil
                }
            }
        }
        .confirmationDialog(
            "Delete history entry?",
            isPresented: Binding(
                get: { pendingDeleteEntry != nil },
                set: { if !$0 { pendingDeleteEntry = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let entry = pendingDeleteEntry {
                    delete(entry)
                }
                pendingDeleteEntry = nil
            }
            .accessibilityIdentifier("history.deleteConfirmButton")
            Button("Cancel", role: .cancel) {
                pendingDeleteEntry = nil
            }
            .accessibilityIdentifier("history.deleteCancelButton")
        } message: {
            Text("This outfit suggestion will be removed from your history.")
                .accessibilityIdentifier("history.deleteConfirmDialog")
        }
    }
    
    private var headerSection: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Showing last \(entries.count) entries. Click load all to see more.")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            }
            Spacer()
            if !hasLoadedAll {
                Button {
                    Task { await load(limit: 200) }
                } label: {
                    Label("Load All", systemImage: "arrow.clockwise.circle.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(AppTheme.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(AppTheme.border, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("history.loadAllButton")
            }
        }
    }
    
    private var searchAndSortSection: some View {
        let controlHeight: CGFloat = 52
        let searchControl = HStack(spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(AppTheme.textSecondary)
                TextField("Search by clothing items, colors, or context...", text: $searchText)
                    .foregroundColor(AppTheme.textPrimary)
                    .textFieldStyle(.plain)
                    .submitLabel(.search)
                    .onSubmit { applySearch() }
                    .accessibilityIdentifier("history.searchField")
            }
            .padding(.horizontal, 12)
            .frame(height: controlHeight)
            .background(AppTheme.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(AppTheme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }

        let searchButton = Button("Search") {
                applySearch()
            }
            .font(.subheadline.weight(.semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 14)
            .frame(height: controlHeight)
            .background(AppTheme.accent)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .accessibilityIdentifier("history.searchButton")

        let sortMenu = Menu {
                Button("Newest First") { sortNewestFirst = true }
                Button("Oldest First") { sortNewestFirst = false }
            } label: {
                HStack(spacing: 6) {
                    Text(sortNewestFirst ? "Newest First" : "Oldest First")
                        .lineLimit(1)
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.caption.weight(.semibold))
                }
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
                .frame(maxWidth: .infinity)
                .frame(height: controlHeight)
            }
            .frame(width: isRegularWidth ? 170 : 120)
            .background(AppTheme.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(AppTheme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .accessibilityIdentifier("history.sortMenu")

        return Group {
            if isRegularWidth {
                HStack(spacing: 8) {
                    searchControl
                    searchButton
                    sortMenu
                }
            } else {
                VStack(spacing: 8) {
                    searchControl
                    HStack(spacing: 8) {
                        searchButton
                            .frame(maxWidth: .infinity)
                        sortMenu
                    }
                }
            }
        }
    }
    
    @MainActor
    private func load(limit: Int = 2) async {
        guard !isRequestInFlight else { return }
        isRequestInFlight = true
        isLoading = true
        errorMessage = nil
        defer { isRequestInFlight = false }
        do {
            let list = try await APIService.shared.getOutfitHistory(limit: limit)
            entries = list
            hasLoadedAll = limit > 2
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }
    
    private func delete(_ entry: OutfitHistoryEntry) {
        Task {
            do {
                try await APIService.shared.deleteOutfitHistory(entryId: entry.id)
                await MainActor.run { entries.removeAll { $0.id == entry.id } }
            } catch { }
        }
    }
    
    private func applySearch() {
        appliedSearchText = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

struct WebStyleHistoryCardView: View {
    let entry: OutfitHistoryEntry
    let onSelect: () -> Void
    let onDelete: () -> Void
    var onViewImage: ((UIImage) -> Void)?
    
    private var inputImage: UIImage? {
        decodeBase64Image(entry.image_data)
    }
    
    private var modelImage: UIImage? {
        decodeBase64Image(entry.model_image)
    }
    
    private var hasPrompt: Bool {
        !(entry.text_input?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
    }
    
    private func formattedDate(_ raw: String) -> String {
        let isoFormats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSSSSS",
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss"
        ]
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        for format in isoFormats {
            parser.dateFormat = format
            if let date = parser.date(from: raw) {
                let output = DateFormatter()
                output.dateFormat = "MMM d, yyyy, h:mm a"
                return output.string(from: date)
            }
        }
        if let date = ISO8601DateFormatter().date(from: raw) {
            let output = DateFormatter()
            output.dateFormat = "MMM d, yyyy, h:mm a"
            return output.string(from: date)
        }
        return raw
    }
    
    private func decodeBase64Image(_ value: String?) -> UIImage? {
        guard let raw = value, !raw.isEmpty else { return nil }
        let payload = raw.contains("base64,") ? String(raw.split(separator: ",").last ?? "") : raw
        let cleaned = payload.replacingOccurrences(of: "\\s", with: "", options: .regularExpression)
        guard let data = Data(base64Encoded: cleaned), let image = UIImage(data: data) else { return nil }
        return image
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 8) {
                Text(formattedDate(entry.created_at))
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                    .accessibilityIdentifier("history.card.date.\(entry.id)")
                
                Spacer()
                
                if hasPrompt {
                    Text("Custom")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.accent)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppTheme.accentSoft)
                        .clipShape(Capsule())
                }
                
                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .foregroundColor(.red.opacity(0.85))
                }
                .buttonStyle(.plain)
            }
            
            if let prompt = entry.text_input, !prompt.isEmpty {
                Text("\"\(prompt)\"")
                    .font(.subheadline.italic())
                    .foregroundColor(AppTheme.textSecondary)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white.opacity(0.04))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(AppTheme.border, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            
            VStack(alignment: .leading, spacing: 7) {
                WebOutfitLine(icon: "👔", title: "SHIRT", value: entry.shirt)
                WebOutfitLine(icon: "👖", title: "TROUSER", value: entry.trouser)
                WebOutfitLine(icon: "🧥", title: "BLAZER", value: entry.blazer)
                WebOutfitLine(icon: "👞", title: "SHOES", value: entry.shoes)
                WebOutfitLine(icon: "🎀", title: "BELT", value: entry.belt)
            }
            
            if let onView = onViewImage, inputImage != nil || modelImage != nil {
                HStack(spacing: 8) {
                    if let image = inputImage {
                        Button(action: { onView(image) }) { thumbnail(image: image) }
                            .buttonStyle(.plain)
                    }
                    if let image = modelImage {
                        Button(action: { onView(image) }) { thumbnail(image: image) }
                            .buttonStyle(.plain)
                    }
                }
            }
            
            HStack {
                Spacer()
                Button("Load") {
                    onSelect()
                }
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(AppTheme.accent)
                .clipShape(Capsule())
            }
        }
        .padding(14)
        .glassCard()
    }
    
    @ViewBuilder
    private func thumbnail(image: UIImage) -> some View {
        Image(uiImage: image)
            .resizable()
            .scaledToFill()
            .frame(width: 56, height: 56)
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
            )
            .contentShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct WebOutfitLine: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(icon) \(title)")
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
            Text(value)
                .font(.subheadline)
                .foregroundColor(AppTheme.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
