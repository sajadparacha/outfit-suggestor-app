//
//  APIService.swift
//  OutfitSuggestor
//
//  Service layer for backend API communication
//

import Foundation
import UIKit

class APIService {
    static let shared = APIService()
    
    private let baseURL: String
    private let session: URLSession
    
    private init() {
        // Change this to your deployed backend URL in production
        self.baseURL = "http://localhost:8001"
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Public Methods
    
    /// Get outfit suggestion from backend API
    /// - Parameters:
    ///   - image: UIImage to analyze
    ///   - textInput: Additional context or preferences
    /// - Returns: OutfitSuggestion object
    func getSuggestion(image: UIImage, textInput: String = "") async throws -> OutfitSuggestion {
        guard let url = URL(string: "\(baseURL)/api/suggest-outfit") else {
            throw APIServiceError.invalidURL
        }
        
        // Create multipart form data
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        // Build request body
        var body = Data()
        
        // Add image data
        if let imageData = image.jpegData(compressionQuality: 0.8) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"image\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(imageData)
            body.append("\r\n".data(using: .utf8)!)
        } else {
            throw APIServiceError.invalidImage
        }
        
        // Add text input
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"text_input\"\r\n\r\n".data(using: .utf8)!)
        body.append(textInput.data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        
        // Close boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        // Make request
        let (data, response) = try await session.data(for: request)
        
        // Check response
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIServiceError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            // Try to decode error message
            if let apiError = try? JSONDecoder().decode(APIError.self, from: data) {
                throw APIServiceError.serverError(apiError.detail)
            }
            throw APIServiceError.httpError(httpResponse.statusCode)
        }
        
        // Decode response
        let decoder = JSONDecoder()
        var suggestion = try decoder.decode(OutfitSuggestion.self, from: data)
        suggestion.imageData = image.jpegData(compressionQuality: 0.8)
        
        return suggestion
    }
    
    /// Health check endpoint
    func healthCheck() async throws -> Bool {
        guard let url = URL(string: "\(baseURL)/health") else {
            throw APIServiceError.invalidURL
        }
        
        let (_, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            return false
        }
        
        return httpResponse.statusCode == 200
    }
    
    // MARK: - Configuration
    
    /// Update base URL (useful for different environments)
    func setBaseURL(_ url: String) {
        // Note: This won't work with singleton pattern in production
        // Consider using dependency injection instead
    }
}

// MARK: - Errors

enum APIServiceError: LocalizedError {
    case invalidURL
    case invalidImage
    case invalidResponse
    case httpError(Int)
    case serverError(String)
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .invalidImage:
            return "Unable to process image"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "HTTP Error: \(code)"
        case .serverError(let message):
            return message
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

