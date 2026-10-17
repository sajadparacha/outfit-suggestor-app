//
//  WatchNotificationView.swift
//  OutfitSuggestorWatch
//
//  Custom long-look for the iPhone's "Today's outfit" reminder, built from the synced snapshot.
//

import SwiftUI
import UserNotifications
import WatchKit

final class WatchNotificationController: WKUserNotificationHostingController<WatchNotificationView> {
    private var content: WatchReminder.Content = .plain(title: "", body: "")

    override var body: WatchNotificationView {
        WatchNotificationView(content: content)
    }

    override func didReceive(_ notification: UNNotification) {
        let request = notification.request
        content = WatchReminder.content(
            snapshot: WatchSnapshotStorage.shared().load(),
            dayOfWeek: WatchReminder.dayOfWeek(userInfo: request.content.userInfo, identifier: request.identifier),
            title: request.content.title,
            body: request.content.body
        )
    }
}

struct WatchNotificationView: View {
    let content: WatchReminder.Content

    var body: some View {
        switch content {
        case let .outfit(dayName, context, items, summary):
            VStack(alignment: .leading, spacing: 6) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(dayName)
                        .font(.headline)
                    if !context.isEmpty {
                        Text(context)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                if items.isEmpty {
                    Text(summary)
                        .font(.body)
                } else {
                    ForEach(items, id: \.label) { item in
                        row(item)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        case let .plain(title, body):
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(body)
                    .font(.body)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func row(_ item: WatchWeekSnapshot.Item) -> some View {
        HStack(spacing: 8) {
            if let data = item.imageData, let image = UIImage(data: data) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 40, height: 40)
                    .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                    .accessibilityHidden(true)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(item.label.uppercased())
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(item.name)
                    .font(.body)
            }
        }
        .padding(.vertical, 2)
    }
}
