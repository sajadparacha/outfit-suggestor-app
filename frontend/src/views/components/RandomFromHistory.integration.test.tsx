/**
 * Integration tests for Random Outfit from History flow
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import App from '../../App';
import { server } from '../../test/msw/server';

const API_BASE = 'http://localhost:8001';

const mockHistoryEntry = {
  id: 100,
  created_at: '2024-06-15T10:30:00Z',
  text_input: 'casual friday',
  image_data: null,
  model_image: null,
  shirt: 'Blue casual shirt',
  trouser: 'Khaki pants',
  blazer: 'No blazer needed',
  shoes: 'White sneakers',
  belt: 'Brown belt',
  reasoning: 'Relaxed weekend look.'
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
    localStorage.removeItem('auth_token');
  });

  it('displays random outfit from history when button is clicked', async () => {
    render(<App />);

    // Wait for app to load and Random from History button to appear
    await waitFor(() => {
      expect(screen.getByText(/AI Outfit Suggestor/i)).toBeInTheDocument();
      expect(screen.getByText(/Random from History/i)).toBeInTheDocument();
    });

    const randomFromHistoryBtn = screen.getByRole('button', {
      name: /show random outfit from your history/i,
    });
    fireEvent.click(randomFromHistoryBtn);

    // Verify suggestion from history is displayed
    await waitFor(() => {
      expect(screen.getByText(/Your Perfect Outfit/i)).toBeInTheDocument();
      expect(screen.getByText('Blue casual shirt')).toBeInTheDocument();
      expect(screen.getByText('Khaki pants')).toBeInTheDocument();
      expect(screen.getByText('No blazer needed')).toBeInTheDocument();
      expect(screen.getByText('White sneakers')).toBeInTheDocument();
      expect(screen.getByText('Brown belt')).toBeInTheDocument();
      expect(screen.getByText(/Relaxed weekend look/)).toBeInTheDocument();
    });
  });

  it('shows error toast when history is empty', async () => {
    server.use(
      rest.get(`${API_BASE}/api/outfit-history`, (_req, res, ctx) => {
        return res(ctx.json([]));
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Random from History/i)).toBeInTheDocument();
    });

    const randomFromHistoryBtn = screen.getByRole('button', {
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
