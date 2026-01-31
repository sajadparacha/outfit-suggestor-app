import React from 'react';
import { render, screen } from '@testing-library/react';
import { rest } from 'msw';
import Wardrobe from './Wardrobe';
import { server } from '../../test/msw/server';

const API_BASE = 'http://localhost:8001';

describe('Wardrobe integration (real hook + mocked HTTP)', () => {
  it('loads and renders items from the wardrobe API', async () => {
    render(<Wardrobe />);

    // Initial load state
    expect(screen.getByRole('heading', { name: /My Wardrobe/i })).toBeInTheDocument();
    expect(screen.getByText(/Loading wardrobe/i)).toBeInTheDocument();

    // Loaded item from MSW handler
    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
  });

  it('shows a user-visible error (not a blank screen) when the wardrobe API fails', async () => {
    server.use(
      rest.get(`${API_BASE}/api/wardrobe`, (_req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ detail: 'Boom' }));
      })
    );

    render(<Wardrobe />);

    // Header should still render
    expect(screen.getByRole('heading', { name: /My Wardrobe/i })).toBeInTheDocument();

    // Error state should be shown (the controller converts API errors into an error string)
    expect(await screen.findByText(/Boom|Failed to load wardrobe|Failed to get wardrobe/i)).toBeInTheDocument();
  });
});

