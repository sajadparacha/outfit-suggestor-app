/**
 * OAuth sign-in: ApiService, useAuthController, and auth UI controls.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import apiService from '../services/ApiService';
import { useAuthController } from './useAuthController';
import Login from '../views/components/Login';

const mockUser = {
  id: 42,
  email: 'google@example.com',
  full_name: 'google User',
  is_active: true,
  email_verified: true,
  created_at: '2026-01-01T00:00:00Z',
};

describe('OAuth authentication', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    apiService.setAuthToken(null);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    localStorage.clear();
  });

  describe('ApiService.oauthLogin', () => {
    function mockJsonResponse(body: object, status = 200, ok = true) {
      const res = {
        ok,
        status,
        headers: { get: (h: string) => (h === 'content-type' ? 'application/json' : null) },
        json: async () => body,
        clone() {
          return res;
        },
      };
      return res;
    }

    it('POSTs provider and id_token and stores access_token like login', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse({
          access_token: 'oauth-jwt-abc',
          token_type: 'bearer',
          user: mockUser,
        })
      ) as unknown as typeof fetch;

      const result = await apiService.oauthLogin({
        provider: 'google',
        id_token: 'google-id-token',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/oauth'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ provider: 'google', id_token: 'google-id-token' }),
        })
      );
      expect(result.access_token).toBe('oauth-jwt-abc');
      expect(apiService.getAuthToken()).toBe('oauth-jwt-abc');
      expect(localStorage.getItem('auth_token')).toBe('oauth-jwt-abc');
    });
  });

  describe('useAuthController.loginWithOAuth', () => {
    it('sets user and authenticates like password login', async () => {
      jest.spyOn(apiService, 'oauthLogin').mockImplementation(async () => {
        apiService.setAuthToken('oauth-jwt-abc');
        return {
          access_token: 'oauth-jwt-abc',
          token_type: 'bearer',
          user: mockUser,
        };
      });

      const { result } = renderHook(() => useAuthController());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.loginWithOAuth('google', 'google-id-token');
      });

      expect(apiService.oauthLogin).toHaveBeenCalledWith({
        provider: 'google',
        id_token: 'google-id-token',
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('google@example.com');
      expect(apiService.getAuthToken()).toBe('oauth-jwt-abc');
    });
  });

  describe('Login OAuth controls', () => {
    it('shows Google and Apple buttons and completes OAuth sign-in', async () => {
      const onOAuthLogin = jest.fn().mockResolvedValue(undefined);

      render(
        <Login
          onLogin={jest.fn()}
          onOAuthLogin={onOAuthLogin}
          onSwitchToRegister={jest.fn()}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continue with Apple/i })).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));

      await waitFor(() => {
        expect(onOAuthLogin).toHaveBeenCalledWith('google', 'test-google-id-token');
      });
    });
  });
});
