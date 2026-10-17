//
//  WatchWeekSnapshotBuilder.swift
//  OutfitSuggestor
//
//  Converts the loaded week plan into the compact snapshot sent to Apple Watch.
//

import Foundation
import UIKit

enum WatchWeekSnapshotBuilder {
    /// Total JPEG bytes allowed for the whole week's pictures (sent to the watch as one file transfer).
    static let imageBudgetBytes = 600_000
    /// Encode attempts (longest edge in pixels, JPEG quality), largest first.
    static let imageEncodeSteps: [(maxPixels: CGFloat, quality: CGFloat)] = [
        (320, 0.55), (240, 0.45), (160, 0.4),
    ]

    static func make(
        plan: WeekPlanResponse,
        now: Date = Date(),
        includeImages: Bool = true,
        morningRefreshMinutes: Int = WatchPlanRefresher.refreshMinutes()
    ) -> WatchWeekSnapshot {
        let sortedDays = plan.days.sorted { $0.day_of_week < $1.day_of_week }
        let entries = sortedDays.map { entries(from: $0.outfit, includeImages: includeImages) }
        var encoded = encodeWithinBudget(entries.flatMap { $0.map(\.image) })[...]
        let days = zip(sortedDays, entries).map { day, dayEntries in
            WatchWeekSnapshot.Day(
                dayOfWeek: day.day_of_week,
                enabled: day.enabled,
                occasion: day.occasion,
                style: day.style,
                summary: meaningful(day.outfit?.summary) ?? "",
                items: dayEntries.map { entry in
                    var item = entry.item
                    item.imageData = encoded.popFirst() ?? nil
                    return item
                }
            )
        }
        return WatchWeekSnapshot(
            isSignedIn: true,
            days: days,
            updatedAt: now,
            morningRefreshMinutes: morningRefreshMinutes
        )
    }

    static func items(
        from outfit: WeekPlanOutfitResponse?,
        includeImages: Bool = false
    ) -> [WatchWeekSnapshot.Item] {
        let dayEntries = entries(from: outfit, includeImages: includeImages)
        let images = encodeWithinBudget(dayEntries.map(\.image))
        return zip(dayEntries, images).map { entry, data in
            var item = entry.item
            item.imageData = data
            return item
        }
    }

    private static func entries(
        from outfit: WeekPlanOutfitResponse?,
        includeImages: Bool
    ) -> [(item: WatchWeekSnapshot.Item, image: UIImage?)] {
        guard let outfit else { return [] }
        let slots: [(label: String, category: String, text: String?)] = [
            ("Shirt", "shirt", outfit.shirt),
            ("Trousers", "trouser", outfit.trouser),
            ("Sweater", "sweater", outfit.sweater),
            ("Blazer", "blazer", outfit.blazer),
            (MainFlowUxCopy.outerwearLabel, "outerwear", outfit.outerwear),
            ("Shoes", "shoes", outfit.shoes),
            ("Belt", "belt", outfit.belt),
            ("Tie", "tie", outfit.tie),
        ]
        let suggestion = includeImages ? WeekPlanOutfitDisplay.asOutfitSuggestion(outfit) : nil
        return slots.compactMap { slot -> (item: WatchWeekSnapshot.Item, image: UIImage?)? in
            guard let text = meaningful(slot.text) else { return nil }
            let shortName = OutfitItemCardTextParser.parse(text).shortName
            let item = WatchWeekSnapshot.Item(label: slot.label, name: shortName.isEmpty ? text : shortName)
            let image = suggestion.flatMap {
                OutfitItemThumbnail.thumbnailImage(suggestion: $0, category: slot.category, uploadImage: nil)
            }
            return (item, image)
        }
    }

    /// Shrinks every picture step by step until they fit the budget together; drops them if they never do.
    static func encodeWithinBudget(_ images: [UIImage?]) -> [Data?] {
        guard images.contains(where: { $0 != nil }) else { return images.map { _ in nil } }
        for step in imageEncodeSteps {
            let encoded = images.map { $0.flatMap { jpeg($0, maxPixels: step.maxPixels, quality: step.quality) } }
            if encoded.compactMap(\.?.count).reduce(0, +) <= imageBudgetBytes {
                return encoded
            }
        }
        return images.map { _ in nil }
    }

    static func jpeg(_ image: UIImage, maxPixels: CGFloat, quality: CGFloat) -> Data? {
        let pixelWidth = image.size.width * image.scale
        let pixelHeight = image.size.height * image.scale
        let longest = max(pixelWidth, pixelHeight)
        guard longest > 0 else { return nil }
        let ratio = min(1, maxPixels / longest)
        let target = CGSize(width: (pixelWidth * ratio).rounded(), height: (pixelHeight * ratio).rounded())
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let resized = UIGraphicsImageRenderer(size: target, format: format).image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: target))
            image.draw(in: CGRect(origin: .zero, size: target))
        }
        return resized.jpegData(compressionQuality: quality)
    }

    private static func meaningful(_ value: String?) -> String? {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !trimmed.isEmpty, !["none", "null", "n/a"].contains(trimmed.lowercased()) else {
            return nil
        }
        return trimmed
    }
}
