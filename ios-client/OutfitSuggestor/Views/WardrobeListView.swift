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
    @State private var hasLoaded = false
    @State private var isRequestInFlight = false
    @State private var showAddSheet = false
    @State private var categoryFilter = "All"
    @State private var searchText = ""
    var onGetSuggestionFromItem: ((Int) -> Void)?
    
    private var filteredItems: [WardrobeItem] {
        guard let items = response?.items else { return [] }
        if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return items }
        let query = searchText.lowercased()
        return items.filter { item in
            (item.description?.lowercased().contains(query) ?? false) ||
            (item.color?.lowercased().contains(query) ?? false) ||
            (item.name?.lowercased().contains(query) ?? false) ||
            item.category.lowercased().contains(query)
        }
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
            } else if let resp = response, resp.items.isEmpty {
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
                    HStack {
                        Picker("Category", selection: $categoryFilter) {
                            ForEach(wardrobeCategoryOptions, id: \.self) { Text($0).tag($0) }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: categoryFilter) { _ in Task { await load() } }
                    }
                    .padding(.horizontal)
                    
                    TextField("Search wardrobe...", text: $searchText)
                        .textFieldStyle(.roundedBorder)
                        .padding(.horizontal)
                        .padding(.vertical, 8)
                    
                    List {
                        ForEach(filteredItems) { item in
                            HStack {
                                NavigationLink(destination: WardrobeFormView(item: item, onSaved: { Task { await load() } }, onCancel: { })) {
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
                                SwiftUI.Button(role: .destructive, action: { deleteItem(id: item.id) }) {
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
        .onAppear {
            guard !hasLoaded else { return }
            hasLoaded = true
            Task { await load() }
        }
        .sheet(isPresented: $showAddSheet) {
            WardrobeFormView(item: nil, onSaved: { showAddSheet = false; Task { await load() } }, onCancel: { showAddSheet = false })
        }
    }

    private func deleteItem(id: Int) {
        Task {
            do {
                try await APIService.shared.deleteWardrobeItem(id: id)
                await MainActor.run { Task { await load() } }
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
        let category: String? = (categoryFilter == "All") ? nil : categoryFilter
        defer { isRequestInFlight = false }
        do {
            let r = try await APIService.shared.getWardrobe(category: category, limit: 100)
            response = r
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
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
