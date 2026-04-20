/**
 * Integration test: after a suggestion loads, "Next" calls the API with previousOutfitText.
 * Image compression is mocked so jsdom can run the controller flow without canvas.
 *
 * MSW 1.x cannot reliably intercept fetch() with FormData bodies in Jest; we spy on ApiService
 * for duplicate check + suggestion while exercising the real App, Sidebar, OutfitPreview, and controller.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../../App';
import ApiService from '../../services/ApiService';

jest.setTimeout(25000);

jest.mock('../../utils/imageUtils', () => {
  const actual = jest.requireActual('../../utils/imageUtils');
  return {
    ...actual,
    compressImageForOutfit: async (file: File) => file,
    compressImageForWardrobe: async (file: File) => file,
  };
});

const outfitFirst = {
  shirt: 'White linen shirt',
  trouser: 'Navy chinos',
  blazer: 'Gray blazer',
  shoes: 'Brown loafers',
  belt: 'Brown leather belt',
  reasoning: 'Classic business casual.',
  model_image: null,
};

const outfitSecond = {
  shirt: 'Olive sweater',
  trouser: 'Khaki chinos',
  blazer: 'Navy blazer',
  shoes: 'White sneakers',
  belt: 'Tan belt',
  reasoning: 'Relaxed weekend look.',
  model_image: null,
};

describe('Next suggestion alternate outfit (App)', () => {
  let suggestCalls: { previousOutfit: string | null }[] = [];
  let suggestCallIndex = 0;

  beforeEach(() => {
    suggestCalls = [];
    suggestCallIndex = 0;

    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });

    jest.spyOn(ApiService, 'getSuggestion').mockImplementation(
      async (
        _image,
        _textInput,
        _generateModelImage,
        _location,
        _imageModel,
        _useWardrobeOnly,
        _sourceWardrobeItemId,
        previousOutfitText
      ) => {
        suggestCalls.push({ previousOutfit: previousOutfitText ?? null });
        suggestCallIndex += 1;
        return suggestCallIndex === 1 ? outfitFirst : outfitSecond;
      }
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('second getSuggestion call receives previous outfit text after Next', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
    });

    const file = new File(['x'.repeat(2048)], 'shirt.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
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

    expect(suggestCalls).toHaveLength(1);
    expect(suggestCalls[0].previousOutfit).toBeNull();

    const nextBtns = screen.getAllByRole('button', { name: /Get next suggestion/i });
    fireEvent.click(nextBtns[0]);

    await waitFor(
      () => {
        expect(screen.getByText('Olive sweater')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );

    expect(suggestCalls.length).toBeGreaterThanOrEqual(2);
    const second = suggestCalls[suggestCalls.length - 1];
    expect(second.previousOutfit).toBeTruthy();
    expect(second.previousOutfit).toMatch(/White linen shirt/i);
    expect(second.previousOutfit).toMatch(/Classic business casual/i);
  });
});
