//
//  APIService.swift
//  OutfitSuggestor
//
//  Service layer for backend API communication
//

import Foundation
import UIKit

protocol APIServiceProtocol {
    func getSuggestion(
        image: UIImage,
        textInput: String,
        useWardrobeOnly: Bool,
        generateModelImage: Bool,
        imageModel: String,
        location: String?,
        previousOutfitText: String?
    ) async throws -> OutfitSuggestion
    func getSuggestionFromWardrobeItem(
        itemId: Int,
        textInput: String,
        generateModelImage: Bool,
        imageModel: String,
        location: String?
    ) async throws -> OutfitSuggestion
    func getOutfitHistory(limit: Int) async throws -> [OutfitHistoryEntry]
    func checkOutfitDuplicate(image: UIImage) async throws -> OutfitDuplicateResponse
    func getRandomOutfit(occasion: String, season: String, style: String) async throws -> OutfitSuggestion
}

class APIService {
    static let shared = APIService()
    
    private let baseURL: String
    private let session: URLSession
    private let authTokenProvider: () -> String
    
    init(
        baseURL: String = AppConfig.apiBaseURL,
        session: URLSession? = nil,
        authTokenProvider: (() -> String?)? = nil
    ) {
        self.baseURL = baseURL
        self.authTokenProvider = { authTokenProvider?() ?? AuthService.shared.authToken ?? "" }
        if let session = session {
            self.session = session
        } else {
            let config = URLSessionConfiguration.default
            config.timeoutIntervalForRequest = 30
            config.timeoutIntervalForResource = 60
            self.session = URLSession(configuration: config)
        }
    }
    
    private func authHeader() -> String? {
        let token = authTokenProvider()
        guard !token.isEmpty else { return nil }
        return "Bearer \(token)"
    }
    
    private func setAuthIfNeeded(_ request: inout URLRequest) {
        if let v = authHeader() { request.setValue(v, forHTTPHeaderField: "Authorization") }
    }
    
    // MARK: - Suggest Outfit
    
