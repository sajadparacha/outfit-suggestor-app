//
//  MainFlowGuestLimitLogic.swift
//  OutfitSuggestor
//
//  Guest-limit gate for Suggest tab (testable, mirrors web spec).
//

import Foundation

enum MainFlowGuestLimitLogic {
    /// When true, Suggest shows only the guest-limit auth card — no upload, generate, or result UI.
    static func showsGuestLimitGate(isAuthenticated: Bool, isGuestBlocked: Bool) -> Bool {
        !isAuthenticated && isGuestBlocked
    }
}
