import type { OutfitSuggestion } from '../models/OutfitModels';
import {
  OUTFIT_VARIATION_MODIFIERS,
  formatPreviousOutfitForPrompt,
} from './outfitPromptUtils';

describe('outfitPromptUtils', () => {
  const baseSuggestion: OutfitSuggestion = {
    id: '1',
    shirt: 'White shirt',
    trouser: 'Navy chinos',
    blazer: 'Gray blazer',
    shoes: 'Brown loafers',
    belt: 'Brown belt',
    reasoning: 'Balanced smart casual look.',
  };

  describe('OUTFIT_VARIATION_MODIFIERS', () => {
    it('defines distinct formal, casual, and wardrobe-only modifiers', () => {
      expect(OUTFIT_VARIATION_MODIFIERS.moreFormal).toMatch(/formal/i);
      expect(OUTFIT_VARIATION_MODIFIERS.moreCasual).toMatch(/casual/i);
      expect(OUTFIT_VARIATION_MODIFIERS.wardrobeOnly).toMatch(/wardrobe/i);
      expect(OUTFIT_VARIATION_MODIFIERS.moreFormal).not.toBe(OUTFIT_VARIATION_MODIFIERS.moreCasual);
    });
  });

  describe('formatPreviousOutfitForPrompt', () => {
    it('serializes outfit fields for alternate requests', () => {
      const text = formatPreviousOutfitForPrompt(baseSuggestion);
      expect(text).toContain('Shirt: White shirt');
      expect(text).toContain('Trousers: Navy chinos');
      expect(text).toContain('Reasoning: Balanced smart casual look.');
    });

    it('truncates very long outfit text', () => {
      const longReasoning = 'x'.repeat(7000);
      const text = formatPreviousOutfitForPrompt({ ...baseSuggestion, reasoning: longReasoning });
      expect(text.length).toBeLessThanOrEqual(6012);
      expect(text).toContain('[truncated]');
    });
  });
});
