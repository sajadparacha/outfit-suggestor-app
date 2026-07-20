//
//  WeekPlannerViewModel.swift
//  OutfitSuggestor
//
//  Week Outfit Planner state and API orchestration.
//

import Foundation

protocol WeekPlanAPIClient {
    func getWeekPlan() async throws -> WeekPlanResponse
    func putWeekPlan(_ body: WeekPlanUpsertRequest) async throws -> WeekPlanResponse
    func generateWeekPlan(dayOfWeek: Int?) async throws -> WeekPlanResponse
    func getWeekPlanToday() async throws -> WeekPlanTodayResponse
    func deleteWeekPlan() async throws -> WeekPlanDeleteResponse
    func getWeekPlanHistory() async throws -> WeekPlanHistoryListResponse
    func restoreWeekPlanHistory(id: Int) async throws -> WeekPlanResponse
}

protocol WeekPlanNotificationScheduling {
    func reschedule(plan: WeekPlanResponse) async
    func cancelAll() async
}

struct DefaultWeekPlanNotifier: WeekPlanNotificationScheduling {
    func reschedule(plan: WeekPlanResponse) async {
        await WeekPlanNotificationScheduler.reschedule(plan: plan)
    }

    func cancelAll() async {
        await WeekPlanNotificationScheduler.cancelAll()
    }
}

@MainActor
final class WeekPlannerViewModel: ObservableObject {
    @Published var plan: WeekPlanResponse = .empty()
    @Published var today: WeekPlanTodayResponse?
    @Published var history: [WeekPlanHistoryItem] = []
    @Published var selectedDayOfWeek: Int = 0
    @Published var isLoading = false
    @Published var isSaving = false
    @Published var isGenerating = false
    @Published var isRestoring = false
    @Published var errorMessage: String?
    @Published var infoMessage: String?
    /// Days where the user dismissed the missing-item prompt (local only).
    @Published private(set) var dismissedMissingDays: Set<Int> = []
    /// Last missing-item action taken (for tests / navigation hooks).
    @Published private(set) var lastMissingAction: WeekPlanMissingAction?

    private let api: WeekPlanAPIClient
    private let notifier: WeekPlanNotificationScheduling
    private let timezoneProvider: () -> String

    init(
        api: WeekPlanAPIClient = APIService.shared,
        notifier: WeekPlanNotificationScheduling = DefaultWeekPlanNotifier(),
        timezoneProvider: @escaping () -> String = { TimeZone.current.identifier }
    ) {
        self.api = api
        self.notifier = notifier
        self.timezoneProvider = timezoneProvider
    }

    var hasEnabledDays: Bool {
        plan.days.contains(where: \.enabled)
    }

    var statusMessage: String? {
        if isGenerating { return WeekPlanCopy.generating }
        if isLoading { return WeekPlanCopy.loading }
        return nil
    }

    var isBusy: Bool {
        isGenerating || isSaving || isRestoring || isLoading
    }

    var isSaveDisabled: Bool {
        isGenerating || isSaving || isRestoring
    }

    var selectedDay: WeekPlanDayResponse? {
        plan.days.first { $0.day_of_week == selectedDayOfWeek }
    }

    func selectDay(_ dayOfWeek: Int) {
        guard plan.days.contains(where: { $0.day_of_week == dayOfWeek }) else { return }
        selectedDayOfWeek = dayOfWeek
    }

    func dayStatus(for day: WeekPlanDayResponse) -> WeekPlanDayStatus {
        WeekPlanMissingSlots.status(for: day)
    }

    func missingSlots(for day: WeekPlanDayResponse) -> [WeekPlanOutfitDisplay.SlotRow] {
        guard let outfit = day.outfit else { return [] }
        return WeekPlanMissingSlots.missing(for: outfit)
    }

    func showsMissingActions(for day: WeekPlanDayResponse) -> Bool {
        guard dayStatus(for: day) == .missing else { return false }
        return !dismissedMissingDays.contains(day.day_of_week)
    }

