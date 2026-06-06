/**
 * Integration test for main suggestion flow:
 * upload image -> Get AI Suggestion -> display outfit in OutfitPreview.
 *
 * Image compression is mocked for jsdom; ApiService is spied because MSW 1.x
 * does not reliably intercept fetch() with multipart FormData in Jest.
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

const mockOutfitResponse = {
  shirt: 'White linen shirt',
  trouser: 'Navy chinos',
  blazer: 'Gray blazer',
  shoes: 'Brown loafers',
  belt: 'Brown leather belt',
  reasoning: 'Classic business casual combination.',
  model_image: null,
};

describe('Main suggestion flow integration', () => {
  beforeEach(() => {
    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });
    jest.spyOn(ApiService, 'getSuggestion').mockResolvedValue(mockOutfitResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('displays suggestion after uploading image and clicking Get Suggestion', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
    });

    const file = new File(['x'.repeat(2048)], 'shirt.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { files: [file] } });

    const getSuggestionBtn = screen.getByRole('button', { name: /Get AI outfit suggestion/i });
    await waitFor(() => expect(getSuggestionBtn).not.toBeDisabled());
    fireEvent.click(getSuggestionBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Your Perfect Outfit/i)).toBeInTheDocument();
        expect(screen.getByText('White linen shirt')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );

    expect(ApiService.checkDuplicate).toHaveBeenCalledTimes(1);
    expect(ApiService.getSuggestion).toHaveBeenCalledTimes(1);
  });
});
