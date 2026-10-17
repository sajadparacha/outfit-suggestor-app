//
//  TodayOutfitView.swift
//  OutfitSuggestorWatch
//

import SwiftUI
import WatchKit

struct TodayOutfitView: View {
    let snapshot: WatchWeekSnapshot?
    @State private var enlarged: EnlargedPicture?
    @State private var showSettings = false
    /// Backend day (0 = Monday … 6 = Sunday); opens on today, swipe left/right for other days.
    @State private var selectedDay = WatchWeekSnapshot.dayOfWeek(for: Date())
    @Environment(\.scenePhase) private var scenePhase
    @EnvironmentObject private var store: WatchSnapshotStore

    var body: some View {
        TimelineView(.everyMinute) { context in
            let today = WatchWeekSnapshot.dayOfWeek(for: context.date)
            if snapshot?.isSignedIn == true {
                TabView(selection: $selectedDay) {
                    ForEach(0..<7, id: \.self) { dayOfWeek in
                        NavigationStack {
                            content(
                                state: WatchTodayState.resolve(snapshot: snapshot, dayOfWeek: dayOfWeek),
                                dayOfWeek: dayOfWeek,
                                isToday: dayOfWeek == today
                            )
                            .navigationTitle(WatchCopy.dayTitle(for: dayOfWeek, isToday: dayOfWeek == today))
                            .toolbar {
                                ToolbarItem(placement: .topBarLeading) {
                                    Button {
                                        showSettings = true
                                    } label: {
                                        Image(systemName: "gearshape")
                                    }
                                    .accessibilityLabel(WatchCopy.settingsTitle)
                                }
                            }
                        }
                        .tag(dayOfWeek)
                    }
                }
                .tabViewStyle(.page)
                .sheet(isPresented: $showSettings) {
                    WatchSettingsView()
                }
            } else {
                NavigationStack {
                    content(
                        state: WatchTodayState.resolve(snapshot: snapshot, dayOfWeek: today),
                        dayOfWeek: today,
                        isToday: true
                    )
                    .navigationTitle(WatchCopy.todayTitle)
                }
            }
        }
        .onAppear {
            if let day = store.consumeFocusDay() { selectedDay = day }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                selectedDay = store.consumeFocusDay() ?? WatchWeekSnapshot.dayOfWeek(for: Date())
            }
        }
        .onChange(of: store.focusDay) { _, _ in
            if let day = store.consumeFocusDay() { selectedDay = day }
        }
        .sheet(item: $enlarged) { picture in
            EnlargedPictureView(picture: picture)
        }
    }

    @ViewBuilder
    private func content(state: WatchTodayState, dayOfWeek: Int, isToday: Bool) -> some View {
        let dayName = WatchCopy.dayName(for: dayOfWeek)
        switch state {
        case .outfit(let day):
            outfitList(day: day, dayName: dayName)
        case .notGenerated(let day):
            message(
                icon: "sparkles",
                title: WatchCopy.notGeneratedTitle,
                body: WatchCopy.notGeneratedBody(dayName: dayName, isToday: isToday),
                context: WatchCopy.contextLine(for: day)
            )
        case .nothingPlanned:
            message(
                icon: "calendar",
                title: WatchCopy.nothingPlannedTitle,
                body: WatchCopy.nothingPlannedBody(dayName: dayName, isToday: isToday)
            )
        case .signedOut:
            message(icon: "person.crop.circle", title: WatchCopy.signedOutTitle, body: WatchCopy.signedOutBody)
        case .waitingForPhone:
            message(icon: "iphone", title: WatchCopy.waitingTitle, body: WatchCopy.waitingBody)
        }
    }

    private func outfitList(day: WatchWeekSnapshot.Day, dayName: String) -> some View {
        List {
            Section {
                if day.items.isEmpty {
                    Text(day.summary)
                        .font(.body)
                } else {
                    ForEach(day.items, id: \.label) { item in
                        itemRow(item)
                    }
                }
            } header: {
                VStack(alignment: .leading, spacing: 2) {
                    Text(dayName)
                        .font(.headline)
                        .textCase(nil)
                    Text(WatchCopy.contextLine(for: day))
                        .font(.caption2)
                        .textCase(nil)
                }
            }
        }
    }

    @ViewBuilder
    private func itemRow(_ item: WatchWeekSnapshot.Item) -> some View {
        let text = VStack(alignment: .leading, spacing: 2) {
            Text(item.label.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(item.name)
                .font(.body)
        }
        if let data = item.imageData, let image = UIImage(data: data) {
            Button {
                enlarged = EnlargedPicture(item: item, image: image)
            } label: {
                HStack(spacing: 8) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 40, height: 40)
                        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                    text
                }
                .padding(.vertical, 2)
            }
            .accessibilityLabel("View \(item.name) full size")
        } else {
            text.padding(.vertical, 2)
        }
    }

    private func message(icon: String, title: String, body: String, context: String? = nil) -> some View {
        ScrollView {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(.tint)
                Text(title)
                    .font(.headline)
                    .multilineTextAlignment(.center)
                if let context, !context.isEmpty {
                    Text(context)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Text(body)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 4)
        }
    }
}

struct WatchSettingsView: View {
    @EnvironmentObject private var store: WatchSnapshotStore

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker(
                        WatchCopy.morningRefreshTitle,
                        selection: Binding(
                            get: { store.morningRefreshMinutes },
                            set: { store.setMorningRefresh(minutes: $0) }
                        )
                    ) {
                        ForEach(MorningRefreshTime.options, id: \.self) { minutes in
                            Text(MorningRefreshTime.label(minutes)).tag(minutes)
                        }
                    }
                    .pickerStyle(.navigationLink)
                } footer: {
                    Text(WatchCopy.morningRefreshFooter)
                }
            }
            .navigationTitle(WatchCopy.settingsTitle)
        }
    }
}

struct EnlargedPicture: Identifiable {
    let item: WatchWeekSnapshot.Item
    let image: UIImage
    var id: String { item.label }
}

/// Full-screen picture; turn the Digital Crown to zoom, drag to pan when zoomed.
struct EnlargedPictureView: View {
    let picture: EnlargedPicture
    @State private var zoom: Double = 1

    var body: some View {
        ScrollView([.horizontal, .vertical], showsIndicators: false) {
            Image(uiImage: picture.image)
                .resizable()
                .scaledToFit()
                .frame(width: WKInterfaceDevice.current().screenBounds.width * zoom)
        }
        .focusable()
        .digitalCrownRotation($zoom, from: 1, through: 3, by: 0.1, sensitivity: .low, isContinuous: false)
        .navigationTitle(picture.item.label)
        .accessibilityLabel(picture.item.name)
    }
}