//
//  GuestSession.swift
//  OutfitSuggestor
//
//  Persists a stable guest session UUID for anonymous AI usage tracking.
//

import Foundation

enum GuestSession {
    private static let key = "guest_session_id"

    static func sessionId() -> String {
        if let existing = UserDefaults.standard.string(forKey: key), !existing.isEmpty {
            return existing
        }
        let newId = UUID().uuidString.lowercased()
        UserDefaults.standard.set(newId, forKey: key)
        return newId
    }
}
