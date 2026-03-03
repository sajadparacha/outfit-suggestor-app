//
//  WardrobeListView.swift
//  OutfitSuggestor
//

import SwiftUI

private let wardrobeCategoryOptions = ["All", "shirt", "trouser", "blazer", "shoes", "belt", "other"]

struct WardrobeListView: View {
    @State private var response: WardrobeListResponse?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showAddSheet = false
    @State private var categoryFilter = "All"
    var onGetSuggestionFromItem: ((Int) -> Void)?

    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading wardrobe…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = errorMessage {
                VStack {
                    Text(err).foregroundColor(.red).padding()
                    Button("Retry") { load() }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let resp = response, resp.items.isEmpty {
                VStack(spacing: 16) {
                    Text("No wardrobe items yet.")
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    Button("Add item") { showAddSheet = true }
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let resp = response {
                VStack(spacing: 0) {
                    Picker("Category", selection: $categoryFilter) {
                        ForEach(wardrobeCategoryOptions, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.menu)
                    .padding(.horizontal)
                    .onChange(of: categoryFilter) { _ in load() }
                    List {
                        ForEach(resp.items) { item in
                            HStack {
                                NavigationLink(destination: WardrobeFormView(item: item, onSaved: { load() }, onCancel: { })) {
                                    WardrobeRowView(item: item)
                                }
                                if let onGet = onGetSuggestionFromItem {
                                    Button("Get suggestion") {
                                        onGet(item.id)
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .controlSize(.small)
                                }
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) { deleteItem(id: item.id) } {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                }
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
        .onAppear { load() }
        .sheet(isPresented: $showAddSheet) {
            WardrobeFormView(item: nil, onSaved: { showAddSheet = false; load() }, onCancel: { showAddSheet = false })
        }
    }

    private func deleteItem(id: Int) {
        Task {
            do {
                try await APIService.shared.deleteWardrobeItem(id: id)
                await MainActor.run { load() }
            } catch {
                await MainActor.run { errorMessage = error.localizedDescription }
            }
        }
    }

    private func load() {
        isLoading = true
        errorMessage = nil
        let category: String? = (categoryFilter == "All") ? nil : categoryFilter
        Task {
            do {
                let r = try await APIService.shared.getWardrobe(category: category, limit: 100)
                await MainActor.run {
                    response = r
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
}

struct WardrobeRowView: View {
    let item: WardrobeItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(item.category) – \(item.color ?? "—")")
                .font(.headline)
            if let d = item.description, !d.isEmpty {
                Text(d).font(.subheadline).foregroundColor(.secondary).lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }
}
