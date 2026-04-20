/**
 * Integration tests: Guide tab + footer links (User guide, About)
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../../App';

describe('Guide and footer navigation (App)', () => {
  it('shows User guide when Guide tab is clicked', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Guide' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guide' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /How to use/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Jump to a section/i)).toBeInTheDocument();
  });

  it('opens About from footer', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /About the app and creator/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /About the app and creator/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^AI Outfit Suggestor$/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Developed by Sajjad Ahmed Paracha/i)).toBeInTheDocument();
  });

  it('opens User guide from footer link', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open user guide/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Open user guide/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /How to use/i })).toBeInTheDocument();
    });
  });
});
