//
//  OutfitSuggestorWatchWidgets.swift
//  OutfitSuggestorWatchWidgets
//
//  Watch-face complications and Smart Stack widget for today's outfit, read from the App Group snapshot.
//

import ImageIO
import SwiftUI
import UIKit
import WidgetKit

@main
struct OutfitSuggestorWatchWidgets: WidgetBundle {
    var body: some Widget {
        TodayOutfitWidget()
    }
}

struct TodayOutfitEntry: TimelineEntry {
    let date: Date
    let dayOfWeek: Int
    let state: WatchTodayState
    let relevance: TimelineEntryRelevance?
    /// Small garment pictures for the rectangular family; empty → text.
    let thumbnails: [UIImage]

    init(_ entry: WatchComplicationTimeline.Entry, thumbnails: [UIImage] = []) {
        date = entry.date
        dayOfWeek = entry.dayOfWeek
        state = entry.state.withoutImages
        relevance = TimelineEntryRelevance(score: Float(entry.relevance))
        self.thumbnails = thumbnails
    }

    static var sample: TodayOutfitEntry {
        let dayOfWeek = WatchWeekSnapshot.dayOfWeek(for: Date())
        let day = WatchWeekSnapshot.Day(
            dayOfWeek: dayOfWeek,
            enabled: true,
            occasion: "business-casual",
            style: "classic",
            summary: "",
            items: [
                WatchWeekSnapshot.Item(label: "Blazer", name: "Navy blazer"),
                WatchWeekSnapshot.Item(label: "Trousers", name: "Charcoal trousers"),
                WatchWeekSnapshot.Item(label: "Shoes", name: "Brown loafers"),
            ]
        )
        return TodayOutfitEntry(.init(
            date: Date(),
            dayOfWeek: dayOfWeek,
            state: .outfit(day),
            relevance: WatchComplicationTimeline.lowRelevance
        ))
    }
}

struct TodayOutfitProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayOutfitEntry {
        .sample
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayOutfitEntry) -> Void) {
        guard !context.isPreview else { return completion(.sample) }
        completion(entries(now: Date()).first ?? .sample)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayOutfitEntry>) -> Void) {
        completion(Timeline(entries: entries(now: Date()), policy: .atEnd))
    }

    private func entries(now: Date) -> [TodayOutfitEntry] {
        let snapshot = WatchSnapshotStorage.shared().load()
        var thumbnailsByDay: [Int: [UIImage]] = [:]
        return WatchComplicationTimeline.entries(snapshot: snapshot, now: now).map { entry in
            let thumbnails = thumbnailsByDay[entry.dayOfWeek] ?? {
                let images = WatchComplicationText.thumbnailItems(state: entry.state).compactMap { Self.thumbnail($0.imageData) }
                thumbnailsByDay[entry.dayOfWeek] = images
                return images
            }()
            return TodayOutfitEntry(entry, thumbnails: thumbnails)
        }
    }

    /// Widgets have a tight image budget, so decode straight to a tiny bitmap.
    private static func thumbnail(_ data: Data?, maxPixels: Int = 72) -> UIImage? {
        guard let data, let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixels,
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }
        return WidgetImage.fitted(image, points: TodayOutfitWidgetView.thumbnailSide, fill: true)
    }
}

private extension WatchTodayState {
    /// Entries keep text only; pictures travel as pre-sized thumbnails.
    var withoutImages: WatchTodayState {
        func strip(_ day: WatchWeekSnapshot.Day) -> WatchWeekSnapshot.Day {
            WatchWeekSnapshot.Day(
                dayOfWeek: day.dayOfWeek,
                enabled: day.enabled,
                occasion: day.occasion,
                style: day.style,
                summary: day.summary,
                items: day.items.map { WatchWeekSnapshot.Item(label: $0.label, name: $0.name) }
            )
        }
        switch self {
        case .outfit(let day): return .outfit(strip(day))
        case .notGenerated(let day): return .notGenerated(strip(day))
        default: return self
        }
    }
}

struct TodayOutfitWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TodayOutfit", provider: TodayOutfitProvider()) { entry in
            TodayOutfitWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Today’s outfit")
        .description("Your Week Planner outfit for today.")
        .supportedFamilies([.accessoryRectangular, .accessoryInline, .accessoryCircular, .accessoryCorner])
    }
}

struct TodayOutfitWidgetView: View {
    static let thumbnailSide: CGFloat = 30
    static let logoPadding: CGFloat = 9
    /// Circular complication is 51 pt on the largest watches; the logo fills it minus the padding.
    static let logo: UIImage? = UIImage(named: "ComplicationLogo")?.cgImage.flatMap {
        WidgetImage.fitted($0, points: 51 - logoPadding * 2, fill: false)
    }

    let entry: TodayOutfitEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryInline:
            Text(WatchComplicationText.inline(state: entry.state))
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                if let logo = Self.logo {
                    Image(uiImage: logo)
                        .resizable()
                        .scaledToFit()
                        .padding(Self.logoPadding)
                }
            }
            .accessibilityLabel(WatchComplicationText.inline(state: entry.state))
        case .accessoryCorner:
            Image(systemName: WatchComplicationText.symbol(state: entry.state))
                .font(.title3)
                .widgetLabel {
                    Text(WatchComplicationText.corner(state: entry.state))
                }
        default:
            rectangular
        }
    }

    private var rectangular: some View {
        let text = WatchComplicationText.rectangular(state: entry.state, dayOfWeek: entry.dayOfWeek)
        return VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 4) {
                Image(systemName: WatchComplicationText.symbol(state: entry.state))
                Text(text.title)
                    .font(.headline)
                    .widgetAccentable()
            }
            if entry.thumbnails.isEmpty {
                ForEach(Array(text.lines.enumerated()), id: \.offset) { _, line in
                    Text(line)
                        .font(.caption)
                        .lineLimit(text.lines.count == 1 ? 2 : 1)
                }
            } else {
                HStack(spacing: 4) {
                    ForEach(Array(entry.thumbnails.enumerated()), id: \.offset) { _, image in
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(width: Self.thumbnailSide, height: Self.thumbnailSide)
                            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(text.lines.joined(separator: ", "))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