    /// Get outfit suggestion (optionally use wardrobe only, generate model image, location for model customization)
    func getSuggestion(
        image: UIImage,
        textInput: String = "",
        useWardrobeOnly: Bool = false,
        generateModelImage: Bool = false,
        imageModel: String = "dalle3",
        location: String? = nil,
        previousOutfitText: String? = nil
    ) async throws -> OutfitSuggestion {
        guard let url = URL(string: "\(baseURL)/api/suggest-outfit") else { throw APIServiceError.invalidURL }
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        setAuthIfNeeded(&request)
        
        var body = Data()
        if let imageData = image.jpegData(compressionQuality: 0.8) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"image\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(imageData)
            body.append("\r\n".data(using: .utf8)!)
        } else { throw APIServiceError.invalidImage }
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"text_input\"\r\n\r\n".data(using: .utf8)!)
        body.append(textInput.data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"use_wardrobe_only\"\r\n\r\n".data(using: .utf8)!)
        body.append((useWardrobeOnly ? "true" : "false").data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"generate_model_image\"\r\n\r\n".data(using: .utf8)!)
        body.append((generateModelImage ? "true" : "false").data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image_model\"\r\n\r\n".data(using: .utf8)!)
        body.append(imageModel.data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        if let loc = location, !loc.isEmpty {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"location\"\r\n\r\n".data(using: .utf8)!)
            body.append(loc.data(using: .utf8)!)
            body.append("\r\n".data(using: .utf8)!)
        }
        if let previousOutfitText, !previousOutfitText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"previous_outfit_text\"\r\n\r\n".data(using: .utf8)!)
            body.append(previousOutfitText.data(using: .utf8)!)
            body.append("\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIServiceError.invalidResponse }
        guard http.statusCode == 200 else {
            if let apiError = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(apiError.detail) }
            throw APIServiceError.httpError(http.statusCode)
        }
        var suggestion = try JSONDecoder().decode(OutfitSuggestion.self, from: data)
        suggestion.imageData = image.jpegData(compressionQuality: 0.8)
        return suggestion
    }
    
    /// Get outfit suggestion from a single wardrobe item (auth required)
    func getSuggestionFromWardrobeItem(
        itemId: Int,
        textInput: String = "",
        generateModelImage: Bool = false,
        imageModel: String = "dalle3",
        location: String? = nil
    ) async throws -> OutfitSuggestion {
        guard let url = URL(string: "\(baseURL)/api/suggest-outfit-from-wardrobe-item/\(itemId)") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        setAuthIfNeeded(&request)
        var parts = [
            "text_input=\(textInput.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")",
            "generate_model_image=\(generateModelImage ? "true" : "false")",
            "image_model=\(imageModel.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")",
            "use_wardrobe_only=false"
        ]
        if let loc = location, !loc.isEmpty {
            parts.append("location=\(loc.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")
        }
        request.httpBody = parts.joined(separator: "&").data(using: .utf8)
        
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let apiError = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(apiError.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(OutfitSuggestion.self, from: data)
    }
    
    // MARK: - Outfit History
    
    func getOutfitHistory(limit: Int = 50) async throws -> [OutfitHistoryEntry] {
        guard let url = URL(string: "\(baseURL)/api/outfit-history?limit=\(limit)") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        request.timeoutInterval = 20
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        do {
            return try JSONDecoder().decode([OutfitHistoryEntry].self, from: data)
        } catch {
            throw APIServiceError.serverError("History decode failed: \(error.localizedDescription)")
        }
    }
    
    func deleteOutfitHistory(entryId: Int) async throws {
        guard let url = URL(string: "\(baseURL)/api/outfit-history/\(entryId)") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        setAuthIfNeeded(&request)
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { throw APIServiceError.invalidResponse }
    }
    
    // MARK: - Wardrobe
    
    func getWardrobe(category: String? = nil, search: String? = nil, limit: Int = 50, offset: Int = 0) async throws -> WardrobeListResponse {
        var comp = URLComponents(string: "\(baseURL)/api/wardrobe")!
        comp.queryItems = [URLQueryItem(name: "limit", value: "\(limit)"), URLQueryItem(name: "offset", value: "\(offset)")]
        if let c = category, !c.isEmpty { comp.queryItems?.append(URLQueryItem(name: "category", value: c)) }
        if let s = search, !s.isEmpty { comp.queryItems?.append(URLQueryItem(name: "search", value: s)) }
        guard let url = comp.url else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        request.timeoutInterval = 20
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        do {
            return try JSONDecoder().decode(WardrobeListResponse.self, from: data)
        } catch {
            throw APIServiceError.serverError("Wardrobe decode failed: \(error.localizedDescription)")
        }
    }
    
    func getWardrobeSummary() async throws -> WardrobeSummary {
        guard let url = URL(string: "\(baseURL)/api/wardrobe/summary") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { throw APIServiceError.invalidResponse }
        return try JSONDecoder().decode(WardrobeSummary.self, from: data)
    }
    
    func getWardrobeItem(id: Int) async throws -> WardrobeItem {
        guard let url = URL(string: "\(baseURL)/api/wardrobe/\(id)") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(WardrobeItem.self, from: data)
    }
    
    /// Check if image is duplicate in user's wardrobe (auth required)
    func checkWardrobeDuplicate(image: UIImage) async throws -> WardrobeDuplicateResponse {
        guard let url = URL(string: "\(baseURL)/api/wardrobe/check-duplicate") else { throw APIServiceError.invalidURL }
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        setAuthIfNeeded(&request)
        var body = Data()
        guard let imageData = image.jpegData(compressionQuality: 0.8) else { throw APIServiceError.invalidImage }
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(WardrobeDuplicateResponse.self, from: data)
    }
    
    /// Analyze wardrobe image with AI (BLIP or vit-gpt2) to get category, color, description (auth required)
    func analyzeWardrobeImage(image: UIImage, modelType: String = "blip") async throws -> WardrobeAnalyzeResponse {
        guard let url = URL(string: "\(baseURL)/api/wardrobe/analyze-image") else { throw APIServiceError.invalidURL }
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        setAuthIfNeeded(&request)
        var body = Data()
        guard let imageData = image.jpegData(compressionQuality: 0.8) else { throw APIServiceError.invalidImage }
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"model_type\"\r\n\r\n".data(using: .utf8)!)
        body.append(modelType.data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(WardrobeAnalyzeResponse.self, from: data)
    }
    
    /// Add wardrobe item (category, color, description required; image optional)
    func addWardrobeItem(category: String, color: String, description: String, image: UIImage? = nil) async throws -> WardrobeItem {
        guard let url = URL(string: "\(baseURL)/api/wardrobe") else { throw APIServiceError.invalidURL }
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        setAuthIfNeeded(&request)
        var body = Data()
        func appendForm(_ name: String, _ value: String) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append(value.data(using: .utf8)!)
            body.append("\r\n".data(using: .utf8)!)
        }
        appendForm("category", category)
        appendForm("color", color)
        appendForm("description", description)
        if let img = image, let imageData = img.jpegData(compressionQuality: 0.8) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"image\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(imageData)
            body.append("\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 201 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.httpError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }
        return try JSONDecoder().decode(WardrobeItem.self, from: data)
    }
    
    /// Update wardrobe item (all fields optional; send only what changes)
    func updateWardrobeItem(id: Int, category: String? = nil, color: String? = nil, description: String? = nil, image: UIImage? = nil) async throws -> WardrobeItem {
        guard let url = URL(string: "\(baseURL)/api/wardrobe/\(id)") else { throw APIServiceError.invalidURL }
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        setAuthIfNeeded(&request)
        var body = Data()
        func appendForm(_ name: String, _ value: String) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append(value.data(using: .utf8)!)
            body.append("\r\n".data(using: .utf8)!)
        }
        if let v = category { appendForm("category", v) }
        if let v = color { appendForm("color", v) }
        if let v = description { appendForm("description", v) }
        if let img = image, let imageData = img.jpegData(compressionQuality: 0.8) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"image\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(imageData)
            body.append("\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(WardrobeItem.self, from: data)
    }
    
    func deleteWardrobeItem(id: Int) async throws {
        guard let url = URL(string: "\(baseURL)/api/wardrobe/\(id)") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        setAuthIfNeeded(&request)
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { throw APIServiceError.invalidResponse }
    }
    
    /// Random outfit from wardrobe (auth required)
    func getRandomOutfit(occasion: String = "casual", season: String = "all", style: String = "modern") async throws -> OutfitSuggestion {
        var comp = URLComponents(string: "\(baseURL)/api/wardrobe/random-outfit")!
        comp.queryItems = [
            URLQueryItem(name: "occasion", value: occasion),
            URLQueryItem(name: "season", value: season),
            URLQueryItem(name: "style", value: style)
        ]
        guard let url = comp.url else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        request.timeoutInterval = 20
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIServiceError.invalidResponse
        }
        guard http.statusCode == 200 else {
            if http.statusCode == 401 {
                throw APIServiceError.serverError("Session expired or invalid. Please log in again.")
            }
            if let err = try? JSONDecoder().decode(APIError.self, from: data) {
                throw APIServiceError.serverError(err.detail)
            }
            let rawBody = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if !rawBody.isEmpty {
                throw APIServiceError.serverError("Random wardrobe failed (\(http.statusCode)): \(rawBody)")
            }
            throw APIServiceError.httpError(http.statusCode)
        }
        if let raw = try? JSONDecoder().decode(RandomOutfitResponse.self, from: data) {
            return raw.toOutfitSuggestion()
        }
        if let suggestion = try? JSONDecoder().decode(OutfitSuggestion.self, from: data) {
            return suggestion
        }
        throw APIServiceError.serverError("Random wardrobe decode failed: unexpected response format")
    }
    
    // MARK: - Access Logs (admin-only)
    
    struct AccessLogsParams {
        var startDate: String?
        var endDate: String?
        var user: String?
        var operationType: String?
        var endpoint: String?
        var limit: Int = 100
        var offset: Int = 0
    }
    
    func getAccessLogs(params: AccessLogsParams = AccessLogsParams()) async throws -> AccessLogsResponse {
        var comp = URLComponents(string: "\(baseURL)/api/access-logs/")!
        comp.queryItems = [
            URLQueryItem(name: "limit", value: "\(params.limit)"),
            URLQueryItem(name: "offset", value: "\(params.offset)")
        ]
        if let v = params.startDate, !v.isEmpty { comp.queryItems?.append(URLQueryItem(name: "start_date", value: v)) }
        if let v = params.endDate, !v.isEmpty { comp.queryItems?.append(URLQueryItem(name: "end_date", value: v)) }
        if let v = params.user, !v.isEmpty { comp.queryItems?.append(URLQueryItem(name: "user", value: v)) }
        if let v = params.operationType, !v.isEmpty { comp.queryItems?.append(URLQueryItem(name: "operation_type", value: v)) }
        if let v = params.endpoint, !v.isEmpty { comp.queryItems?.append(URLQueryItem(name: "endpoint", value: v)) }
        guard let url = comp.url else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(AccessLogsResponse.self, from: data)
    }
    
    func getAccessLogStats(startDate: String? = nil, endDate: String? = nil) async throws -> AccessLogStatsResponse {
        var comp = URLComponents(string: "\(baseURL)/api/access-logs/stats")!
        var items: [URLQueryItem] = []
        if let v = startDate, !v.isEmpty { items.append(URLQueryItem(name: "start_date", value: v)) }
        if let v = endDate, !v.isEmpty { items.append(URLQueryItem(name: "end_date", value: v)) }
        comp.queryItems = items.isEmpty ? nil : items
        guard let url = comp.url else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(AccessLogStatsResponse.self, from: data)
    }
    
    func getAccessLogUsage(startDate: String? = nil, endDate: String? = nil) async throws -> AccessLogUsageResponse {
        var comp = URLComponents(string: "\(baseURL)/api/access-logs/usage")!
        var items: [URLQueryItem] = []
        if let v = startDate, !v.isEmpty { items.append(URLQueryItem(name: "start_date", value: v)) }
        if let v = endDate, !v.isEmpty { items.append(URLQueryItem(name: "end_date", value: v)) }
        comp.queryItems = items.isEmpty ? nil : items
        guard let url = comp.url else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(AccessLogUsageResponse.self, from: data)
    }
    
    /// Health check
    func healthCheck() async throws -> Bool {
        guard let url = URL(string: "\(baseURL)/health") else { throw APIServiceError.invalidURL }
        let (_, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse else { return false }
        return http.statusCode == 200
    }
    
    // MARK: - Outfit Duplicate Check
    
    /// Check if an image already exists in outfit history (before making a suggestion)
    func checkOutfitDuplicate(image: UIImage) async throws -> OutfitDuplicateResponse {
        guard let url = URL(string: "\(baseURL)/api/check-duplicate") else { throw APIServiceError.invalidURL }
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        setAuthIfNeeded(&request)
        var body = Data()
        guard let imageData = image.jpegData(compressionQuality: 0.8) else { throw APIServiceError.invalidImage }
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(OutfitDuplicateResponse.self, from: data)
    }
    
    // MARK: - Wardrobe Gap Analysis
    
    /// Analyze wardrobe gaps (auth required)
    func analyzeWardrobeGaps(request body: WardrobeGapAnalysisRequest) async throws -> WardrobeGapAnalysisResponse {
        guard let url = URL(string: "\(baseURL)/api/wardrobe/analyze-gaps") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        setAuthIfNeeded(&request)
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(WardrobeGapAnalysisResponse.self, from: data)
    }
    
    // MARK: - Integration Tests (Admin)
    
    /// List available integration tests (admin only)
    func listIntegrationTests() async throws -> [IntegrationTestCase] {
        guard let url = URL(string: "\(baseURL)/api/admin/integration-tests/") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        if let wrapped = try? JSONDecoder().decode(IntegrationTestListResponse.self, from: data) {
            return wrapped.tests
        }
        return try JSONDecoder().decode([IntegrationTestCase].self, from: data)
    }
    
    /// Run a single integration test (admin only)
    func runIntegrationTest(testId: String) async throws -> IntegrationTestResult {
        guard let url = URL(string: "\(baseURL)/api/admin/integration-tests/run") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 120
        setAuthIfNeeded(&request)
        request.httpBody = try JSONEncoder().encode(["test_id": testId])
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(IntegrationTestResult.self, from: data)
    }
    
    /// Run all integration tests (admin only)
    func runAllIntegrationTests() async throws -> [IntegrationTestResult] {
        guard let url = URL(string: "\(baseURL)/api/admin/integration-tests/run-all") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 300
        setAuthIfNeeded(&request)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode([IntegrationTestResult].self, from: data)
    }
}

