/**
 * Integration tests for post-result outfit actions:
 * Generate Another Look, Make it more formal/casual, Use wardrobe items only, Change occasion.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import App from '../../App';
import ApiService from '../../services/ApiService';
import { server } from '../../test/msw/server';
import { OUTFIT_VARIATION_MODIFIERS } from '../../utils/outfitPromptUtils';

jest.setTimeout(25000);

jest.mock('../../utils/imageUtils', () => {
  const actual = jest.requireActual('../../utils/imageUtils');
  return {
    ...actual,
    compressImageForOutfit: async (file: File) => file,
    compressImageForWardrobe: async (file: File) => file,
  };
});

const API_BASE = 'http://localhost:8001';

const outfitFirst = {
  shirt: 'White linen shirt',
  trouser: 'Navy chinos',
  blazer: 'Gray blazer',
  shoes: 'Brown loafers',
  belt: 'Brown leather belt',
  reasoning: 'Classic business casual.',
  model_image: null,
};

const outfitFormal = {
  shirt: 'Crisp white dress shirt',
  trouser: 'Charcoal dress trousers',
  blazer: 'Structured navy blazer',
  shoes: 'Black oxfords',
  belt: 'Black leather belt',
  reasoning: 'Polished formal look.',
  model_image: null,
};

type SuggestCall = {
  textInput: string;
  useWardrobeOnly: boolean;
  previousOutfit: string | null;
};

describe('Outfit result actions (App integration)', () => {
  let suggestCalls: SuggestCall[] = [];
  let suggestCallIndex = 0;
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    suggestCalls = [];
    suggestCallIndex = 0;
    scrollIntoViewMock = jest.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });
    jest.spyOn(ApiService, 'getSuggestion').mockImplementation(
      async (
        _image,
        textInput,
        _generateModelImage,
        _location,
        _imageModel,
        useWardrobeOnly,
        _sourceWardrobeItemId,
        previousOutfitText
      ) => {
        const resolvedTextInput = textInput ?? '';
        const resolvedUseWardrobeOnly = useWardrobeOnly ?? false;
        suggestCalls.push({
          textInput: resolvedTextInput,
          useWardrobeOnly: resolvedUseWardrobeOnly,
          previousOutfit: previousOutfitText ?? null,
        });
        suggestCallIndex += 1;
        if (suggestCallIndex === 1) return outfitFirst;
        if (resolvedTextInput.includes(OUTFIT_VARIATION_MODIFIERS.moreFormal)) return outfitFormal;
        return outfitFormal;
      }
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.removeItem('auth_token');
  });

  const uploadAndGenerateFirstSuggestion = async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
    });

    const file = new File(['x'.repeat(2048)], 'shirt.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const getAiBtn = screen.getByRole('button', { name: /Get AI outfit suggestion/i });
    await waitFor(() => expect(getAiBtn).not.toBeDisabled());
    fireEvent.click(getAiBtn);

    await waitFor(
      () => {
        expect(screen.getByText('White linen shirt')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );
  };

  it('Make it more formal sends modifier and previous outfit context', async () => {
    await uploadAndGenerateFirstSuggestion();

    fireEvent.click(screen.getByRole('button', { name: /Make it more formal/i }));

    await waitFor(
      () => {
        expect(screen.getByText('Crisp white dress shirt')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );

    expect(suggestCalls.length).toBeGreaterThanOrEqual(2);
    const formalCall = suggestCalls[suggestCalls.length - 1];
    expect(formalCall.textInput).toContain(OUTFIT_VARIATION_MODIFIERS.moreFormal);
    expect(formalCall.previousOutfit).toMatch(/White linen shirt/i);
  });

  it('Use wardrobe items only requires login', async () => {
    await uploadAndGenerateFirstSuggestion();

    expect(screen.queryByRole('button', { name: /Use wardrobe items only/i })).not.toBeInTheDocument();
  });

  it('Use wardrobe items only sends wardrobe flag when authenticated', async () => {
    localStorage.setItem('auth_token', 'test-token');
    server.use(
      rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) =>
        res(
          ctx.status(200),
          ctx.json({
            id: 1,
            email: 'user@example.com',
            full_name: 'Test User',
            is_active: true,
            is_admin: false,
            created_at: '2026-01-01T00:00:00Z',
          })
        )
      )
    );

    await uploadAndGenerateFirstSuggestion();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Use wardrobe items only/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Use wardrobe items only/i }));

    await waitFor(() => {
      expect(suggestCalls.length).toBeGreaterThanOrEqual(2);
    });

    const wardrobeCall = suggestCalls[suggestCalls.length - 1];
    expect(wardrobeCall.useWardrobeOnly).toBe(true);
    expect(wardrobeCall.textInput).toContain(OUTFIT_VARIATION_MODIFIERS.wardrobeOnly);
  });

  it('Change occasion scrolls to preferences and shows guidance toast', async () => {
    await uploadAndGenerateFirstSuggestion();

    fireEvent.click(screen.getByRole('button', { name: /Change occasion/i }));

    expect(scrollIntoViewMock).toHaveBeenCalled();
    expect(
      screen.getByText(/Update occasion in Preferences, then tap Generate Another Look/i)
    ).toBeInTheDocument();
  });
});
