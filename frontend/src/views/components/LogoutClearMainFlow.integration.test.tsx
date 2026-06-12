/**
 * Integration tests: logout clears main suggest flow (image, result, preferences UI).
 */
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import { renderApp } from '../../test/renderWithRouter';
import ApiService from '../../services/ApiService';
import { server } from '../../test/msw/server';
import { FIRST_OUTFIT_PROMPT_KEY } from '../../utils/authPromptCopy';

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

describe('Logout clears main flow (App integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('guest_session_id', 'persist-guest-id');
    localStorage.setItem(FIRST_OUTFIT_PROMPT_KEY, 'true');

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

    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });
    jest.spyOn(ApiService, 'getSuggestion').mockResolvedValue(outfitFirst);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  const uploadAndGenerateSuggestion = async () => {
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

  it('clears outfit result and uploaded image after logout', async () => {
    renderApp();
    await uploadAndGenerateSuggestion();

    expect(screen.queryByText(/Your outfit appears here/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Logout/i }));

    await waitFor(() => {
      expect(screen.queryByText('White linen shirt')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Your outfit appears here/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload a photo, set preferences, then tap Generate Outfit/i)).toBeInTheDocument();
    expect(screen.queryByAltText(/Uploaded clothing/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('guest_session_id')).toBe('persist-guest-id');
    expect(localStorage.getItem(FIRST_OUTFIT_PROMPT_KEY)).toBe('true');
  });
});
