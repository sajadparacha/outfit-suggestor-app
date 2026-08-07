/**
 * Integration tests: Guide tab + footer links (User guide, About)
 */
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderApp } from '../../test/renderWithRouter';
import { ROUTES } from '../../navigation/routes';

describe('Guide and footer navigation (App)', () => {
  it('shows Week Planner in main nav and links to /week', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Week Planner' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: /^Week$/ })).not.toBeInTheDocument();

    const weekLink = screen.getByRole('link', { name: 'Week Planner' });
    expect(weekLink).toHaveAttribute('href', ROUTES.WEEK);
  });

  it('does not show Guide in primary nav', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^Suggest$/ })).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'Guide' })).not.toBeInTheDocument();
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
    expect(screen.getByText(/Suggest a look from a photo/i)).toBeInTheDocument();
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
    expect(screen.getByText(/Your personal AI men's stylist/i)).toBeInTheDocument();
    expect(screen.getByText(/How it fits together/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Week Planner' })).toBeInTheDocument();
  });
});