extension APIService: APIServiceProtocol {}

// MARK: - Access Logs (admin)
struct AccessLogEntry: Codable, Identifiable {
    let id: Int
    let ip_address: String?
    let country: String?
    let city: String?
    let endpoint: String?
    let method: String?
    let status_code: Int?
    let response_time_ms: Double?
    let user_id: Int?
    let user_email: String?
    let user_name: String?
    let operation_type: String?
    let timestamp: String?
}

struct AccessLogsResponse: Codable {
    let total: Int
    let limit: Int
    let offset: Int
    let logs: [AccessLogEntry]
}

struct AccessLogStatsResponse: Codable {
    let total_requests: Int?
    let unique_ip_addresses: Int?
    let average_response_time_ms: Double?
    let by_country: [CountryCount]?
    let by_endpoint: [EndpointCount]?
    let by_user: [UserCount]?
}

struct CountryCount: Codable { let country: String; let count: Int }
struct EndpointCount: Codable { let endpoint: String; let count: Int }
struct UserCount: Codable {
    let user_id: Int?
    let user_email: String?
    let user_name: String?
    let count: Int
}

struct AccessLogUsageResponse: Codable {
    let by_operation_type: [String: Int]?
    let total_requests: Int?
}

// MARK: - Outfit Duplicate Check Response
struct OutfitDuplicateResponse: Codable {
    let is_duplicate: Bool
    let existing_suggestion: OutfitSuggestion?
}

