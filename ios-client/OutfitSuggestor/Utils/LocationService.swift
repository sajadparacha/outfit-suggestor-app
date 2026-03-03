//
//  LocationService.swift
//  OutfitSuggestor
//
//  Gets user's location for model image customization (city, region, country).
//

import Foundation
import CoreLocation

/// Returns a human-readable location string (e.g. "San Francisco, CA, United States") or nil if unavailable.
final class LocationService: NSObject, ObservableObject {
    static let shared = LocationService()
    private let manager = CLLocationManager()
    private let geocoder = CLGeocoder()
    private var locationContinuation: CheckedContinuation<CLLocation?, Never>?
    
    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
    }
    
    /// Request location and return a string suitable for the API (city, region, country). Returns nil if denied or error.
    func getLocationString() async -> String? {
        let status = manager.authorizationStatus
        if status == .denied || status == .restricted {
            return nil
        }
        if status == .notDetermined {
            manager.requestWhenInUseAuthorization()
            var iter = 0
            while manager.authorizationStatus == .notDetermined && iter < 50 {
                try? await Task.sleep(nanoseconds: 100_000_000)
                iter += 1
            }
            if manager.authorizationStatus != .authorizedWhenInUse && manager.authorizationStatus != .authorizedAlways {
                return nil
            }
        }
        
        let location: CLLocation? = await withCheckedContinuation { cont in
            self.locationContinuation = cont
            manager.requestLocation()
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 10_000_000_000)
                if self.locationContinuation != nil {
                    self.locationContinuation?.resume(returning: nil)
                    self.locationContinuation = nil
                }
            }
        }
        guard let loc = location else { return nil }
        return await reverseGeocode(location: loc)
    }
    
    private func reverseGeocode(location: CLLocation) async -> String? {
        do {
            let placemarks = try await geocoder.reverseGeocodeLocation(location)
            guard let place = placemarks.first else { return nil }
            var parts: [String] = []
            if let locality = place.locality, !locality.isEmpty { parts.append(locality) }
            if let admin = place.administrativeArea, !admin.isEmpty, admin != place.locality { parts.append(admin) }
            if let country = place.country, !country.isEmpty { parts.append(country) }
            if parts.isEmpty, let name = place.name { parts.append(name) }
            if parts.isEmpty {
                return String(format: "%.2f, %.2f", location.coordinate.latitude, location.coordinate.longitude)
            }
            return parts.joined(separator: ", ")
        } catch {
            return String(format: "%.2f, %.2f", location.coordinate.latitude, location.coordinate.longitude)
        }
    }
}

extension LocationService: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        locationContinuation?.resume(returning: loc)
        locationContinuation = nil
    }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        locationContinuation?.resume(returning: nil)
        locationContinuation = nil
    }
}
