import { screen } from '@testing-library/react';
import { renderApp } from './test/renderWithRouter';

test('renders AI Outfit Suggestor app', () => {
  renderApp();
  expect(screen.getByRole('link', { name: /^Suggest$/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Guide' })).toBeInTheDocument();
});
