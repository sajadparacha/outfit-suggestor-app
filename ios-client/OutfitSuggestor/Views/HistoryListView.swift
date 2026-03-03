//
//  HistoryListView.swift
//  OutfitSuggestor
//

import SwiftUI
import UIKit

struct HistoryListView: View {
    @State private var entries: [OutfitHistoryEntry] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var sortNewestFirst = true
    @State private var fullScreenImage: UIImage?
    var onSelectEntry: (OutfitHistoryEntry) -> Void
    
    private var filteredAndSorted: [OutfitHistoryEntry] {
        var list = entries
        if !searchText.trimmingCharacters(in: .whitespaces).isEmpty {
            let q = searchText.lowercased()
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
    
    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading history…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = errorMessage {
                VStack {
                    Text(err).foregroundColor(.red).padding()
                    Button("Retry") { load() }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if entries.isEmpty {
                Text("No outfit history yet. Get some suggestions on the main tab.")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(spacing: 0) {
                    HStack(spacing: 8) {
                        HStack {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(.secondary)
                            TextField("Search by items, colors, context…", text: $searchText)
                                .textFieldStyle(.plain)
                        }
                        .padding(8)
                        .background(Color(UIColor.secondarySystemBackground))
                        .cornerRadius(8)
                        Picker("Sort", selection: $sortNewestFirst) {
                            Text("Newest").tag(true)
                            Text("Oldest").tag(false)
                        }
                        .pickerStyle(.menu)
                        .frame(width: 100)
                    }
                    .padding()
                    List {
                        ForEach(filteredAndSorted) { entry in
                            HistoryRowView(entry: entry) {
                                onSelectEntry(entry)
                            } onDelete: {
                                delete(entry)
                            } onViewImage: { image in
                                fullScreenImage = image
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("History")
        .onAppear { load() }
        .fullScreenCover(isPresented: Binding(get: { fullScreenImage != nil }, set: { if !$0 { fullScreenImage = nil } })) {
            if let img = fullScreenImage {
                FullScreenImageView(image: img) {
                    fullScreenImage = nil
                }
            }
        }
    }
    
    private func load() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                let list = try await APIService.shared.getOutfitHistory(limit: 50)
                await MainActor.run {
                    entries = list
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
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
}

struct HistoryRowView: View {
    let entry: OutfitHistoryEntry
    let onSelect: () -> Void
    let onDelete: () -> Void
    var onViewImage: ((UIImage) -> Void)?
    
    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            if let onView = onViewImage {
                HStack(spacing: 6) {
                    if let b64 = entry.image_data, let data = Data(base64Encoded: b64), let img = UIImage(data: data) {
                        Button(action: { onView(img) }) {
                            Image(uiImage: img)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 44, height: 44)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    }
                    if let b64 = entry.model_image, let data = Data(base64Encoded: b64), let img = UIImage(data: data) {
                        Button(action: { onView(img) }) {
                            Image(uiImage: img)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 44, height: 44)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.shirt).font(.subheadline).lineLimit(1)
                Text(entry.created_at).font(.caption).foregroundColor(.secondary)
            }
            Spacer()
            Button("Load", action: onSelect)
            Button("Delete", role: .destructive, action: onDelete)
        }
        .padding(.vertical, 4)
    }
}
