/**
 * Verifies occasion, season, style, and notes stay in sync between Suggest and Insights UIs.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalysisPreferences from './AnalysisPreferences';

function SharedPreferencesHarness() {
  const [filters, setFilters] = React.useState({
    occasion: 'everyday',
    season: 'all-season',
    style: 'classic',
  });
  const [preferenceText, setPreferenceText] = React.useState('');

  return (
    <div>
      <AnalysisPreferences
        filters={filters}
        setFilters={setFilters}
        preferenceText={preferenceText}
        setPreferenceText={setPreferenceText}
        variant="sidebar"
        showSharedHint={false}
      />
      <AnalysisPreferences
        filters={filters}
        setFilters={setFilters}
        preferenceText={preferenceText}
        setPreferenceText={setPreferenceText}
        variant="insights"
        showSharedHint={false}
      />
    </div>
  );
}

describe('SharedPreferences integration', () => {
  it('keeps Suggest and Insights preference controls in sync', () => {
    render(<SharedPreferencesHarness />);

    const occasionSelects = screen.getAllByLabelText(/select occasion/i);
    const seasonSelects = screen.getAllByLabelText(/select season/i);
    const styleSelects = screen.getAllByLabelText(/select style/i);

    fireEvent.change(occasionSelects[0], { target: { value: 'work' } });
    fireEvent.change(seasonSelects[0], { target: { value: 'summer' } });
    fireEvent.change(styleSelects[0], { target: { value: 'smart-casual' } });

    expect(occasionSelects[0]).toHaveValue('work');
    expect(occasionSelects[1]).toHaveValue('work');
    expect(seasonSelects[0]).toHaveValue('summer');
    expect(seasonSelects[1]).toHaveValue('summer');
    expect(styleSelects[0]).toHaveValue('smart-casual');
    expect(styleSelects[1]).toHaveValue('smart-casual');

    const notesField = screen.getByLabelText(/extra notes for wardrobe insights/i);
    fireEvent.change(notesField, { target: { value: 'navy and brown, no sneakers' } });
    expect(notesField).toHaveValue('navy and brown, no sneakers');
  });
});
