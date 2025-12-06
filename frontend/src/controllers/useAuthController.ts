/**
 * Authentication Controller Hook
 * Manages authentication state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { User, RegisterRequest, LoginRequest } from '../models/AuthModels';
import ApiService from '../services/ApiService';

interface UseAuthControllerReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<{ message: string; email: string }>;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthController = (): UseAuthControllerReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if user is authenticated by verifying token
   */
  const checkAuth = useCallback(async () => {
    const token = ApiService.getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await ApiService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      // Token invalid or expired
      ApiService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login user
   */
  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.login(credentials);
      setUser(response.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register new user (returns registration result, does not auto-login)
   */
  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ApiService.register(data);
      // Return result with message and email (no auto-login - user must activate)
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    ApiService.logout();
    setUser(null);
    setError(null);
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    // State
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    clearError,
    checkAuth,
  };
};


