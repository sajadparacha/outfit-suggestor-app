import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavBar from './NavBar';

const defaultProps = {
  isAuthenticated: false,
  onLogin: jest.fn(),
  onSignUp: jest.fn(),
  onLogout: jest.fn(),
};

function renderNavBar(props: Partial<React.ComponentProps<typeof NavBar>> = {}) {
  return render(
    <MemoryRouter>
      <NavBar {...defaultProps} {...props} />
    </MemoryRouter>
  );
}

describe('NavBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Sign Up and Login for unauthenticated guests by default', () => {
    renderNavBar();

    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('hides Sign Up and Login when hideGuestAuthActions is true', () => {
    renderNavBar({ hideGuestAuthActions: true });

    expect(screen.queryByRole('button', { name: 'Sign Up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();
  });

  it('still shows nav links when hideGuestAuthActions is true', () => {
    renderNavBar({ hideGuestAuthActions: true });

    expect(screen.getByRole('link', { name: /^Suggest$/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Guide' })).toBeInTheDocument();
  });

  it('calls onSignUp and onLogin when auth buttons are clicked', () => {
    const onSignUp = jest.fn();
    const onLogin = jest.fn();
    renderNavBar({ onSignUp, onLogin });

    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(onSignUp).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});
