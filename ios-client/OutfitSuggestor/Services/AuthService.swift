//
//  AuthService.swift
//  OutfitSuggestor
//
//  Authentication: register, login, me, change password
//

import Foundation

class AuthService: ObservableObject {
    static let shared = AuthService()
    private let baseURL: String
    private let session: URLSession
    
    @Published var currentUser: User?
    @Published var authToken: String?
    @Published var isAuthenticated: Bool { authToken != nil && currentUser != nil }
    
    private init() {
        self.baseURL = "http://localhost:8001"
        self.session = URLSession.shared
        self.authToken = TokenStorage.load()
        if authToken != nil {
            Task { await fetchCurrentUser() }
        }
    }
    
    func setBaseURL(_ url: String) {
        // If APIService is refactored to accept baseURL, sync here
    }
    
    // MARK: - Register
    func register(email: String, password: String, fullName: String?) async throws -> Token {
        guard let url = URL(string: "\(baseURL)/api/auth/register") else { throw AuthError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = RegisterRequest(email: email, password: password, full_name: fullName)
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AuthError.invalidResponse }
        if http.statusCode != 201 {
            if let err = try? JSONDecoder().decode(AuthAPIError.self, from: data) {
                throw AuthError.serverError(err.detail)
            }
            throw AuthError.httpError(http.statusCode)
        }
        let token = try JSONDecoder().decode(Token.self, from: data)
        await setSession(token: token)
        return token
    }
    
    // MARK: - Login
    func login(email: String, password: String) async throws -> Token {
        guard let url = URL(string: "\(baseURL)/api/auth/login") else { throw AuthError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let body = "username=\(email.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&password=\(password.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        request.httpBody = body.data(using: .utf8)
        
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AuthError.invalidResponse }
        if http.statusCode != 200 {
            if let err = try? JSONDecoder().decode(AuthAPIError.self, from: data) {
                throw AuthError.serverError(err.detail)
            }
            throw AuthError.httpError(http.statusCode)
        }
        let token = try JSONDecoder().decode(Token.self, from: data)
        await setSession(token: token)
        return token
    }
    
    // MARK: - Me
    func fetchCurrentUser() async {
        guard let token = authToken else { return }
        guard let url = URL(string: "\(baseURL)/api/auth/me") else { return }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { await clearSession(); return }
            let user = try JSONDecoder().decode(User.self, from: data)
            await MainActor.run { currentUser = user }
        } catch {
            await clearSession()
        }
    }
    
    // MARK: - Change password
    func changePassword(currentPassword: String, newPassword: String) async throws {
        guard authToken != nil else { throw AuthError.notAuthenticated }
        guard let url = URL(string: "\(baseURL)/api/auth/change-password") else { throw AuthError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(authToken!)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(ChangePasswordRequest(current_password: currentPassword, new_password: newPassword))
        
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AuthError.invalidResponse }
        if http.statusCode != 200 {
            if let err = try? JSONDecoder().decode(AuthAPIError.self, from: data) {
                throw AuthError.serverError(err.detail)
            }
            throw AuthError.httpError(http.statusCode)
        }
    }
    
    // MARK: - Logout
    func logout() {
        Task { await clearSession() }
    }
    
    @MainActor
    private func setSession(token: Token) {
        authToken = token.access_token
        currentUser = token.user
        TokenStorage.save(token.access_token)
    }
    
    @MainActor
    private func clearSession() {
        authToken = nil
        currentUser = nil
        TokenStorage.remove()
    }
}

enum AuthError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case serverError(String)
    case notAuthenticated
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response"
        case .httpError(let code): return "HTTP \(code)"
        case .serverError(let msg): return msg
        case .notAuthenticated: return "Not logged in"
        }
    }
}
