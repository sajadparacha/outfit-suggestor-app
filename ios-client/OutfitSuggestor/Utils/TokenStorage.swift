//
//  TokenStorage.swift
//  OutfitSuggestor
//
//  Persists auth token. Uses UserDefaults for simplicity; use Keychain in production.
//

import Foundation

enum TokenStorage {
    private static let key = "outfit_suggestor_auth_token"
    
    static func save(_ token: String) {
        UserDefaults.standard.set(token, forKey: key)
    }
    
    static func load() -> String? {
        UserDefaults.standard.string(forKey: key)
    }
    
    static func remove() {
        UserDefaults.standard.removeObject(forKey: key)
    }
}
