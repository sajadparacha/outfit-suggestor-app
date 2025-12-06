/**
 * API Service Layer
 * Handles all communication with the backend API
 * This layer can be reused by Android and iOS clients
 */

import { OutfitResponse, ApiError, OutfitHistoryEntry } from '../models/OutfitModels';
import { RegisterRequest, LoginRequest, TokenResponse, User } from '../models/AuthModels';

class ApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
    // Load token from localStorage on initialization
    this.authToken = localStorage.getItem('auth_token');
  }

  /**
   * Set authentication token
   * @param token - JWT token
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Get authentication token
   * @returns Current auth token or null
   */
  getAuthToken(): string | null {
    return this.authToken || localStorage.getItem('auth_token');
  }

  /**
   * Get headers with authentication if token exists
   * @param includeAuth - Whether to include authentication header
   * @param isFormData - Whether this is a FormData request (don't set Content-Type)
   * @returns Headers object
   */
  private getHeaders(includeAuth: boolean = true, isFormData: boolean = false): HeadersInit {
    const headers: HeadersInit = {};
    
    if (includeAuth && this.getAuthToken()) {
      headers['Authorization'] = `Bearer ${this.getAuthToken()}`;
    }
    
    // Don't set Content-Type for FormData - browser sets it automatically with boundary
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  /**
   * Get outfit suggestion from backend API
   * @param image - Image file to analyze
   * @param textInput - Additional context or preferences
   * @returns Promise with outfit suggestion
   */
  async getSuggestion(
    image: File,
    textInput: string = ''
  ): Promise<OutfitResponse> {
    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('text_input', textInput);

      const response = await fetch(`${this.baseUrl}/api/suggest-outfit`, {
        method: 'POST',
        headers: this.getHeaders(true, true), // isFormData = true
        body: formData,
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to get outfit suggestion');
      }

      const data: OutfitResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Health check endpoint
   * @returns Promise with health status
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      
      if (!response.ok) {
        throw new Error('Health check failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Health check failed');
    }
  }

  /**
   * Set custom base URL (useful for testing or different environments)
   * @param url - New base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Get current base URL
   * @returns Current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get outfit history from backend API
   * @param limit - Maximum number of history entries to retrieve (default: 20)
   * @returns Promise with array of outfit history entries
   */
  async getOutfitHistory(limit: number = 20): Promise<OutfitHistoryEntry[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/outfit-history?limit=${limit}`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to get outfit history');
      }

      const data: OutfitHistoryEntry[] = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch outfit history');
    }
  }

  /**
   * Check if an uploaded image is a duplicate
   * @param image - Image file to check
   * @returns Promise with duplicate check result
   */
  async checkDuplicate(
    image: File
  ): Promise<{ is_duplicate: boolean; existing_suggestion?: OutfitResponse }> {
    try {
      const formData = new FormData();
      formData.append('image', image);

      const response = await fetch(`${this.baseUrl}/api/check-duplicate`, {
        method: 'POST',
        headers: this.getHeaders(true, true), // isFormData = true
        body: formData,
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to check duplicate');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to check duplicate');
    }
  }

  /**
   * Register a new user
   * @param registerData - User registration data
   * @returns Promise with registration success message and email
   */
  async register(registerData: RegisterRequest): Promise<{ message: string; email: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Registration failed');
    }
  }

  /**
   * Activate user account with activation token
   * @param token - Activation token from email
   * @returns Promise with activation success message
   */
  async activateAccount(token: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/activate/${token}`, {
        method: 'GET',
        headers: this.getHeaders(false),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Activation failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Activation failed');
    }
  }

  /**
   * Login and get access token
   * @param loginData - Login credentials
   * @returns Promise with token and user information
   */
  async login(loginData: LoginRequest): Promise<TokenResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', loginData.username);
      formData.append('password', loginData.password);

      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data: TokenResponse = await response.json();
      // Store token
      this.setAuthToken(data.access_token);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed');
    }
  }

  /**
   * Get current authenticated user
   * @returns Promise with current user information
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/me`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.setAuthToken(null);
          throw new Error('Session expired. Please login again.');
        }
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to get user information');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get user information');
    }
  }

  /**
   * Logout current user
   */
  logout(): void {
    this.setAuthToken(null);
  }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;

