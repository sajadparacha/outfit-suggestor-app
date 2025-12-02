/**
 * API Service Layer
 * Handles all communication with the backend API
 * This layer can be reused by Android and iOS clients
 */

import { OutfitResponse, ApiError, OutfitHistoryEntry } from '../models/OutfitModels';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
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
      const response = await fetch(`${this.baseUrl}/api/outfit-history?limit=${limit}`);
      
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
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;

