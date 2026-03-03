//
//  AuthModels.swift
//  OutfitSuggestor
//
//  Models for authentication (matches backend API)
//

import Foundation

// MARK: - User (from GET /api/auth/me and Token.user)
struct User: Codable, Identifiable {
    let id: Int
    let email: String
    let full_name: String?
    let is_active: Bool
    let is_admin: Bool?
    let email_verified: Bool?
    let created_at: String
}

// MARK: - Token (from login/register)
struct Token: Codable {
    let access_token: String
    let token_type: String
    let user: User
}

// MARK: - Register request
struct RegisterRequest: Codable {
    let email: String
    let password: String
    let full_name: String?
}

// MARK: - Change password request
struct ChangePasswordRequest: Codable {
    let current_password: String
    let new_password: String
}

// MARK: - API error
struct AuthAPIError: Codable {
    let detail: String
}
