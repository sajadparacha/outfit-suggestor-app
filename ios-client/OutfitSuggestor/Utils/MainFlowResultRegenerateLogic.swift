//
//  MainFlowResultRegenerateLogic.swift
//  OutfitSuggestor
//
//  Keep in sync with mainFlowResultRegenerate.ts
//

import Foundation

enum MainFlowResultRegenerateLogic {
    static func canGenerateAnotherFromResult(
        inputPanelSource: OutfitViewModel.InputPanelSource?,
        hasUploadedImage: Bool,
        hasFlowPreview: Bool,
        hasSuggestion: Bool
    ) -> Bool {
        guard hasSuggestion else { return false }
        if hasUploadedImage { return true }
        if inputPanelSource == .wardrobe { return true }
        if inputPanelSource == .history, hasFlowPreview { return true }
        return false
    }

    static func shouldShowCompactUploadActions(hasSuggestion: Bool) -> Bool {
        hasSuggestion
    }
}
