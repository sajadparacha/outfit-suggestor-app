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
        previousOutfitText: String?,
        sourceWardrobeItemId: Int?,
        occasion: String?,
        season: String?,
        style: String?
    ) async throws -> OutfitSuggestion
    func getSuggestionFromWardrobeItem(
        itemId: Int,
        textInput: String,
        generateModelImage: Bool,
        imageModel: String,
        location: String?,
        occasion: String?,
        season: String?,
        style: String?
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
    private let uiTestStore = UITestDataStore.shared
    
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

    private func setGuestHeaderIfNeeded(_ request: inout URLRequest) {
        guard authHeader() == nil else { return }
        request.setValue(GuestSession.sessionId(), forHTTPHeaderField: "X-Guest-Session-Id")
    }

    private func throwAPIError(from data: Data, statusCode: Int) throws -> Never {
        if let apiError = try? JSONDecoder().decode(APIError.self, from: data) {
            if statusCode == 403, apiError.code == "guest_limit_reached" {
                throw APIServiceError.guestLimitReached(apiError.detail)
            }
            throw APIServiceError.serverError(apiError.detail)
        }
        throw APIServiceError.httpError(statusCode)
    }

    private func maybeSimulateUITestDelay() async {
        guard AppConfig.isUITestMode else { return }
        // Long enough for UITests to observe ai.progressPanel before suggestion completes.
        try? await Task.sleep(nanoseconds: 3_500_000_000)
    }

    private func beginRequestActivity() async {
        await MainActor.run {
            AppRequestActivity.shared.begin()
        }
    }

    private func endRequestActivity() {
        Task { @MainActor in
            AppRequestActivity.shared.end()
        }
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
        previousOutfitText: String? = nil,
        sourceWardrobeItemId: Int? = nil,
        occasion: String? = nil,
        season: String? = nil,
        style: String? = nil
    ) async throws -> OutfitSuggestion {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            await maybeSimulateUITestDelay()
            return uiTestStore.makeSuggestionForUpload(
                image: image,
                textInput: textInput,
                sourceWardrobeItemId: sourceWardrobeItemId
            )
        }
        guard let url = URL(string: "\(baseURL)/api/suggest-outfit") else { throw APIServiceError.invalidURL }
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        setAuthIfNeeded(&request)
        setGuestHeaderIfNeeded(&request)
        
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
        if let sourceWardrobeItemId {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"source_wardrobe_item_id\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(sourceWardrobeItemId)".data(using: .utf8)!)
            body.append("\r\n".data(using: .utf8)!)
        }
        for (field, value) in [("occasion", occasion), ("season", season), ("style", style)] {
            guard let value, !value.isEmpty else { continue }
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(field)\"\r\n\r\n".data(using: .utf8)!)
            body.append(value.data(using: .utf8)!)
            body.append("\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIServiceError.invalidResponse }
        guard http.statusCode == 200 else {
            try throwAPIError(from: data, statusCode: http.statusCode)
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
        location: String? = nil,
        occasion: String? = nil,
        season: String? = nil,
        style: String? = nil
    ) async throws -> OutfitSuggestion {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            await maybeSimulateUITestDelay()
            return uiTestStore.makeSuggestionFromWardrobeItem(itemId: itemId)
        }
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
        for (key, value) in [("occasion", occasion), ("season", season), ("style", style)] {
            guard let value, !value.isEmpty else { continue }
            parts.append("\(key)=\(value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")
        }
        request.httpBody = parts.joined(separator: "&").data(using: .utf8)
        
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let apiError = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(apiError.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(OutfitSuggestion.self, from: data)
    }
    
    // MARK: - Guest Usage

    func getGuestUsage() async throws -> GuestUsageResponse {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            return GuestUsageResponse(limit: 3, used: 0, remaining: 3, requires_signup: false)
        }
        guard let url = URL(string: "\(baseURL)/api/guest-usage") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setGuestHeaderIfNeeded(&request)
        request.timeoutInterval = 15
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            try throwAPIError(from: data, statusCode: statusCode)
        }
        return try JSONDecoder().decode(GuestUsageResponse.self, from: data)
    }

    // MARK: - Outfit History
    
    func getOutfitHistory(limit: Int = 50) async throws -> [OutfitHistoryEntry] {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            return uiTestStore.history(limit: limit)
        }
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
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            uiTestStore.deleteHistory(entryId: entryId)
            return
        }
        guard let url = URL(string: "\(baseURL)/api/outfit-history/\(entryId)") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        setAuthIfNeeded(&request)
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { throw APIServiceError.invalidResponse }
    }
    
    // MARK: - Wardrobe
    
    func getWardrobe(category: String? = nil, search: String? = nil, limit: Int = 50, offset: Int = 0) async throws -> WardrobeListResponse {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            return uiTestStore.wardrobe(category: category, search: search, limit: limit, offset: offset)
        }
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
        await beginRequestActivity()
        defer { endRequestActivity() }
        guard let url = URL(string: "\(baseURL)/api/wardrobe/summary") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { throw APIServiceError.invalidResponse }
        return try JSONDecoder().decode(WardrobeSummary.self, from: data)
    }
    
    func getWardrobeItem(id: Int) async throws -> WardrobeItem {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            guard let item = uiTestStore.wardrobeItem(id: id) else {
                throw APIServiceError.invalidResponse
            }
            return item
        }
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
        await beginRequestActivity()
        defer { endRequestActivity() }
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
        await beginRequestActivity()
        defer { endRequestActivity() }
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
        await beginRequestActivity()
        defer { endRequestActivity() }
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
        await beginRequestActivity()
        defer { endRequestActivity() }
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
        await beginRequestActivity()
        defer { endRequestActivity() }
        guard let url = URL(string: "\(baseURL)/api/wardrobe/\(id)") else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        setAuthIfNeeded(&request)
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { throw APIServiceError.invalidResponse }
    }
    
    /// Random outfit from wardrobe (auth required)
    func getRandomOutfit(occasion: String = "casual", season: String = "all", style: String = "modern") async throws -> OutfitSuggestion {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            await maybeSimulateUITestDelay()
            return uiTestStore.randomSuggestion()
        }
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
        var country: String?
        var operationType: String?
        var endpoint: String?
        var limit: Int = 100
        var offset: Int = 0
    }
    
    func getAccessLogs(params: AccessLogsParams = AccessLogsParams()) async throws -> AccessLogsResponse {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            return uiTestStore.accessLogsResponse()
        }
        var comp = URLComponents(string: "\(baseURL)/api/access-logs/")!
        comp.queryItems = [
            URLQueryItem(name: "limit", value: "\(params.limit)"),
            URLQueryItem(name: "offset", value: "\(params.offset)")
        ]
        if let v = params.startDate, !v.isEmpty { comp.queryItems?.append(URLQueryItem(name: "start_date", value: v)) }
        if let v = params.endDate, !v.isEmpty { comp.queryItems?.append(URLQueryItem(name: "end_date", value: v)) }
        if let v = params.user, !v.isEmpty { comp.queryItems?.append(URLQueryItem(name: "user", value: v)) }
        if let v = params.country, !v.isEmpty { comp.queryItems?.append(URLQueryItem(name: "country", value: v)) }
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
    
    func getAccessLogStats(
        startDate: String? = nil,
        endDate: String? = nil,
        user: String? = nil,
        userId: Int? = nil
    ) async throws -> AccessLogStatsResponse {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            return uiTestStore.accessLogStatsResponse()
        }
        var comp = URLComponents(string: "\(baseURL)/api/access-logs/stats")!
        var items: [URLQueryItem] = []
        if let v = startDate, !v.isEmpty { items.append(URLQueryItem(name: "start_date", value: v)) }
        if let v = endDate, !v.isEmpty { items.append(URLQueryItem(name: "end_date", value: v)) }
        if let userId { items.append(URLQueryItem(name: "user_id", value: "\(userId)")) }
        else if let v = user, !v.isEmpty { items.append(URLQueryItem(name: "user", value: v)) }
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
    
    func getAccessLogUsage(
        startDate: String? = nil,
        endDate: String? = nil,
        user: String? = nil,
        userId: Int? = nil
    ) async throws -> AccessLogUsageBreakdown {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            return uiTestStore.accessLogUsageResponse()
        }
        var comp = URLComponents(string: "\(baseURL)/api/access-logs/usage")!
        var items: [URLQueryItem] = []
        if let v = startDate, !v.isEmpty { items.append(URLQueryItem(name: "start_date", value: v)) }
        if let v = endDate, !v.isEmpty { items.append(URLQueryItem(name: "end_date", value: v)) }
        if let userId { items.append(URLQueryItem(name: "user_id", value: "\(userId)")) }
        else if let v = user, !v.isEmpty { items.append(URLQueryItem(name: "user", value: v)) }
        comp.queryItems = items.isEmpty ? nil : items
        guard let url = comp.url else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(AccessLogUsageBreakdown.self, from: data)
    }

    func getAccessLogTimeline(
        startDate: String? = nil,
        endDate: String? = nil,
        groupBy: String = "day",
        city: String? = nil,
        country: String? = nil,
        user: String? = nil,
        userId: Int? = nil
    ) async throws -> AccessLogTimelineResponse {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            return uiTestStore.accessLogTimelineResponse()
        }
        var comp = URLComponents(string: "\(baseURL)/api/access-logs/timeline")!
        var items: [URLQueryItem] = [URLQueryItem(name: "group_by", value: groupBy)]
        if let v = startDate, !v.isEmpty { items.append(URLQueryItem(name: "start_date", value: v)) }
        if let v = endDate, !v.isEmpty { items.append(URLQueryItem(name: "end_date", value: v)) }
        if let v = country, !v.isEmpty { items.append(URLQueryItem(name: "country", value: v)) }
        if let v = city, !v.isEmpty { items.append(URLQueryItem(name: "city", value: v)) }
        if let userId { items.append(URLQueryItem(name: "user_id", value: "\(userId)")) }
        else if let v = user, !v.isEmpty { items.append(URLQueryItem(name: "user", value: v)) }
        comp.queryItems = items
        guard let url = comp.url else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(AccessLogTimelineResponse.self, from: data)
    }

    struct SearchReportsParams {
        var startDate: String?
        var endDate: String?
        var occasion: String?
        var season: String?
        var style: String?
        var user: String?
        var userId: Int?
    }

    func getSearchReports(params: SearchReportsParams = SearchReportsParams()) async throws -> SearchReportsResponse {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            return uiTestStore.searchReportsResponse()
        }
        var comp = URLComponents(string: "\(baseURL)/api/reports/searches")!
        var items: [URLQueryItem] = []
        if let v = params.startDate, !v.isEmpty { items.append(URLQueryItem(name: "start_date", value: v)) }
        if let v = params.endDate, !v.isEmpty { items.append(URLQueryItem(name: "end_date", value: v)) }
        if let v = params.occasion, !v.isEmpty { items.append(URLQueryItem(name: "occasion", value: v)) }
        if let v = params.season, !v.isEmpty { items.append(URLQueryItem(name: "season", value: v)) }
        if let v = params.style, !v.isEmpty { items.append(URLQueryItem(name: "style", value: v)) }
        if let userId = params.userId { items.append(URLQueryItem(name: "user_id", value: "\(userId)")) }
        else if let v = params.user, !v.isEmpty { items.append(URLQueryItem(name: "user", value: v)) }
        comp.queryItems = items.isEmpty ? nil : items
        guard let url = comp.url else { throw APIServiceError.invalidURL }
        var request = URLRequest(url: url)
        setAuthIfNeeded(&request)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) { throw APIServiceError.serverError(err.detail) }
            throw APIServiceError.invalidResponse
        }
        return try JSONDecoder().decode(SearchReportsResponse.self, from: data)
    }
    
    /// Health check
    func healthCheck() async throws -> Bool {
        await beginRequestActivity()
        defer { endRequestActivity() }
        guard let url = URL(string: "\(baseURL)/health") else { throw APIServiceError.invalidURL }
        let (_, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse else { return false }
        return http.statusCode == 200
    }
    
    // MARK: - Outfit Duplicate Check
    
    /// Check if an image already exists in outfit history (before making a suggestion)
    func checkOutfitDuplicate(image: UIImage) async throws -> OutfitDuplicateResponse {
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            return OutfitDuplicateResponse(is_duplicate: false, existing_suggestion: nil)
        }
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
        await beginRequestActivity()
        defer { endRequestActivity() }
        if AppConfig.isUITestMode {
            return uiTestStore.makeGapAnalysis(for: body)
        }
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
    let by_city: [CityCount]?
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

// MARK: - Outfit Duplicate Check Response
struct OutfitDuplicateResponse: Codable {
    let is_duplicate: Bool
    let existing_suggestion: OutfitSuggestion?
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

final class UITestDataStore {
    static let shared = UITestDataStore()

    private static let wardrobeTestImageBase64: String = {
        let size = CGSize(width: 4, height: 4)
        let renderer = UIGraphicsImageRenderer(size: size)
        let image = renderer.image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: size))
        }
        return image.jpegData(compressionQuality: 0.85)?.base64EncodedString() ?? ""
    }()

    private let lock = NSLock()
    private var wardrobeItems: [WardrobeItem]
    private var historyEntries: [OutfitHistoryEntry]
    private var nextHistoryId: Int

    private init() {
        let testImage = Self.wardrobeTestImageBase64
        wardrobeItems = [
            WardrobeItem(id: 1, category: "shirt", name: "Oxford Shirt", description: "White oxford shirt", color: "White", image_data: testImage),
            WardrobeItem(id: 2, category: "trouser", name: "Chino", description: "Navy chinos", color: "Navy", image_data: testImage),
            WardrobeItem(id: 3, category: "shoes", name: "Loafers", description: "Black loafers", color: "Black", image_data: testImage),
            WardrobeItem(id: 4, category: "belt", name: "Leather Belt", description: "Brown leather belt", color: "Brown", image_data: testImage),
            WardrobeItem(id: 5, category: "hat", name: "Wool Hat", description: "Soft gray wool hat", color: "Gray", image_data: testImage)
        ]
        historyEntries = [
            OutfitHistoryEntry(
                id: 100,
                created_at: "2026-05-22T10:19:00",
                text_input: "Occasion: casual, Season: all, Style: modern",
                image_data: nil,
                model_image: nil,
                shirt: "White cotton button-down shirt",
                trouser: "Dark gray slim-fit chinos",
                blazer: "Navy blue unstructured blazer",
                shoes: "Black leather loafers",
                belt: "Black leather belt",
                reasoning: "Clean casual look with contrast and balance.",
                source_wardrobe_item_id: 3,
                shoes_id: 3
            ),
            OutfitHistoryEntry(
                id: 101,
                created_at: "2026-05-21T09:00:00",
                text_input: "Business smart outfit",
                image_data: nil,
                model_image: nil,
                shirt: "Light blue spread-collar shirt",
                trouser: "Charcoal wool trousers",
                blazer: "Mid-gray blazer",
                shoes: "Dark brown brogues",
                belt: "Dark brown leather belt",
                reasoning: "Business-ready with grounded neutral palette.",
                source_wardrobe_item_id: 2,
                trouser_id: 2,
                belt_id: 4
            ),
            OutfitHistoryEntry(
                id: 102,
                created_at: "2026-05-20T08:15:00",
                text_input: "Weekend linen profile",
                image_data: nil,
                model_image: nil,
                shirt: "Linen cream shirt",
                trouser: "Stone drawstring trousers",
                blazer: "No blazer",
                shoes: "White canvas sneakers",
                belt: "No belt",
                reasoning: "Breathable, relaxed weekend outfit.",
                source_wardrobe_item_id: 1,
                shirt_id: 1
            )
        ]
        nextHistoryId = 200
    }

    func wardrobeItem(id: Int) -> WardrobeItem? {
        lock.lock()
        defer { lock.unlock() }
        return wardrobeItems.first { $0.id == id }
    }

    func wardrobe(category: String?, search: String?, limit: Int, offset: Int) -> WardrobeListResponse {
        lock.lock()
        defer { lock.unlock() }
        var items = wardrobeItems
        if let category, !category.isEmpty {
            items = items.filter { $0.category.caseInsensitiveCompare(category) == .orderedSame }
        }
        if let search, !search.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let q = search.lowercased()
            items = items.filter { item in
                item.category.lowercased().contains(q)
                    || (item.name?.lowercased().contains(q) ?? false)
                    || (item.description?.lowercased().contains(q) ?? false)
                    || (item.color?.lowercased().contains(q) ?? false)
            }
        }
        let total = items.count
        let end = min(items.count, offset + limit)
        let paged = offset < end ? Array(items[offset..<end]) : []
        return WardrobeListResponse(items: paged, total: total, limit: limit, offset: offset)
    }

    func history(limit: Int) -> [OutfitHistoryEntry] {
        lock.lock()
        defer { lock.unlock() }
        return Array(historyEntries.prefix(limit))
    }

    func deleteHistory(entryId: Int) {
        lock.lock()
        defer { lock.unlock() }
        historyEntries.removeAll { $0.id == entryId }
    }

    func makeSuggestionFromWardrobeItem(itemId: Int) -> OutfitSuggestion {
        lock.lock()
        defer { lock.unlock() }
        let suggestion = OutfitSuggestion(
            shirt: "Crisp white shirt from wardrobe",
            trouser: "Slim navy trousers",
            blazer: "Soft gray blazer",
            shoes: "Polished black loafers",
            belt: "Matching black leather belt",
            reasoning: "Built around your selected wardrobe item for a balanced, versatile outfit."
        )
        appendSuggestionToHistory(suggestion, sourceWardrobeItemId: itemId)
        return suggestion
    }

    func makeSuggestionForUpload(
        image: UIImage,
        textInput: String,
        sourceWardrobeItemId: Int? = nil
    ) -> OutfitSuggestion {
        lock.lock()
        defer { lock.unlock() }
        let suggestion = OutfitSuggestion(
            shirt: "Minimal white tee",
            trouser: "Relaxed charcoal trousers",
            blazer: "Lightweight navy blazer",
            shoes: "Clean white sneakers",
            belt: "Matte black belt",
            reasoning: "A modern smart-casual combination tuned for comfort and clean contrast.",
            imageData: image.jpegData(compressionQuality: 0.8)
        )
        appendSuggestionToHistory(suggestion, sourceWardrobeItemId: sourceWardrobeItemId, prompt: textInput)
        return suggestion
    }

    func randomSuggestion() -> OutfitSuggestion {
        OutfitSuggestion(
            shirt: "Soft beige shirt",
            trouser: "Olive trousers",
            blazer: "Stone blazer",
            shoes: "Brown derby shoes",
            belt: "Brown textured belt",
            reasoning: "Randomly selected from your test wardrobe profile."
        )
    }

    func makeGapAnalysis(for request: WardrobeGapAnalysisRequest) -> WardrobeGapAnalysisResponse {
        let categories = ["shirt", "trouser", "blazer", "shoes", "belt"]
        var analysisByCategory: [String: WardrobeCategoryGap] = [:]
        for category in categories {
            analysisByCategory[category] = WardrobeCategoryGap(
                category: category,
                owned_colors: ["white"],
                owned_styles: ["solid"],
                missing_colors: ["navy"],
                missing_styles: ["linen"],
                recommended_purchases: ["Add a versatile \(category) option"],
                item_count: category == "shirt" ? 1 : 0
            )
        }

        let isPremium = request.analysis_mode == "premium"
        return WardrobeGapAnalysisResponse(
            occasion: request.occasion,
            season: request.season,
            style: request.style,
            analysis_mode: isPremium ? "premium" : "free",
            analysis_by_category: analysisByCategory,
            overall_summary: isPremium
                ? "Premium wardrobe analysis completed for UI testing."
                : "Basic wardrobe analysis completed for UI testing.",
            summaryText: isPremium
                ? "Premium wardrobe analysis completed for UI testing."
                : "Basic wardrobe analysis completed for UI testing.",
            analysisDepth: isPremium ? "Premium" : "Basic",
            priorityShoppingList: nil,
            categoryInsights: nil,
            ai_prompt: isPremium ? "ui-test-premium-prompt" : nil,
            ai_raw_response: isPremium ? "{\"analysis\":\"ui-test-premium-response\"}" : nil,
            cost: isPremium
                ? WardrobeGapAnalysisCost(
                    gpt4_cost: 0.0123,
                    model_image_cost: 0.0,
                    total_cost: 0.0123,
                    input_tokens: 120,
                    output_tokens: 220
                )
                : nil
        )
    }

    func accessLogsResponse() -> AccessLogsResponse {
        AccessLogsResponse(total: 0, limit: 100, offset: 0, logs: [])
    }

    func accessLogStatsResponse() -> AccessLogStatsResponse {
        AccessLogStatsResponse(
            total_requests: 0,
            unique_ip_addresses: 0,
            average_response_time_ms: nil,
            by_country: [],
            by_city: [],
            by_endpoint: [],
            by_user: []
        )
    }

    func accessLogUsageResponse() -> AccessLogUsageBreakdown {
        AccessLogUsageBreakdown(
            ai_calls: UsageAICalls(
                outfit_suggestions: 0,
                wardrobe_analysis: 0,
                total: 0,
                unique_users: 0,
                average_response_time_ms: nil
            ),
            wardrobe_operations: UsageWardrobeOperations(
                add: 0,
                update: 0,
                delete: 0,
                view: 0,
                check_duplicate: 0,
                summary: 0,
                total: 0,
                unique_users: 0,
                average_response_time_ms: nil
            ),
            outfit_history: UsageOutfitHistory(views: 0, unique_users: 0),
            top_users: []
        )
    }

    func accessLogTimelineResponse() -> AccessLogTimelineResponse {
        AccessLogTimelineResponse(group_by: "day", timeline: [])
    }

    func searchReportsResponse() -> SearchReportsResponse {
        SearchReportsResponse(
            total_searches: 0,
            by_occasion: [],
            by_season: [],
            by_style: [],
            timeline: [],
            recent: []
        )
    }

    private func appendSuggestionToHistory(_ suggestion: OutfitSuggestion, sourceWardrobeItemId: Int?, prompt: String? = nil) {
        let now = ISO8601DateFormatter().string(from: Date())
        let entry = OutfitHistoryEntry(
            id: nextHistoryId,
            created_at: now,
            text_input: prompt,
            image_data: suggestion.imageData?.base64EncodedString(),
            model_image: nil,
            shirt: suggestion.shirt,
            trouser: suggestion.trouser,
            blazer: suggestion.blazer,
            shoes: suggestion.shoes,
            belt: suggestion.belt,
            reasoning: suggestion.reasoning,
            source_wardrobe_item_id: sourceWardrobeItemId
        )
        nextHistoryId += 1
        historyEntries.insert(entry, at: 0)
    }
}

// MARK: - Errors

enum APIServiceError: LocalizedError {
    case invalidURL
    case invalidImage
    case invalidResponse
    case httpError(Int)
    case serverError(String)
    case guestLimitReached(String)
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
        case .guestLimitReached(let message):
            return message
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

