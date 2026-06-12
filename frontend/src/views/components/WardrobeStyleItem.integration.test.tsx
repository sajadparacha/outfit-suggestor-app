/**
 * Integration: Style wardrobe item after an existing suggestion should restore Generate Outfit CTA.
 */
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import { renderApp } from '../../test/renderWithRouter';
import ApiService from '../../services/ApiService';
import { server } from '../../test/msw/server';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';

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

const mockOutfitResponse = {
  shirt: 'White linen shirt',
  trouser: 'Navy chinos',
  blazer: 'Gray blazer',
  shoes: 'Brown loafers',
  belt: 'Brown leather belt',
  reasoning: 'Classic business casual combination.',
  model_image: null,
};

describe('Wardrobe Style this item integration', () => {
  const originalFetch = global.fetch;
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    scrollIntoViewMock = jest.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('first_run_coach_dismissed', 'true');

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
      ),
      rest.get(`${API_BASE}/api/wardrobe`, (_req, res, ctx) =>
        res(
          ctx.json({
            items: [
              {
                id: 1,
                category: 'shirt',
                color: 'Blue',
                description: 'Integration test shirt',
                image_data: 'dGVzdC1pbWFnZS1kYXRh',
                name: null,
              },
            ],
            total: 1,
            limit: 10,
            offset: 0,
          })
        )
      )
    );

    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });
    jest.spyOn(ApiService, 'getSuggestion').mockResolvedValue(mockOutfitResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('shows Generate Outfit after styling a wardrobe item when a previous result existed', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: MAIN_FLOW_UX_COPY.primaryCtaAria })).toBeInTheDocument();
    });

    const file = new File(['x'.repeat(2048)], 'shirt.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const generateBtn = screen.getByRole('button', { name: MAIN_FLOW_UX_COPY.primaryCtaAria });
    await waitFor(() => expect(generateBtn).not.toBeDisabled());
    fireEvent.click(generateBtn);

    await waitFor(
      () => {
        expect(screen.getByText('White linen shirt')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );

    expect(screen.queryByRole('button', { name: MAIN_FLOW_UX_COPY.primaryCtaAria })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /^Wardrobe$/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /My Wardrobe/i })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Style this item with AI/i })).toBeInTheDocument();
    });

    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (url.startsWith('data:image/jpeg;base64,')) {
        return {
          blob: async () => new Blob(['image'], { type: 'image/jpeg' }),
        } as Response;
      }
      return originalFetch(input as RequestInfo, init);
    });

    fireEvent.click(screen.getByRole('button', { name: /Style this item with AI/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: MAIN_FLOW_UX_COPY.primaryCtaAria })).toBeInTheDocument();
      expect(screen.getByText(MAIN_FLOW_UX_COPY.emptyPreviewHeadline)).toBeInTheDocument();
      expect(screen.queryByText('White linen shirt')).not.toBeInTheDocument();
    });
  });
});
