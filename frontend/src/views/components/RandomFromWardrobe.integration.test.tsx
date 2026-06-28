/**
 * Integration tests for Random from Wardrobe → Generate Another flow
 */
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { rest } from 'msw';
import { renderApp } from '../../test/renderWithRouter';
import ApiService from '../../services/ApiService';
import { server } from '../../test/msw/server';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';

const API_BASE = 'http://localhost:8001';

const wardrobeOutfitFirst = {
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
        image_data: 'wardrobeThumb',
      },
    ],
    trouser: [],
    blazer: [],
    shoes: [],
    belt: [],
  },
};

const wardrobeOutfitSecond = {
  shirt: 'Blue oxford',
  trouser: 'Khaki chinos',
  blazer: 'Navy blazer',
  shoes: 'Brown loafers',
  belt: 'Tan belt',
  reasoning: 'Another wardrobe random pick.',
  matching_wardrobe_items: wardrobeOutfitFirst.matching_wardrobe_items,
};

const mockUser = {
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  is_admin: false,
};

describe('Random from Wardrobe regenerate integration', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('first_run_coach_dismissed', 'true');
    server.use(
      rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) => {
        return res(ctx.json(mockUser));
      }),
      rest.get(`${API_BASE}/api/outfit-history`, (_req, res, ctx) => {
        return res(ctx.json([]));
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('calls wardrobe API again when Generate Another is clicked after random wardrobe result', async () => {
    jest
      .spyOn(ApiService, 'getWardrobeOnlySuggestion')
      .mockResolvedValueOnce(wardrobeOutfitFirst)
      .mockResolvedValueOnce(wardrobeOutfitSecond);

    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('main-flow-more-options-trigger')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('main-flow-more-options-trigger'));
    fireEvent.click(screen.getByRole('button', { name: /get random outfit from wardrobe/i }));

    await waitFor(() => {
      expect(screen.getByText('Red casual shirt')).toBeInTheDocument();
      expect(screen.getByTestId('compact-generate-another')).toBeInTheDocument();
    });

    const primaryRow = screen.getByTestId('result-primary-actions');
    fireEvent.click(
      within(primaryRow).getByRole('button', { name: MAIN_FLOW_UX_COPY.generateAnother })
    );

    await waitFor(() => {
      expect(ApiService.getWardrobeOnlySuggestion).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Blue oxford')).toBeInTheDocument();
    });
  });
});
