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
   * Log API request to console
   * @param method - HTTP method
   * @param url - Request URL
   * @param data - Request data (optional)
   */
  private logRequest(method: string, url: string, data?: any): void {
    console.log(`[API Request] ${method} ${url}`);
    if (data) {
      // Don't log FormData or large objects
      if (data instanceof FormData) {
        console.log(`[API Request] FormData with ${Array.from(data.keys()).length} fields`);
        // Log FormData entries (excluding files)
        Array.from(data.entries()).forEach(([key, value]) => {
          if (value instanceof File) {
            console.log(`[API Request]   ${key}: File (${value.name}, ${value.size} bytes)`);
          } else {
            console.log(`[API Request]   ${key}: ${value}`);
          }
        });
      } else if (typeof data === 'string') {
        console.log(`[API Request] Body: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
      } else {
        console.log(`[API Request] Body:`, data);
      }
    }
  }

  /**
   * Log API response to console
   * @param method - HTTP method
   * @param url - Request URL
   * @param status - Response status
   * @param data - Response data (optional)
   */
  private logResponse(method: string, url: string, status: number, data?: any): void {
    const statusColor = status >= 200 && status < 300 ? 'green' : status >= 400 ? 'red' : 'orange';
    console.log(`%c[API Response] ${method} ${url} - ${status}`, `color: ${statusColor}`);
    if (data) {
      // Truncate large responses
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      if (dataStr.length > 500) {
        console.log(`[API Response] Data: ${dataStr.substring(0, 500)}... (truncated)`);
      } else {
        console.log(`[API Response] Data:`, data);
      }
    }
  }

  /**
   * Wrapper for fetch with automatic logging
   * @param url - Request URL
   * @param options - Fetch options
   * @returns Promise with response
   */
  private async fetchWithLogging(url: string, options: RequestInit = {}): Promise<Response> {
    const method = options.method || 'GET';
    this.logRequest(method, url, options.body);
    
    const response = await fetch(url, options);
    
    // Clone response to read body without consuming it
    const clonedResponse = response.clone();
    let responseData: any = null;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await clonedResponse.json();
      } else if (contentType && contentType.includes('text/')) {
        responseData = await clonedResponse.text();
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    this.logResponse(method, url, response.status, responseData);
    
    return response;
  }

  /**
   * Get outfit suggestion from backend API
   * @param image - Image file to analyze
   * @param textInput - Additional context or preferences
   * @param generateModelImage - Whether to generate AI model image
   * @param location - User's location for model customization
   * @param imageModel - Image generation model
   * @param useWardrobeOnly - If true, only suggest items from user's wardrobe (requires auth)
   * @returns Promise with outfit suggestion
   */
  async getSuggestion(
    image: File,
    textInput: string = '',
    generateModelImage: boolean = false,
    location: string | null = null,
    imageModel: string = 'dalle3',
    useWardrobeOnly: boolean = false
  ): Promise<OutfitResponse> {
    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('text_input', textInput);
      formData.append('generate_model_image', generateModelImage.toString());
      formData.append('image_model', imageModel);
      formData.append('use_wardrobe_only', useWardrobeOnly.toString());
      console.log('FormData - generate_model_image:', generateModelImage.toString());
      console.log('FormData - image_model:', imageModel);
      if (location) {
        formData.append('location', location);
        console.log('FormData - location:', location);
      } else {
        console.log('FormData - location: not provided');
      }

      const url = `${this.baseUrl}/api/suggest-outfit`;
      const response = await this.fetchWithLogging(url, {
        method: 'POST',
        headers: this.getHeaders(true, true), // isFormData = true
        body: formData,
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMessage = 'Failed to get outfit suggestion';
        if (responseData) {
          const error: ApiError = responseData;
          errorMessage = error.detail || errorMessage;
        } else {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return responseData as OutfitResponse;
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
      const url = `${this.baseUrl}/health`;
      const response = await this.fetchWithLogging(url);
      
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
      const url = `${this.baseUrl}/api/outfit-history?limit=${limit}`;
      const response = await this.fetchWithLogging(url, {
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
   * Get outfit suggestion from a wardrobe item
   * @param wardrobeItemId - ID of the wardrobe item to use
   * @param textInput - Additional context or preferences
   * @param generateModelImage - Whether to generate AI model image
   * @param location - User's location for model customization
   * @param imageModel - Image generation model (dalle3, stable-diffusion, nano-banana)
   * @returns Promise with outfit suggestion
   */
  async getSuggestionFromWardrobeItem(
    wardrobeItemId: number,
    textInput: string = '',
    generateModelImage: boolean = false,
    location: string | null = null,
    imageModel: string = 'dalle3',
    useWardrobeOnly: boolean = false
  ): Promise<OutfitResponse> {
    try {
      const formData = new FormData();
      formData.append('text_input', textInput);
      formData.append('generate_model_image', generateModelImage.toString());
      formData.append('image_model', imageModel);
      formData.append('use_wardrobe_only', useWardrobeOnly.toString());
      if (location) {
        formData.append('location', location);
      }

      const url = `${this.baseUrl}/api/suggest-outfit-from-wardrobe-item/${wardrobeItemId}`;
      const response = await this.fetchWithLogging(url, {
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
      
      console.log('API Response received (wardrobe item):', {
        hasModelImage: !!data.model_image,
        modelImageLength: data.model_image?.length || 0,
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
   * Delete an outfit history entry
   * @param entryId - History entry ID to delete
   * @returns Promise with success message
   */
  async deleteOutfitHistory(entryId: number): Promise<void> {
    try {
      const url = `${this.baseUrl}/api/outfit-history/${entryId}`;
      const response = await this.fetchWithLogging(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Failed to delete history entry');
      }

      // No response body expected for successful delete
      return;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete outfit history entry');
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

      const url = `${this.baseUrl}/api/check-duplicate`;
      const response = await this.fetchWithLogging(url, {
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
      const url = `${this.baseUrl}/api/auth/register`;
      const response = await this.fetchWithLogging(url, {
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
      const url = `${this.baseUrl}/api/auth/activate/${token}`;
      const response = await this.fetchWithLogging(url, {
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

      const url = `${this.baseUrl}/api/auth/login`;
      const response = await this.fetchWithLogging(url, {
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
      const url = `${this.baseUrl}/api/auth/change-password`;
      const response = await this.fetchWithLogging(url, {
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
      const url = `${this.baseUrl}/api/auth/me`;
      const response = await this.fetchWithLogging(url, {
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
   * Check if a wardrobe image is a duplicate
   * @param image - Image file to check
   * @returns Promise with duplicate check result
   */
  async checkWardrobeDuplicate(
    image: File
  ): Promise<{ is_duplicate: boolean; existing_item?: WardrobeItem }> {
    try {
      const formData = new FormData();
      formData.append('image', image);

      const url = `${this.baseUrl}/api/wardrobe/check-duplicate`;
      const response = await this.fetchWithLogging(url, {
        method: 'POST',
        headers: this.getHeaders(true, true), // isFormData = true
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const error: ApiError = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch (e) {
          // If JSON parsing fails, use status text
        }
        throw new Error(errorMessage);
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

      const url = `${this.baseUrl}/api/wardrobe`;
      const response = await this.fetchWithLogging(url, {
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
   * Get user's wardrobe items with pagination and search
   * @param category - Optional category filter
   * @param search - Optional search query
   * @param limit - Optional limit for pagination (default: 10)
   * @param offset - Optional offset for pagination
   * @returns Promise with paginated wardrobe items response
   */
  async getWardrobe(
    category?: string, 
    search?: string, 
    limit?: number, 
    offset?: number
  ): Promise<{ items: WardrobeItem[]; total: number; limit: number; offset: number }> {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      if (limit !== undefined) params.append('limit', limit.toString());
      if (offset !== undefined) params.append('offset', offset.toString());
      
      const url = `${this.baseUrl}/api/wardrobe${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await this.fetchWithLogging(url, {
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
      const url = `${this.baseUrl}/api/wardrobe/summary`;
      const response = await this.fetchWithLogging(url, {
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
      const url = `${this.baseUrl}/api/wardrobe/${itemId}`;
      const response = await this.fetchWithLogging(url, {
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

      const url = `${this.baseUrl}/api/wardrobe/${itemId}`;
      const response = await this.fetchWithLogging(url, {
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

      const response = await this.fetchWithLogging(url, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

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
      const url = `${this.baseUrl}/api/wardrobe/${itemId}`;
      const response = await this.fetchWithLogging(url, {
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

  /**
   * Get access logs (admin-only)
   */
  async getAccessLogs(params: {
    country?: string;
    city?: string;
    age_group?: string;
    ip_address?: string;
    user?: string;
    user_id?: number;
    operation_type?: string;
    start_date?: string;
    end_date?: string;
    endpoint?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      search.append(k, String(v));
    });

    const url = `${this.baseUrl}/api/access-logs/${search.toString() ? `?${search.toString()}` : ''}`;
    const response = await this.fetchWithLogging(url, { headers: this.getHeaders() });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const error: ApiError = await response.json();
        errorMessage = error.detail || errorMessage;
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  /**
   * Get aggregated access-log stats (admin-only)
   */
  async getAccessLogStats(params: { start_date?: string; end_date?: string } = {}): Promise<any> {
    const search = new URLSearchParams();
    if (params.start_date) search.append('start_date', params.start_date);
    if (params.end_date) search.append('end_date', params.end_date);
    const url = `${this.baseUrl}/api/access-logs/stats${search.toString() ? `?${search.toString()}` : ''}`;

    const response = await this.fetchWithLogging(url, { headers: this.getHeaders() });
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const error: ApiError = await response.json();
        errorMessage = error.detail || errorMessage;
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    }
    return await response.json();
  }

  /**
   * Get usage breakdown stats (admin-only)
   */
  async getAccessLogUsage(params: { start_date?: string; end_date?: string; user_id?: number } = {}): Promise<any> {
    const search = new URLSearchParams();
    if (params.start_date) search.append('start_date', params.start_date);
    if (params.end_date) search.append('end_date', params.end_date);
    if (params.user_id !== undefined) search.append('user_id', String(params.user_id));
    const url = `${this.baseUrl}/api/access-logs/usage${search.toString() ? `?${search.toString()}` : ''}`;

    const response = await this.fetchWithLogging(url, { headers: this.getHeaders() });
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const error: ApiError = await response.json();
        errorMessage = error.detail || errorMessage;
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    }
    return await response.json();
  }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;

