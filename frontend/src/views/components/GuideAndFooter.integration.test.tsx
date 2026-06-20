/**
 * Integration tests: Guide tab + footer links (User guide, About)
 */
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderApp } from '../../test/renderWithRouter';

describe('Guide and footer navigation (App)', () => {
  it('shows User guide when Guide tab is clicked', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Guide' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('link', { name: 'Guide' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /How to use/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Jump to a section/i)).toBeInTheDocument();
    expect(screen.getByText(/Add to outfit completion/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Complete outfit with AI/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Choose one item per outfit slot/i)).toBeInTheDocument();
    expect(screen.getByText(/Tap Shopping list to open a buy-list table/i)).toBeInTheDocument();
  });

  it('opens About from footer', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /More options/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /More options/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /About the app and creator/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /About the app and creator/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^AI Outfit Suggestor$/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Developed by Sajjad Ahmed Paracha/i)).toBeInTheDocument();
    expect(screen.getByText(/select one or more saved pieces/i)).toBeInTheDocument();
    expect(screen.getByText(/export the shopping list to WhatsApp or PDF/i)).toBeInTheDocument();
  });

  it('opens User guide from footer link', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /More options/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /More options/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open user guide/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Open user guide/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /How to use/i })).toBeInTheDocument();
    });
  });
});
