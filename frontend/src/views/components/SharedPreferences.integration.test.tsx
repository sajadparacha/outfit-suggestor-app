/**
 * Suggest keeps occasion/season/style dropdowns. Insights uses a lifestyle mix
 * and must not share those Suggest pickers.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AnalysisPreferences from './AnalysisPreferences';
import { INSIGHTS_COPY } from '../../utils/insightsCopy';
import { INSIGHTS_LIFESTYLE_STORAGE_KEY } from '../../utils/insightsLifestyle';

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
  beforeEach(() => {
    localStorage.removeItem(INSIGHTS_LIFESTYLE_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(INSIGHTS_LIFESTYLE_STORAGE_KEY);
  });

  it('keeps Suggest and Insights preference controls in sync', () => {
    render(<SharedPreferencesHarness />);

    const occasionSelects = screen.getAllByLabelText(/select occasion/i);
    const seasonSelects = screen.getAllByLabelText(/select season/i);
    const styleSelects = screen.getAllByLabelText(/select style/i);

    expect(occasionSelects).toHaveLength(1);
    expect(seasonSelects).toHaveLength(1);
    expect(styleSelects).toHaveLength(1);

    const mix = screen.getByTestId('insights.lifestyleMix');
    expect(within(mix).getByRole('button', { name: /Work/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(mix).getByRole('button', { name: /^Everyday$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText(INSIGHTS_COPY.LIFESTYLE_ONLY_HINT)).toBeInTheDocument();
    expect(screen.queryByText(/Shared with Suggest/i)).not.toBeInTheDocument();

    fireEvent.change(occasionSelects[0], { target: { value: 'work' } });
    fireEvent.change(seasonSelects[0], { target: { value: 'summer' } });
    fireEvent.change(styleSelects[0], { target: { value: 'smart-casual' } });

    expect(occasionSelects[0]).toHaveValue('work');
    expect(seasonSelects[0]).toHaveValue('summer');
    expect(styleSelects[0]).toHaveValue('smart-casual');
    expect(within(mix).getByRole('button', { name: /Work/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(mix).getByRole('button', { name: /^Everyday$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const notesField = screen.getByLabelText(/extra notes for wardrobe insights/i);
    fireEvent.change(notesField, { target: { value: 'navy and brown, no sneakers' } });
    expect(notesField).toHaveValue('navy and brown, no sneakers');
  });
});
