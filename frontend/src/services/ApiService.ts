/**
 * API Service Layer
 * Handles all communication with the backend API
 * This layer can be reused by Android and iOS clients
 */

import { OutfitResponse, ApiError } from '../models/OutfitModels';

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
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;

