/**
 * Integration-style tests for Preferences UI:
 * - Clear Preferences empties dropdowns and free-text
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

function SidebarWithState() {
  const [filters, setFilters] = React.useState({ occasion: 'business', season: 'winter', style: 'classic' });
  const [preferenceText, setPreferenceText] = React.useState('no sneakers');

  return (
    <Sidebar
      filters={filters}
      setFilters={setFilters}
      preferenceText={preferenceText}
      setPreferenceText={setPreferenceText}
      image={null}
      setImage={jest.fn()}
      onGetSuggestion={jest.fn()}
      onGetRandomSuggestion={undefined}
      onGetRandomFromHistory={undefined}
      loading={false}
      generateModelImage={false}
      setGenerateModelImage={jest.fn()}
      imageModel="dalle3"
      setImageModel={jest.fn()}
      modelGenerationEnabled={false}
      isAuthenticated={false}
      onFileReject={jest.fn()}
      isAdmin={false}
    />
  );
}

describe('PreferencesClear integration', () => {
  it('clears all preferences (dropdowns + free-text)', () => {
    render(<SidebarWithState />);

    // Verify initial state via sr-only tooltip summary
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toMatch(/Occasion: Business/);
    expect(tooltip.textContent).toMatch(/Season: Winter/);
    expect(tooltip.textContent).toMatch(/Style: Classic/);
    expect(tooltip.textContent).toMatch(/Notes: no sneakers/);

    fireEvent.click(screen.getByRole('button', { name: /clear preferences/i }));

    expect(tooltip.textContent).toMatch(/Occasion: Casual/);
    expect(tooltip.textContent).toMatch(/Season: All Seasons/);
    expect(tooltip.textContent).toMatch(/Style: Modern/);
    expect(tooltip.textContent).toMatch(/Notes: \(none\)/);
  });
});
