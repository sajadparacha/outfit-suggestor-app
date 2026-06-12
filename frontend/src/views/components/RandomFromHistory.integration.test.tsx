/**
 * Integration tests for Random Outfit from History flow
 */
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { rest } from 'msw';
import { renderApp } from '../../test/renderWithRouter';
import ApiService from '../../services/ApiService';
import { server } from '../../test/msw/server';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';
import { formatPreviousOutfitForPrompt } from '../../utils/outfitPromptUtils';

jest.mock('../../utils/imageUtils', () => {
  const actual = jest.requireActual('../../utils/imageUtils');
  return {
    ...actual,
    compressImageForOutfit: async (file: File) => file,
    dataUrlToFile: async (dataUrl: string, filename: string) =>
      new File(['hydrated'], filename, { type: 'image/jpeg' }),
  };
});

const API_BASE = 'http://localhost:8001';

const mockHistoryEntry = {
  id: 100,
  created_at: '2024-06-15T10:30:00Z',
  text_input: 'casual friday',
  occasion: 'casual',
  season: 'summer',
  style: 'modern',
  image_data: 'historyPreviewBase64',
  model_image: null,
  shirt: 'Blue casual shirt',
  trouser: 'Khaki pants',
  blazer: 'No blazer needed',
  shoes: 'White sneakers',
  belt: 'Brown belt',
  reasoning: 'Relaxed weekend look.',
  matching_wardrobe_items: {
    shirt: [
      { id: 1, category: 'shirt', color: 'blue', description: 'Blue shirt', image_data: 'wardrobeShirtThumb' },
    ],
    trouser: [],
    blazer: [],
    shoes: [],
    belt: [],
  },
};

const mockUser = {
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  is_admin: false,
};

