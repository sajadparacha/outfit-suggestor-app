import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthGateCard from './AuthGateCard';

describe('AuthGateCard', () => {
  it('renders history copy and CTA handlers', () => {
    const onCreateAccount = jest.fn();
    const onSignIn = jest.fn();

    render(
      <AuthGateCard
        contextKey="history"
        onCreateAccount={onCreateAccount}
        onSignIn={onSignIn}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: /Create an account to keep your outfit history/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Every suggestion you generate will be saved automatically/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('renders guest limit copy', () => {
    render(
      <AuthGateCard
        contextKey="guest-limit"
        onCreateAccount={jest.fn()}
        onSignIn={jest.fn()}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: /You've used your 3 free AI outfit suggestions/i,
      })
    ).toBeInTheDocument();
  });
});
