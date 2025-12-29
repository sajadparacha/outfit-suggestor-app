/**
 * API Service Layer
 * Handles all communication with the backend API
 * This layer can be reused by Android and iOS clients
 */

import { OutfitResponse, ApiError, OutfitHistoryEntry } from '../models/OutfitModels';
import { RegisterRequest, LoginRequest, TokenResponse, User } from '../models/AuthModels';
import { WardrobeItem, WardrobeItemCreate, WardrobeItemUpdate, WardrobeSummary } from '../models/WardrobeModels';

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
   * @param generateModelImage - Whether to generate AI model image
   * @param location - User's location for model customization
   * @returns Promise with outfit suggestion
   */
  async getSuggestion(
    image: File,
    textInput: string = '',
    generateModelImage: boolean = false,
    location: string | null = null,
    imageModel: string = 'dalle3'
  ): Promise<OutfitResponse> {
    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('text_input', textInput);
      formData.append('generate_model_image', generateModelImage.toString());
      formData.append('image_model', imageModel);
      console.log('FormData - generate_model_image:', generateModelImage.toString());
      console.log('FormData - image_model:', imageModel);
      if (location) {
        formData.append('location', location);
        console.log('FormData - location:', location);
      } else {
        console.log('FormData - location: not provided');
      }

      const response = await fetch(`${this.baseUrl}/api/suggest-outfit`, {
        method: 'POST',
        headers: this.getHeaders(true, true), // isFormData = true
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to get outfit suggestion';
        try {
          const error: ApiError = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data: OutfitResponse = await response.json();
      
      // Debug: Log the response
      console.log('API Response received:', {
        hasModelImage: !!data.model_image,
        modelImageLength: data.model_image?.length || 0,
        modelImagePreview: data.model_image ? data.model_image.substring(0, 50) + '...' : null
      });
      
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
      
      // Debug: Log history entries with model images
      const entriesWithModelImage = data.filter(entry => entry.model_image);
      if (entriesWithModelImage.length > 0) {
        console.log(`📋 History: ${entriesWithModelImage.length} entries have model images`);
        entriesWithModelImage.forEach(entry => {
          console.log(`  Entry ${entry.id}: model_image length = ${entry.model_image?.length || 0}`);
        });
      } else {
        console.log('📋 History: No entries have model images');
      }
      
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
   * Register a new user and automatically log them in
   * @param registerData - User registration data
   * @returns Promise with access token and user information (auto-login)
   */
  async register(registerData: RegisterRequest): Promise<TokenResponse> {
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

      const data: TokenResponse = await response.json();
      
      // Auto-login: Set token from registration response
      if (data.access_token) {
        this.setAuthToken(data.access_token);
      }
      
      return data;
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
   * Change user password
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns Promise with success message
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to change password');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to change password');
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

  /**
   * Add a new item to user's wardrobe
   * @param itemData - Wardrobe item data
   * @param image - Optional image file
   * @returns Promise with created wardrobe item
   */
  async addWardrobeItem(
    itemData: WardrobeItemCreate,
    image?: File
  ): Promise<WardrobeItem> {
    try {
      const formData = new FormData();
      formData.append('category', itemData.category);
      formData.append('color', itemData.color);
      formData.append('description', itemData.description);
      if (image) formData.append('image', image);

      const response = await fetch(`${this.baseUrl}/api/wardrobe`, {
        method: 'POST',
        headers: this.getHeaders(true, true), // isFormData = true
        body: formData,
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to add wardrobe item');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to add wardrobe item');
    }
  }

  /**
   * Get user's wardrobe items
   * @param category - Optional category filter
   * @returns Promise with array of wardrobe items
   */
  async getWardrobe(category?: string): Promise<WardrobeItem[]> {
    try {
      const url = category 
        ? `${this.baseUrl}/api/wardrobe?category=${encodeURIComponent(category)}`
        : `${this.baseUrl}/api/wardrobe`;
      
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to get wardrobe');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get wardrobe');
    }
  }

  /**
   * Get wardrobe summary/statistics
   * @returns Promise with wardrobe summary
   */
  async getWardrobeSummary(): Promise<WardrobeSummary> {
    try {
      const response = await fetch(`${this.baseUrl}/api/wardrobe/summary`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to get wardrobe summary');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get wardrobe summary');
    }
  }

  /**
   * Get a specific wardrobe item
   * @param itemId - Wardrobe item ID
   * @returns Promise with wardrobe item
   */
  async getWardrobeItem(itemId: number): Promise<WardrobeItem> {
    try {
      const response = await fetch(`${this.baseUrl}/api/wardrobe/${itemId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to get wardrobe item');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get wardrobe item');
    }
  }

  /**
   * Update a wardrobe item
   * @param itemId - Wardrobe item ID
   * @param itemData - Updated item data
   * @param image - Optional new image file
   * @returns Promise with updated wardrobe item
   */
  async updateWardrobeItem(
    itemId: number,
    itemData: WardrobeItemUpdate,
    image?: File
  ): Promise<WardrobeItem> {
    try {
      const formData = new FormData();
      if (itemData.category) formData.append('category', itemData.category);
      if (itemData.name !== undefined) formData.append('name', itemData.name || '');
      if (itemData.description !== undefined) formData.append('description', itemData.description || '');
      if (itemData.color !== undefined) formData.append('color', itemData.color || '');
      if (itemData.brand !== undefined) formData.append('brand', itemData.brand || '');
      if (itemData.size !== undefined) formData.append('size', itemData.size || '');
      if (itemData.tags !== undefined) formData.append('tags', itemData.tags || '');
      if (itemData.condition !== undefined) formData.append('condition', itemData.condition || '');
      if (image) formData.append('image', image);

      const response = await fetch(`${this.baseUrl}/api/wardrobe/${itemId}`, {
        method: 'PUT',
        headers: this.getHeaders(true, true), // isFormData = true
        body: formData,
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to update wardrobe item');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update wardrobe item');
    }
  }

  /**
   * Analyze a wardrobe item image and extract properties using AI
   * @param image - Image file to analyze
   * @returns Promise with extracted properties
   */
  async analyzeWardrobeImage(image: File, modelType: string = 'blip'): Promise<{
    category: string;
    color: string;
    description: string;
    model_used?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('model_type', modelType); // Pass model selection to backend

      const url = `${this.baseUrl}/api/wardrobe/analyze-image`;
      const headers = this.getHeaders(true, true); // isFormData = true
      
      console.log('🔍 Analyzing wardrobe image:', {
        url,
        hasToken: !!this.getAuthToken(),
        method: 'POST'
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Failed to analyze image';
        try {
          const error: ApiError = await response.json();
          errorMessage = error.detail || errorMessage;
          console.error('❌ API Error:', error);
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
          console.error('❌ Parse Error:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Analysis result:', result);
      return result;
    } catch (error) {
      console.error('❌ Analyze image error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to analyze wardrobe image');
    }
  }

  /**
   * Delete a wardrobe item
   * @param itemId - Wardrobe item ID
   * @returns Promise with success message
   */
  async deleteWardrobeItem(itemId: number): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/wardrobe/${itemId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to delete wardrobe item');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete wardrobe item');
    }
  }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;

