import React from 'react';
import { render, screen } from '@testing-library/react';
import WeekDayCard from './WeekDayCard';
import { WeekPlanDay } from '../../../models/WeekPlanModels';

function renderCard(day: WeekPlanDay, overrides: Partial<React.ComponentProps<typeof WeekDayCard>> = {}) {
  const onSelect = jest.fn();
  const onUpdateDay = jest.fn();
  render(
    <WeekDayCard
      day={day}
      selected={false}
      busy={false}
      onSelect={onSelect}
      onUpdateDay={onUpdateDay}
      {...overrides}
    />
  );
  return { onSelect, onUpdateDay };
}

function makeDay(partial: Partial<WeekPlanDay> & Pick<WeekPlanDay, 'day_of_week'>): WeekPlanDay {
  return {
    enabled: false,
    occasion: 'everyday',
    style: 'classic',
    use_wardrobe_only: true,
    ...partial,
  };
}

describe('WeekDayCard occasion and style line', () => {
  it('shows occasion and style for a planned day', () => {
    renderCard(
      makeDay({
        day_of_week: 0,
        enabled: true,
        occasion: 'work',
        style: 'classic',
      })
    );

    expect(screen.getByText('Work · Classic')).toBeInTheDocument();
    expect(screen.getByTestId('week-day-select-0')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Work · Classic')
    );
  });

  it('defaults missing style to Classic for a planned day', () => {
    renderCard(
      makeDay({
        day_of_week: 1,
        enabled: true,
        occasion: 'work',
        style: '',
      })
    );

    expect(screen.getByText('Work · Classic')).toBeInTheDocument();
  });

  it('shows Off only when the day is not planned', () => {
    renderCard(
      makeDay({
        day_of_week: 2,
        enabled: false,
        occasion: 'work',
        style: 'classic',
      })
    );

    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.queryByText(/Classic/)).not.toBeInTheDocument();
    expect(screen.getByTestId('week-day-select-2')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('not planned')
    );
    expect(screen.getByTestId('week-day-select-2').getAttribute('aria-label')).not.toContain(
      'Work · Classic'
    );
  });
});