// MARK: - Integration Tests (Admin)
struct IntegrationTestCase: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let layer: String
    let path: String
}

struct IntegrationTestCaseResult: Codable {
    let name: String
    let status: String
    let failure_cause: String?
}

struct IntegrationTestResult: Codable, Identifiable {
    var id: String { test_id }
    let test_id: String
    let name: String
    let description: String
    let layer: String
    let path: String
    let started_at: String
    let duration_ms: Double
    let status: String
    let timed_out: Bool
    let exit_code: Int
    let command: String
    let passed: Int
    let failed: Int
    let skipped: Int
    let suite_failure_cause: String?
    let test_cases: [IntegrationTestCaseResult]
    let output_excerpt: String
}

private struct IntegrationTestListResponse: Codable {
    let tests: [IntegrationTestCase]
}

// Backend random-outfit returns { shirt, trouser, blazer, shoes, belt, reasoning, matching_wardrobe_items }
struct RandomOutfitResponse: Codable {
    let shirt: String
    let trouser: String
    let blazer: String
    let shoes: String
    let belt: String
    let reasoning: String
    
    func toOutfitSuggestion() -> OutfitSuggestion {
        OutfitSuggestion(shirt: shirt, trouser: trouser, blazer: blazer, shoes: shoes, belt: belt, reasoning: reasoning, imageData: nil)
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

