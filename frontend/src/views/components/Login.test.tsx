/**
 * Unit tests for Login form - submission, validation, switch to register
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

// userEvent v13 does not have setup(); use default export directly
const user = userEvent;

describe('Login', () => {
  const mockOnLogin = jest.fn().mockResolvedValue(undefined);
  const mockOnSwitchToRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with email and password inputs', () => {
    render(
      <Login
        onLogin={mockOnLogin}
        onSwitchToRegister={mockOnSwitchToRegister}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByRole('heading', { name: /Sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('calls onLogin with credentials on form submit', async () => {
    render(
      <Login
        onLogin={mockOnLogin}
        onSwitchToRegister={mockOnSwitchToRegister}
        loading={false}
        error={null}
      />
    );
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(mockOnLogin).toHaveBeenCalledWith({
      username: 'test@example.com',
      password: 'password123',
    });
  });

  it('calls onSwitchToRegister when create account link is clicked', async () => {
    render(
      <Login
        onLogin={mockOnLogin}
        onSwitchToRegister={mockOnSwitchToRegister}
        loading={false}
        error={null}
      />
    );
    await user.click(screen.getByRole('button', { name: /create a new account/i }));
    expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1);
  });

  it('displays error message when error prop is provided', () => {
    render(
      <Login
        onLogin={mockOnLogin}
        onSwitchToRegister={mockOnSwitchToRegister}
        loading={false}
        error="Invalid credentials"
      />
    );
    expect(screen.getByText(/Invalid credentials/)).toBeInTheDocument();
  });

  it('disables submit button and shows Signing in... when loading', () => {
    render(
      <Login
        onLogin={mockOnLogin}
        onSwitchToRegister={mockOnSwitchToRegister}
        loading={true}
        error={null}
      />
    );
    const submitBtn = screen.getByRole('button', { name: /Signing in/i });
    expect(submitBtn).toBeDisabled();
  });
});
