import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders AI Outfit Suggestor app', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /^Suggest$/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Guide' })).toBeInTheDocument();
});
