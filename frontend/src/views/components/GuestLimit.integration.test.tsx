/**
 * Integration tests for guest AI call limit UX.
 */
import { screen, waitFor } from '@testing-library/react';
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

  it('shows only guest-limit AuthGateCard and hides main creation UI when limit reached', async () => {
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

    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign Up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Get AI outfit suggestion/i })).not.toBeInTheDocument();
    expect(screen.queryByText('How it works')).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
    expect(ApiService.getSuggestion).not.toHaveBeenCalled();
  });
});
