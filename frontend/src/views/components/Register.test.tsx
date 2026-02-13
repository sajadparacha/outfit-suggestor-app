/**
 * Unit tests for Register form - submission, validation, password match, switch to login
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Register from './Register';

// userEvent v13 does not have setup(); use default export directly
const user = userEvent;

describe('Register', () => {
  const mockOnRegister = jest.fn().mockResolvedValue(undefined);
  const mockOnSwitchToLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders register form with all fields', () => {
    render(
      <Register
        onRegister={mockOnRegister}
        onSwitchToLogin={mockOnSwitchToLogin}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByRole('heading', { name: /Create your account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Full Name \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument();
  });

  it('calls onRegister with email and password on form submit', async () => {
    render(
      <Register
        onRegister={mockOnRegister}
        onSwitchToLogin={mockOnSwitchToLogin}
        loading={false}
        error={null}
      />
    );

    await user.type(screen.getByPlaceholderText(/Email address/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/^Password$/i), 'password123');
    await user.type(screen.getByPlaceholderText(/Confirm Password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    expect(mockOnRegister).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      full_name: undefined,
    });
  });

  it('calls onRegister with full name when provided', async () => {
    render(
      <Register
        onRegister={mockOnRegister}
        onSwitchToLogin={mockOnSwitchToLogin}
        loading={false}
        error={null}
      />
    );

    await user.type(screen.getByPlaceholderText(/Full Name \(Optional\)/i), 'John Doe');
    await user.type(screen.getByPlaceholderText(/Email address/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/^Password$/i), 'password123');
    await user.type(screen.getByPlaceholderText(/Confirm Password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    expect(mockOnRegister).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      full_name: 'John Doe',
    });
  });

  it('shows password mismatch error when passwords do not match', async () => {
    render(
      <Register
        onRegister={mockOnRegister}
        onSwitchToLogin={mockOnSwitchToLogin}
        loading={false}
        error={null}
      />
    );

    await user.type(screen.getByPlaceholderText(/^Password$/i), 'password123');
    await user.type(screen.getByPlaceholderText(/Confirm Password/i), 'different');
    expect(screen.getByText(/Passwords do not match/)).toBeInTheDocument();
  });

  it('disables submit button when passwords do not match', async () => {
    render(
      <Register
        onRegister={mockOnRegister}
        onSwitchToLogin={mockOnSwitchToLogin}
        loading={false}
        error={null}
      />
    );

    await user.type(screen.getByPlaceholderText(/^Password$/i), 'password123');
    await user.type(screen.getByPlaceholderText(/Confirm Password/i), 'different');
    expect(screen.getByRole('button', { name: /Create account/i })).toBeDisabled();
  });

  it('does not call onRegister when passwords do not match', async () => {
    render(
      <Register
        onRegister={mockOnRegister}
        onSwitchToLogin={mockOnSwitchToLogin}
        loading={false}
        error={null}
      />
    );

    await user.type(screen.getByPlaceholderText(/Email address/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/^Password$/i), 'password123');
    await user.type(screen.getByPlaceholderText(/Confirm Password/i), 'different');
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    expect(mockOnRegister).not.toHaveBeenCalled();
  });

  it('calls onSwitchToLogin when sign in link is clicked', async () => {
    render(
      <Register
        onRegister={mockOnRegister}
        onSwitchToLogin={mockOnSwitchToLogin}
        loading={false}
        error={null}
      />
    );
    await user.click(screen.getByRole('button', { name: /sign in to your existing account/i }));
    expect(mockOnSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  it('displays error message when error prop is provided', () => {
    render(
      <Register
        onRegister={mockOnRegister}
        onSwitchToLogin={mockOnSwitchToLogin}
        loading={false}
        error="Email already in use"
      />
    );
    expect(screen.getByText(/Email already in use/)).toBeInTheDocument();
  });

  it('disables submit button and shows Creating account... when loading', () => {
    render(
      <Register
        onRegister={mockOnRegister}
        onSwitchToLogin={mockOnSwitchToLogin}
        loading={true}
        error={null}
      />
    );
    const submitBtn = screen.getByRole('button', { name: /Creating account/i });
    expect(submitBtn).toBeDisabled();
  });
});
