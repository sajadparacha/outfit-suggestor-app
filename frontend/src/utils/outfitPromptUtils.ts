import type { OutfitSuggestion } from '../models/OutfitModels';

const MAX_PREVIOUS_OUTFIT_CHARS = 6000;

/**
 * Serialize the current outfit for the API so the model can suggest a clearly different alternative.
 */
export function formatPreviousOutfitForPrompt(s: OutfitSuggestion): string {
  const lines = [
    `Shirt: ${s.shirt}`,
    `Trousers: ${s.trouser}`,
    `Blazer: ${s.blazer}`,
    `Shoes: ${s.shoes}`,
    `Belt: ${s.belt}`,
    `Reasoning: ${s.reasoning}`,
  ];
  const text = lines.join('\n');
  if (text.length <= MAX_PREVIOUS_OUTFIT_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_PREVIOUS_OUTFIT_CHARS)}\n[truncated]`;
}
