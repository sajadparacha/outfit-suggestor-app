/**
 * Integration tests for guest AI call limit UX.
 */
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import { renderApp } from '../../test/renderWithRouter';
import ApiService from '../../services/ApiService';
import { server } from '../../test/msw/server';

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
  reasoning: 'Classic business casual.',
  model_image: null,
};

describe('Guest AI call limit (App integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });
    jest.spyOn(ApiService, 'getSuggestion').mockResolvedValue(mockOutfitResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('shows remaining hint for guests with tries left', async () => {
    server.use(
      rest.get('http://localhost:8001/api/guest-usage', (_req, res, ctx) =>
        res(ctx.json({ limit: 3, used: 1, remaining: 2, requires_signup: false }))
      )
    );

    renderApp();

    await waitFor(() => {
      expect(screen.getByText('2 of 3 free AI suggestions left')).toBeInTheDocument();
    });
  });

  it('shows blocking card and disables generate when limit reached', async () => {
    server.use(
      rest.get('http://localhost:8001/api/guest-usage', (_req, res, ctx) =>
        res(ctx.json({ limit: 3, used: 3, remaining: 0, requires_signup: true }))
      )
    );

    renderApp();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /You've used your 3 free AI outfit suggestions/i,
        })
      ).toBeInTheDocument();
    });

    const file = new File(['x'.repeat(2048)], 'shirt.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const generateBtn = screen.getByRole('button', { name: /Get AI outfit suggestion/i });
    await waitFor(() => expect(generateBtn).toBeDisabled());
    expect(ApiService.getSuggestion).not.toHaveBeenCalled();
  });
});
