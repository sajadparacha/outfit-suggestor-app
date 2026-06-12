//
//  RefineMenuView.swift
//  OutfitSuggestor
//
//  Refine options sheet — formal, casual, wardrobe-only, change occasion.
//

import SwiftUI

struct RefineMenuView: View {
    let isAuthenticated: Bool
    let isLoading: Bool
    let isGuestBlocked: Bool
    let canRegenerateFromResult: Bool
    let canRefineWardrobeOnly: Bool
    var onMoreFormal: () -> Void
    var onMoreCasual: () -> Void
    var onWardrobeOnly: () -> Void
    var onChangeOccasion: () -> Void
    var onDismiss: () -> Void

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        onDismiss()
                        onMoreFormal()
                    } label: {
                        Text(MainFlowUxCopy.refineMoreFormal)
                    }
                    .disabled(isLoading || !canRegenerateFromResult || isGuestBlocked)
                    .accessibilityIdentifier("main.refineMoreFormalButton")

                    Button {
                        onDismiss()
                        onMoreCasual()
                    } label: {
                        Text(MainFlowUxCopy.refineMoreCasual)
                    }
                    .disabled(isLoading || !canRegenerateFromResult || isGuestBlocked)
                    .accessibilityIdentifier("main.refineMoreCasualButton")

                    if isAuthenticated {
                        Button {
                            onDismiss()
                            onWardrobeOnly()
                        } label: {
                            Text(MainFlowUxCopy.refineWardrobeOnly)
                        }
                        .disabled(isLoading || !canRefineWardrobeOnly)
                        .accessibilityIdentifier("main.refineWardrobeOnlyButton")
                    }

                    Button {
                        onDismiss()
                        onChangeOccasion()
                    } label: {
                        Text(MainFlowUxCopy.refineChangeOccasion)
                    }
                    .disabled(isLoading)
                    .accessibilityIdentifier("main.refineChangeOccasionButton")
                }

                Section {
                    Text(MainFlowUxCopy.changeOccasionHint)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
            }
            .navigationTitle(MainFlowUxCopy.refine)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { onDismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