describe('Random from History integration', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('first_run_coach_dismissed', 'true');
    server.use(
      rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) => {
        return res(ctx.json(mockUser));
      }),
      rest.get(`${API_BASE}/api/outfit-history`, (req, res, ctx) => {
        const limit = Number(req.url.searchParams.get('limit') ?? 2);
        return res(ctx.json([mockHistoryEntry]));
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('displays random outfit from history when button is clicked', async () => {
    renderApp();

    // Wait for app to load and expand Random picks for Random from History
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^Suggest$/ })).toBeInTheDocument();
      expect(screen.getByText('Random picks')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Random picks'));

    const randomFromHistoryBtn = await screen.findByRole('button', {
      name: /show random outfit from your history/i,
    });
    fireEvent.click(randomFromHistoryBtn);

    // Verify suggestion from history is displayed in outfit preview
    await waitFor(() => {
      expect(screen.getAllByText(/Your Styled Look/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Blue casual shirt').length).toBeGreaterThan(0);
      expect(screen.getByText('Khaki pants')).toBeInTheDocument();
      expect(screen.getByText('No blazer needed')).toBeInTheDocument();
      expect(screen.getByText('White sneakers')).toBeInTheDocument();
      expect(screen.getByText('Brown belt')).toBeInTheDocument();
      expect(screen.getByText(/Relaxed weekend look/)).toBeInTheDocument();
    });

    const compactSummary = screen.getByTestId('main-flow-compact-summary');
    const previewImg = compactSummary.querySelector('img');
    expect(previewImg).toBeInTheDocument();
    expect(previewImg?.getAttribute('src')).toBe('data:image/jpeg;base64,historyPreviewBase64');
    expect(screen.getByText('From history')).toBeInTheDocument();

    const shirtCardImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Shirt');
    expect(shirtCardImg?.getAttribute('src')).toBe('data:image/jpeg;base64,wardrobeShirtThumb');

    expect(compactSummary).toHaveTextContent('Summer');
    expect(compactSummary).not.toHaveTextContent(/Wardrobe ·/i);
  });

  it('clears stale wardrobe preview when loading random history entry', async () => {
    jest.spyOn(ApiService, 'getWardrobeOnlySuggestion').mockResolvedValue({
      shirt: 'Red casual shirt',
      trouser: 'Dark jeans',
      blazer: 'No blazer',
      shoes: 'Sneakers',
      belt: 'Brown belt',
      reasoning: 'Wardrobe random pick.',
      matching_wardrobe_items: {
        shirt: [
          {
            id: 99,
            category: 'shirt',
            color: 'red',
            description: 'Red shirt',
            image_data: 'staleWardrobeThumb',
          },
        ],
        trouser: [],
        blazer: [],
        shoes: [],
        belt: [],
      },
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Random picks')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Random picks'));
    fireEvent.click(screen.getByRole('button', { name: /get random outfit from wardrobe/i }));

    await waitFor(() => {
      expect(screen.getByText('Random from wardrobe')).toBeInTheDocument();
      expect(screen.getByText('Red casual shirt')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /show random outfit from your history/i }));

    await waitFor(() => {
      const compactSummary = screen.getByTestId('main-flow-compact-summary');
      expect(compactSummary).toHaveTextContent(MAIN_FLOW_UX_COPY.fromHistory);
      expect(compactSummary.querySelector('img')?.getAttribute('src')).toBe(
        'data:image/jpeg;base64,historyPreviewBase64'
      );
      expect(compactSummary).not.toHaveTextContent('Random from wardrobe');
      expect(compactSummary).not.toHaveTextContent(/Wardrobe ·/i);
    });
  });

  it('enables Generate Another and hydrates history image for alternate suggestion', async () => {
    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });

    const alternateOutfit = {
      shirt: 'Green polo',
      trouser: 'Gray slacks',
      blazer: 'No blazer',
      shoes: 'Loafers',
      belt: 'Brown belt',
      reasoning: 'Alternate history look.',
      model_image: null,
    };

    jest.spyOn(ApiService, 'getSuggestion').mockResolvedValue(alternateOutfit);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Random picks')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Random picks'));
    fireEvent.click(screen.getByRole('button', { name: /show random outfit from your history/i }));

    await waitFor(() => {
      expect(screen.getByTestId('result-primary-actions')).toBeInTheDocument();
      expect(screen.getAllByText('Blue casual shirt').length).toBeGreaterThan(0);
    });

    const primaryRow = screen.getByTestId('result-primary-actions');
    const generateAnotherBtn = within(primaryRow).getByRole('button', {
      name: MAIN_FLOW_UX_COPY.generateAnother,
    });
    expect(generateAnotherBtn).toBeEnabled();

    fireEvent.click(generateAnotherBtn);

    await waitFor(() => {
      expect(ApiService.getSuggestion).toHaveBeenCalled();
    });

    const previousText = formatPreviousOutfitForPrompt({
      id: String(mockHistoryEntry.id),
      shirt: mockHistoryEntry.shirt,
      trouser: mockHistoryEntry.trouser,
      blazer: mockHistoryEntry.blazer,
      shoes: mockHistoryEntry.shoes,
      belt: mockHistoryEntry.belt,
      reasoning: mockHistoryEntry.reasoning,
    });
    const lastCall = (ApiService.getSuggestion as jest.Mock).mock.calls.at(-1);
    expect(lastCall?.[7]).toBe(previousText);
  });

  it('upload in compact mode clears result and returns to creation layout', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Random picks')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Random picks'));
    fireEvent.click(screen.getByRole('button', { name: /show random outfit from your history/i }));

    await waitFor(() => {
      expect(screen.getByTestId('compact-upload-actions')).toBeInTheDocument();
      expect(screen.getByTestId('result-primary-actions')).toBeInTheDocument();
    });

    const file = new File(['x'.repeat(1024)], 'new-item.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.queryByTestId('compact-upload-actions')).not.toBeInTheDocument();
      expect(screen.queryByTestId('result-primary-actions')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: MAIN_FLOW_UX_COPY.primaryCtaAria })).toBeInTheDocument();
    });
  });

  it('shows error toast when history is empty', async () => {
    server.use(
      rest.get(`${API_BASE}/api/outfit-history`, (_req, res, ctx) => {
        return res(ctx.json([]));
      })
    );

    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Random picks')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Random picks'));

    const randomFromHistoryBtn = await screen.findByRole('button', {
      name: /show random outfit from your history/i,
    });
    fireEvent.click(randomFromHistoryBtn);

    // Should show error toast (message: "No history yet. Get some outfit suggestions first! 📋")
    await waitFor(
      () => {
        expect(screen.getByText(/No history yet/)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
