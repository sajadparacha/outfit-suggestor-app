import type { InputPanelSource } from '../models/OutfitModels';

/**
 * Whether "Generate Another Look" / alternate flows are available after a result.
 * Keep in sync with MainFlowResultRegenerateLogic.swift
 */
export function canGenerateAnotherFromResult(
  inputPanelSource: InputPanelSource,
  hasUploadedImage: boolean,
  hasFlowPreview: boolean,
  hasSuggestion: boolean
): boolean {
  if (!hasSuggestion) return false;
  if (hasUploadedImage) return true;
  if (inputPanelSource === 'wardrobe') return true;
  if (inputPanelSource === 'history' && hasFlowPreview) return true;
  return false;
}

/** Compact result mode should still offer upload to start a fresh outfit. */
export function shouldShowCompactUploadActions(hasSuggestion: boolean): boolean {
  return hasSuggestion;
}
