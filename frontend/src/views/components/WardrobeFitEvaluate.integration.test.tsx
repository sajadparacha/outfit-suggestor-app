/**
 * Integration: Wardrobe “How this fits” fit-evaluate flow.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import Wardrobe from './Wardrobe';
import { server } from '../../test/msw/server';
import { WARDROBE_FIT_COPY } from '../../utils/wardrobeFitCopy';

const API_BASE = 'http://localhost:8001';

describe('WardrobeFitEvaluate integration', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('hides How this fits when not authenticated', async () => {
    render(<Wardrobe isAuthenticated={false} />);

    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wardrobe-item-menu-1'));
    expect(
      screen.queryByRole('menuitem', { name: WARDROBE_FIT_COPY.action })
    ).not.toBeInTheDocument();
  });

  it('shows How this fits when authenticated and loads pair counts + missing goal', async () => {
    render(<Wardrobe isAuthenticated />);

    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wardrobe-item-menu-1'));

    const action = screen.getByRole('menuitem', { name: WARDROBE_FIT_COPY.action });
    expect(action).toBeInTheDocument();
    fireEvent.click(action);

    expect(await screen.findByTestId('wardrobe-fit-panel')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('wardrobe-fit-summary')).toHaveTextContent(
        /works with 2 trousers/i
      );
    });

    expect(screen.getByTestId('wardrobe-fit-verdict')).toHaveTextContent('Strong fit');
    expect(screen.getByTestId('wardrobe-fit-pairs')).toBeInTheDocument();
    expect(screen.getByTestId('wardrobe-fit-pair-trouser')).toHaveTextContent('2');
    expect(screen.getByTestId('wardrobe-fit-missing')).toHaveTextContent(
      /structured blazer/i
    );
    expect(screen.getByTestId('wardrobe-fit-missing')).toHaveTextContent(
      WARDROBE_FIT_COPY.sectionGap
    );
  });

  it('shows error and retry when evaluate-fit fails', async () => {
    let calls = 0;
    server.use(
      rest.post(`${API_BASE}/api/wardrobe/evaluate-fit`, (_req, res, ctx) => {
        calls += 1;
        if (calls === 1) {
          return res(ctx.status(500), ctx.json({ detail: 'Boom' }));
        }
        return res(
          ctx.json({
            candidate: {
              id: 1,
              category: 'shirt',
              label: 'Blue shirt',
              color: 'Blue',
              image_data: null,
            },
            goal: {
              label: 'business-casual',
              dress_code: 'smart-casual',
              lifestyle_mix: ['work', 'everyday'],
              primary_lifestyle: 'work',
              style_primary: 'classic',
              text_input: '',
            },
            pairs_with: [],
            outfit_multiplier: 0,
            verdict: 'weak_fit',
            missing_for_goal: {
              category: 'shoes',
              label: 'pair of shoes',
              reason: 'Add shoes to complete looks.',
              candidate_fills_this_gap: false,
            },
            summary_text: 'Limited pairing options yet.',
          })
        );
      })
    );

    render(<Wardrobe isAuthenticated />);
    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wardrobe-item-menu-1'));
    fireEvent.click(screen.getByRole('menuitem', { name: WARDROBE_FIT_COPY.action }));

    expect(await screen.findByTestId('wardrobe-fit-error')).toHaveTextContent(
      WARDROBE_FIT_COPY.error
    );

    fireEvent.click(screen.getByTestId('wardrobe-fit-retry'));

    await waitFor(() => {
      expect(screen.getByTestId('wardrobe-fit-summary')).toHaveTextContent(
        /Limited pairing/i
      );
    });
    expect(screen.getByTestId('wardrobe-fit-verdict')).toHaveTextContent('Weak fit');
  });
});
