import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FirstRunCoach from './FirstRunCoach';
import {
  FIRST_RUN_COACH_DISMISSED_KEY,
  getActiveCoachStep,
} from '../../utils/firstRunCoach';

describe('FirstRunCoach', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows coach when localStorage has no dismiss key', () => {
    render(<FirstRunCoach hasImage={false} hasSuggestion={false} />);
    expect(screen.getByTestId('first-run-coach')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Add any clothing photo')).toBeInTheDocument();
    expect(screen.getByText('Generate')).toBeInTheDocument();
    expect(screen.getByText('AI builds a full outfit')).toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Try another look or save')).toBeInTheDocument();
  });

  it('hides coach when first_run_coach_dismissed is true', () => {
    localStorage.setItem(FIRST_RUN_COACH_DISMISSED_KEY, 'true');
    render(<FirstRunCoach hasImage={false} hasSuggestion={false} />);
    expect(screen.queryByTestId('first-run-coach')).not.toBeInTheDocument();
  });

  it('marks step 1 complete after image is set', () => {
    const { rerender } = render(<FirstRunCoach hasImage={false} hasSuggestion={false} />);
    expect(screen.getByTestId('first-run-coach-step-1')).toHaveAttribute('data-active', 'true');

    rerender(<FirstRunCoach hasImage={true} hasSuggestion={false} />);
    expect(screen.getByTestId('first-run-coach-step-1')).toHaveAttribute('data-complete', 'true');
    expect(screen.getByTestId('first-run-coach-step-2')).toHaveAttribute('data-active', 'true');
  });

  it('dismiss button sets localStorage and hides coach', () => {
    const onDismiss = jest.fn();
    render(<FirstRunCoach hasImage={false} hasSuggestion={false} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByTestId('first-run-coach-dismiss'));
    expect(localStorage.getItem(FIRST_RUN_COACH_DISMISSED_KEY)).toBe('true');
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('first-run-coach')).not.toBeInTheDocument();
  });

  it('auto-dismisses on first suggestion', () => {
    const onDismiss = jest.fn();
    const { rerender } = render(
      <FirstRunCoach hasImage={true} hasSuggestion={false} onDismiss={onDismiss} />
    );

    rerender(<FirstRunCoach hasImage={true} hasSuggestion={true} onDismiss={onDismiss} />);
    expect(localStorage.getItem(FIRST_RUN_COACH_DISMISSED_KEY)).toBe('true');
    expect(onDismiss).toHaveBeenCalled();
    expect(screen.queryByTestId('first-run-coach')).not.toBeInTheDocument();
  });
});

describe('getActiveCoachStep', () => {
  it('returns correct active step for each state', () => {
    expect(getActiveCoachStep(false, false)).toBe(1);
    expect(getActiveCoachStep(true, false)).toBe(2);
    expect(getActiveCoachStep(true, true)).toBe(3);
  });
});
