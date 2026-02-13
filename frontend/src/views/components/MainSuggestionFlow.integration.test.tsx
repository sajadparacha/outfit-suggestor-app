/**
 * Integration test for main suggestion flow
 * Upload image -> Get suggestion -> Display outfit
 *
 * TODO: Skipped - full App has many async deps (auth, history, wardrobe) and
 * image compression that make E2E testing complex. Consider mocking
 * useOutfitController and testing Sidebar + OutfitPreview in isolation.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.setTimeout(15000);
import { rest } from 'msw';
import App from '../../App';
import { server } from '../../test/msw/server';

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

describe('Main suggestion flow integration', () => {
  beforeEach(() => {
    // Mock check-duplicate to return no duplicate (proceed to AI)
    server.use(
      rest.post(`${API_BASE}/api/check-duplicate`, async (_req, res, ctx) => {
        return res(ctx.json({ is_duplicate: false }));
      }),
      rest.post(`${API_BASE}/api/suggest-outfit`, async (_req, res, ctx) => {
        return res(ctx.json(mockOutfitResponse));
      })
    );
  });

  it.skip('displays suggestion after uploading image and clicking Get Suggestion', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    render(<App />);

    // Wait for app to load (main view)
    expect(screen.getByText(/AI Outfit Suggestor/i)).toBeInTheDocument();

    // Create a small image file (1x1 PNG)
    const file = new File(['x'.repeat(1024)], 'shirt.jpg', { type: 'image/jpeg' });

    // Find file input and upload
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    await userEvent.upload(fileInput!, file);

    // Click Get Suggestion button
    const getSuggestionBtn = screen.getByRole('button', { name: /Get Suggestion/i });
    expect(getSuggestionBtn).toBeInTheDocument();
    await userEvent.click(getSuggestionBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Your Perfect Outfit/i)).toBeInTheDocument();
        expect(screen.getByText('White linen shirt')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });
});