    /// Choose from wardrobe — typed stub; view navigates to Wardrobe tab. No invent PUT.
    func chooseFromWardrobe(dayOfWeek: Int) {
        lastMissingAction = .chooseFromWardrobe(dayOfWeek: dayOfWeek)
    }

    /// Find alternative → existing regenerate-day API.
    func findAlternative(dayOfWeek: Int) async {
        lastMissingAction = .findAlternative(dayOfWeek: dayOfWeek)
        dismissedMissingDays.remove(dayOfWeek)
        await regenerateDay(dayOfWeek)
    }

    /// Continue without — local dismiss of missing prompt for that day.
    func continueWithoutMissing(dayOfWeek: Int) {
        dismissedMissingDays.insert(dayOfWeek)
        lastMissingAction = .continueWithout(dayOfWeek: dayOfWeek)
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            async let planTask = api.getWeekPlan()
            async let todayTask = api.getWeekPlanToday()
            async let historyTask = api.getWeekPlanHistory()
            let loaded = try await planTask
            plan = normalize(loaded)
            today = try? await todayTask
            history = (try? await historyTask)?.items ?? []
            if let message = plan.message, !message.isEmpty {
                infoMessage = message
            }
            syncSelectedDayAfterLoad()
            await syncNotifications()
        } catch {
            errorMessage = error.localizedDescription
            plan = .empty(timezone: timezoneProvider())
            syncSelectedDayAfterLoad()
        }
    }

    func refreshHistory() async {
        do {
            history = try await api.getWeekPlanHistory().items
        } catch {
            // Keep existing history on refresh failure; surface only if empty.
            if history.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
    }

    func restoreHistory(id: Int) async {
        isRestoring = true
        errorMessage = nil
        infoMessage = nil
        defer { isRestoring = false }
        do {
            let restored = try await api.restoreWeekPlanHistory(id: id)
            plan = normalize(restored)
            today = try? await api.getWeekPlanToday()
            infoMessage = WeekPlanCopy.planRestored
            dismissedMissingDays.removeAll()
            syncSelectedDayAfterLoad()
            await refreshHistory()
            await syncNotifications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func setDayEnabled(_ dayOfWeek: Int, enabled: Bool) {
        guard let idx = plan.days.firstIndex(where: { $0.day_of_week == dayOfWeek }) else { return }
        plan.days[idx].enabled = enabled
        if !enabled {
            plan.days[idx].outfit = nil
            dismissedMissingDays.remove(dayOfWeek)
        }
        Task { await syncNotifications() }
    }

    func setDayOccasion(_ dayOfWeek: Int, occasion: String) {
        guard let idx = plan.days.firstIndex(where: { $0.day_of_week == dayOfWeek }) else { return }
        plan.days[idx].occasion = occasion
    }

    func setDayStyle(_ dayOfWeek: Int, style: String) {
        guard let idx = plan.days.firstIndex(where: { $0.day_of_week == dayOfWeek }) else { return }
        plan.days[idx].style = style
    }

    func setDayUseWardrobeOnly(_ dayOfWeek: Int, useWardrobeOnly: Bool) {
        guard let idx = plan.days.firstIndex(where: { $0.day_of_week == dayOfWeek }) else { return }
        plan.days[idx].use_wardrobe_only = useWardrobeOnly
    }

    func setSharedSeason(_ season: String) {
        plan.shared_season = season
    }

    func setSharedStyle(_ style: String) {
        plan.shared_style = style
    }

    func setReminderTime(_ time: String) {
        plan.reminder_time = time
        Task { await syncNotifications() }
    }

    func save() async {
        isSaving = true
        errorMessage = nil
        infoMessage = nil
        defer { isSaving = false }
        do {
            let body = upsertBody()
            let saved = try await api.putWeekPlan(body)
            plan = normalize(saved)
            today = try? await api.getWeekPlanToday()
            infoMessage = WeekPlanCopy.planSaved
            await syncNotifications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func generateWeek() async {
        await generate(dayOfWeek: nil)
    }

    func regenerateDay(_ dayOfWeek: Int) async {
        await generate(dayOfWeek: dayOfWeek)
    }

    func clearPlan() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            _ = try await api.deleteWeekPlan()
            plan = .empty(timezone: timezoneProvider())
            today = nil
            infoMessage = "Plan cleared."
            dismissedMissingDays.removeAll()
            syncSelectedDayAfterLoad()
            await refreshHistory()
            await notifier.cancelAll()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Private

    private func syncSelectedDayAfterLoad() {
        if let todayDow = today?.day_of_week,
           plan.days.contains(where: { $0.day_of_week == todayDow }) {
            selectedDayOfWeek = todayDow
            return
        }
        if let firstEnabled = plan.days.first(where: \.enabled)?.day_of_week {
            selectedDayOfWeek = firstEnabled
            return
        }
        selectedDayOfWeek = plan.days.first?.day_of_week ?? 0
    }

    private func generate(dayOfWeek: Int?) async {
        isGenerating = true
        errorMessage = nil
        infoMessage = nil
        defer { isGenerating = false }

        // Persist current toggles/occasions before generate (API requires a saved plan).
        do {
            let body = upsertBody()
            let saved = try await api.putWeekPlan(body)
            plan = normalize(saved)
        } catch {
            errorMessage = error.localizedDescription
            return
        }

        do {
            let generated = try await api.generateWeekPlan(dayOfWeek: dayOfWeek)
            plan = normalize(generated)
            today = try? await api.getWeekPlanToday()
            if let dayOfWeek {
                dismissedMissingDays.remove(dayOfWeek)
                selectedDayOfWeek = dayOfWeek
            } else {
                dismissedMissingDays.removeAll()
            }
            if plan.wardrobe_empty {
                infoMessage = plan.message ?? WeekPlanCopy.emptyWardrobe
            } else if let message = plan.message, !message.isEmpty {
                infoMessage = message
            }
            await refreshHistory()
            await syncNotifications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func upsertBody() -> WeekPlanUpsertRequest {
        WeekPlanUpsertRequest(
            reminder_time: plan.reminder_time.isEmpty
                ? WeekPlanConstants.defaultReminderTime
                : plan.reminder_time,
            timezone: timezoneProvider(),
            shared_style: plan.shared_style.isEmpty
                ? WeekPlanConstants.defaultStyle
                : plan.shared_style,
            shared_season: plan.shared_season.isEmpty
                ? WeekPlanConstants.defaultSeason
                : plan.shared_season,
            days: plan.days.map {
                WeekPlanDayInput(
                    day_of_week: $0.day_of_week,
                    enabled: $0.enabled,
                    occasion: $0.occasion.isEmpty ? WeekPlanConstants.defaultOccasion : $0.occasion,
                    style: $0.style.isEmpty ? WeekPlanConstants.defaultStyle : $0.style,
                    use_wardrobe_only: $0.use_wardrobe_only
                )
            }
        )
    }

    private func normalize(_ response: WeekPlanResponse) -> WeekPlanResponse {
        var plan = response
        if plan.days.count < 7 {
            let byDow = Dictionary(uniqueKeysWithValues: plan.days.map { ($0.day_of_week, $0) })
            plan.days = (0..<7).map { dow in
                byDow[dow] ?? WeekPlanDayResponse(
                    day_of_week: dow,
                    enabled: false,
                    occasion: WeekPlanConstants.defaultOccasion,
                    style: WeekPlanConstants.defaultStyle,
                    use_wardrobe_only: true,
                    outfit: nil
                )
            }
        } else {
            plan.days = plan.days.sorted { $0.day_of_week < $1.day_of_week }
        }
        if plan.reminder_time.isEmpty {
            plan.reminder_time = WeekPlanConstants.defaultReminderTime
        }
        if plan.timezone.isEmpty {
            plan.timezone = timezoneProvider()
        }
        return plan
    }

    private func syncNotifications() async {
        let enabledWithOutfits = plan.days.filter {
            $0.enabled && !($0.outfit?.summary.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        }
        if enabledWithOutfits.isEmpty {
            await notifier.cancelAll()
        } else {
            await notifier.reschedule(plan: plan)
        }
    }
}

extension APIService: WeekPlanAPIClient {}
