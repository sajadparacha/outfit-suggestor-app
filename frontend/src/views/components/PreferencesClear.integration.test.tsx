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

    // Open the "Preferences" details panel
    const prefsSummary = screen.getByText('Preferences').closest('summary') as HTMLElement;
    fireEvent.click(prefsSummary);

    const occasionSelect = screen.getByLabelText('Select occasion') as HTMLSelectElement;
    const seasonSelect = screen.getByLabelText('Select season') as HTMLSelectElement;
    const styleSelect = screen.getByLabelText('Select style preference') as HTMLSelectElement;
    const prefTextarea = screen.getByPlaceholderText(/e\.g\., Smart casual/i) as HTMLTextAreaElement;

    // Ensure we start non-empty
    expect(occasionSelect.value).not.toBe('');
    expect(seasonSelect.value).not.toBe('');
    expect(styleSelect.value).not.toBe('');
    expect(prefTextarea.value).toBe('no sneakers');

    // Click clear button
    fireEvent.click(screen.getByRole('button', { name: /clear preferences/i }));

    expect(occasionSelect.value).toBe('');
    expect(seasonSelect.value).toBe('');
    expect(styleSelect.value).toBe('');
    expect(prefTextarea.value).toBe('');
  });
});

