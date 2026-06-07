//
//  RecentLooksSection.swift
//  OutfitSuggestor
//

import SwiftUI
import UIKit

struct RecentLooksSection: View {
    var onSelectEntry: (OutfitHistoryEntry) -> Void
    var onViewAll: () -> Void

    @ObservedObject private var auth = AuthService.shared
    @State private var entries: [OutfitHistoryEntry] = []
    @State private var isLoading = false
    @State private var bookmarkedIDs: Set<Int> = []

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent looks")
                    .font(.headline)
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                if auth.isAuthenticated {
                    Button("View all") {
                        onViewAll()
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.gradientStart)
                    .accessibilityIdentifier("home.recentLooksViewAll")
                }
            }

            if !auth.isAuthenticated {
                Text("Sign in to see your recent outfit suggestions.")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .glassCard()
            } else if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                        .tint(AppTheme.accent)
                    Spacer()
                }
                .padding(.vertical, 20)
            } else if entries.isEmpty {
                Text("No recent looks yet. Generate your first outfit above.")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .glassCard()
            } else {
                VStack(spacing: 10) {
                    ForEach(entries.prefix(4)) { entry in
                        recentLookRow(entry)
                    }
                }
            }
        }
        .padding(.horizontal)
        .task(id: auth.isAuthenticated) {
            await loadRecentLooks()
        }
    }

    @ViewBuilder
    private func recentLookRow(_ entry: OutfitHistoryEntry) -> some View {
        Button {
            onSelectEntry(entry)
        } label: {
            HStack(spacing: 12) {
                recentLookThumbnail(entry)
                    .frame(width: 64, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(AppTheme.border, lineWidth: 1)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(lookTitle(for: entry))
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text(formattedDate(entry.created_at))
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }

                Spacer(minLength: 0)

                Button {
                    toggleBookmark(entry.id)
                } label: {
                    Image(systemName: bookmarkedIDs.contains(entry.id) ? "bookmark.fill" : "bookmark")
                        .font(.body.weight(.semibold))
                        .foregroundColor(AppTheme.gradientStart)
                }
                .buttonStyle(.plain)
            }
            .padding(12)
            .glassCard()
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("home.recentLook.\(entry.id)")
    }

    @ViewBuilder
    private func recentLookThumbnail(_ entry: OutfitHistoryEntry) -> some View {
        if let image = decodeBase64Image(entry.model_image) ?? decodeBase64Image(entry.image_data) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
        } else {
            ZStack {
                AppTheme.surface
                Image(systemName: "tshirt.fill")
                    .foregroundColor(AppTheme.gradientStart)
            }
        }
    }

    private func lookTitle(for entry: OutfitHistoryEntry) -> String {
        let pieces = [entry.shirt, entry.trouser, entry.blazer].filter { !$0.isEmpty }
        if let first = pieces.first {
            return first
        }
        return "Outfit Look"
    }

    private func formattedDate(_ raw: String) -> String {
        let isoFormats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSSSSS",
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss",
        ]
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        for format in isoFormats {
            parser.dateFormat = format
            if let date = parser.date(from: raw) {
                let output = DateFormatter()
                output.dateFormat = "MMM d, yyyy"
                return output.string(from: date)
            }
        }
        if let date = ISO8601DateFormatter().date(from: raw) {
            let output = DateFormatter()
            output.dateFormat = "MMM d, yyyy"
            return output.string(from: date)
        }
        return raw
    }

    private func decodeBase64Image(_ value: String?) -> UIImage? {
        guard let raw = value, !raw.isEmpty else { return nil }
        let payload = raw.contains("base64,") ? String(raw.split(separator: ",").last ?? "") : raw
        let cleaned = payload.replacingOccurrences(of: "\\s", with: "", options: .regularExpression)
        guard let data = Data(base64Encoded: cleaned), let image = UIImage(data: data) else { return nil }
        return image
    }

    private func toggleBookmark(_ id: Int) {
        if bookmarkedIDs.contains(id) {
            bookmarkedIDs.remove(id)
        } else {
            bookmarkedIDs.insert(id)
        }
    }

    @MainActor
    private func loadRecentLooks() async {
        guard auth.isAuthenticated else {
            entries = []
            return
        }
        isLoading = true
        defer { isLoading = false }
        do {
            entries = try await APIService.shared.getOutfitHistory(limit: 4)
        } catch {
            entries = []
        }
    }
}
