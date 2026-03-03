//
//  WardrobeFormView.swift
//  OutfitSuggestor
//
//  Add or edit a wardrobe item (category, color, description, optional image).
//

import SwiftUI
import UIKit

private let wardrobeCategories = ["shirt", "trouser", "blazer", "shoes", "belt", "other"]

struct WardrobeFormView: View {
    let item: WardrobeItem?
    let onSaved: () -> Void
    let onCancel: () -> Void

    @State private var category: String
    @State private var color: String
    @State private var description: String
    @State private var selectedImage: UIImage?
    @State private var showImagePicker = false
    @State private var isSaving = false
    @State private var isAnalyzing = false
    @State private var errorMessage: String?
    @State private var showDuplicateAlert = false
    @State private var duplicateExistingItem: WardrobeItem?
    @Environment(\.dismiss) private var dismiss

    init(item: WardrobeItem? = nil, onSaved: @escaping () -> Void, onCancel: @escaping () -> Void) {
        self.item = item
        self.onSaved = onSaved
        self.onCancel = onCancel
        _category = State(initialValue: item?.category ?? wardrobeCategories[0])
        _color = State(initialValue: item?.color ?? "")
        _description = State(initialValue: item?.description ?? "")
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Details") {
                    Picker("Category", selection: $category) {
                        ForEach(wardrobeCategories, id: \.self) { Text($0).tag($0) }
                    }
                    TextField("Color", text: $color)
                        .textContentType(.none)
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }
                Section("Photo") {
                    if let img = selectedImage {
                        Image(uiImage: img)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 160)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        if item == nil {
                            Button(action: analyzePhoto) {
                                HStack {
                                    if isAnalyzing {
                                        ProgressView().scaleEffect(0.8)
                                        Text("Analyzing…")
                                    } else {
                                        Text("Analyze with AI")
                                    }
                                }
                            }
                            .disabled(isAnalyzing)
                        }
                    }
                    Button(selectedImage == nil ? "Add photo" : "Change photo") {
                        showImagePicker = true
                    }
                }
                if let err = errorMessage {
                    Section {
                        Text(err).foregroundColor(.red).font(.caption)
                    }
                }
            }
            .navigationTitle(item == nil ? "Add item" : "Edit item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { onCancel(); dismiss() }
                        .disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(isSaving || color.trimmingCharacters(in: .whitespaces).isEmpty || description.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .sheet(isPresented: $showImagePicker) {
                ImagePicker(selectedImage: $selectedImage)
            }
            .alert("Similar item found", isPresented: $showDuplicateAlert) {
                Button("Cancel", role: .cancel) { duplicateExistingItem = nil }
                Button("Add anyway") {
                    duplicateExistingItem = nil
                    performAdd()
                }
            } message: {
                Text("This image looks similar to an item already in your wardrobe. Add anyway?")
            }
        }
    }

    private func analyzePhoto() {
        guard let img = selectedImage else { return }
        isAnalyzing = true
        errorMessage = nil
        Task {
            do {
                let result = try await APIService.shared.analyzeWardrobeImage(image: img, modelType: "blip")
                await MainActor.run {
                    category = result.category
                    color = result.color
                    description = result.description
                    isAnalyzing = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isAnalyzing = false
                }
            }
        }
    }

    private func performAdd() {
        let c = category
        let col = color.trimmingCharacters(in: .whitespaces)
        let desc = description.trimmingCharacters(in: .whitespaces)
        guard !col.isEmpty, !desc.isEmpty else { return }
        errorMessage = nil
        isSaving = true
        Task {
            do {
                _ = try await APIService.shared.addWardrobeItem(category: c, color: col, description: desc, image: selectedImage)
                await MainActor.run {
                    isSaving = false
                    onSaved()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isSaving = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func save() {
        let c = category
        let col = color.trimmingCharacters(in: .whitespaces)
        let desc = description.trimmingCharacters(in: .whitespaces)
        guard !col.isEmpty, !desc.isEmpty else { return }
        if item != nil {
            performUpdate(c: c, col: col, desc: desc)
            return
        }
        if let img = selectedImage {
            isSaving = true
            errorMessage = nil
            Task {
                do {
                    let result = try await APIService.shared.checkWardrobeDuplicate(image: img)
                    await MainActor.run {
                        isSaving = false
                        if result.is_duplicate, result.existing_item != nil {
                            duplicateExistingItem = result.existing_item
                            showDuplicateAlert = true
                        } else {
                            performAdd()
                        }
                    }
                } catch {
                    await MainActor.run {
                        isSaving = false
                        errorMessage = error.localizedDescription
                    }
                }
            }
        } else {
            performAdd()
        }
    }

    private func performUpdate(c: String, col: String, desc: String) {
        guard let existing = item else { return }
        errorMessage = nil
        isSaving = true
        Task {
            do {
                _ = try await APIService.shared.updateWardrobeItem(id: existing.id, category: c, color: col, description: desc, image: selectedImage)
                await MainActor.run {
                    isSaving = false
                    onSaved()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isSaving = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}
