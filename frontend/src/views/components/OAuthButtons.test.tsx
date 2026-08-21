import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OAuthButtons from './OAuthButtons';

describe('OAuthButtons', () => {
  it('highlights Continue with Google like Sign in and is a real button', () => {
    render(<OAuthButtons onOAuthLogin={jest.fn()} loading={false} />);

    const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
    expect(googleButton).toHaveClass('btn-brand');
    expect(googleButton).toHaveAttribute('type', 'button');
  });

  it('completes Google sign-in from a button tap', async () => {
    const onOAuthLogin = jest.fn().mockResolvedValue(undefined);
    render(<OAuthButtons onOAuthLogin={onOAuthLogin} loading={false} />);

    await userEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));

    expect(onOAuthLogin).toHaveBeenCalledWith('google', 'test-google-id-token');
  });
});
