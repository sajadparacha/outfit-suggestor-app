//
//  InsightsView.swift
//  OutfitSuggestor
//
//  Wardrobe Insights — analysis orchestration and redesigned results.
//

import SwiftUI

struct InsightsView: View {
    @EnvironmentObject private var viewModel: OutfitViewModel
    @ObservedObject private var auth = AuthService.shared

    @State private var analysisMode = "free"
    @State private var rawResult: WardrobeGapAnalysisResponse?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var analysisTask: Task<Void, Never>?
    @State private var preferencesExpanded = false

    private var insightResult: WardrobeInsightResult? {
        rawResult.map { NormalizeWardrobeInsight.normalize($0) }
    }

    private var hasResult: Bool { insightResult != nil }
    private var isAdmin: Bool { auth.currentUser?.is_admin == true }

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(spacing: 24) {
                    InsightsHeaderView(hasResult: hasResult, onNewAnalysis: startNewAnalysis)

                    if WardrobeInsightsPresentation.shouldShowExpandedPreferences(
                        hasResult: hasResult,
                        isPreferencesExpanded: preferencesExpanded
                    ) {
                        AnalysisPreferencesView(
                            filters: $viewModel.filters,
                            preferenceText: $viewModel.preferenceText,
                            analysisMode: $analysisMode
                        )
                    } else if let context = insightResult?.context {
                        AnalysisContextBarView(context: context) {
                            preferencesExpanded = true
                        }
                    }

                    if WardrobeInsightsPresentation.shouldShowAnalyzeButton(
                        hasResult: hasResult,
                        isPreferencesExpanded: preferencesExpanded,
                        isLoading: isLoading
                    ) {
                        Button(action: startAnalysis) {
                            Label(InsightsCopy.analyzeButton, systemImage: "sparkle.magnifyingglass")
                                .font(.headline.weight(.semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(AppTheme.accentGradient)
                                .cornerRadius(12)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal)
                        .accessibilityIdentifier("insights.analyzeButton")
                    }

                    if let error = errorMessage {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.subheadline)
                            .padding(.horizontal)
                            .accessibilityIdentifier("insights.error")
                    }

                    if let result = insightResult, WardrobeInsightsPresentation.shouldShowResults(hasResult: true) {
                        WardrobeInsightsView(
                            result: result,
                            isAdmin: isAdmin
                        )
                    } else if !isLoading {
                        Text(InsightsCopy.emptyStateMessage)
                            .font(.subheadline)
                            .foregroundColor(AppTheme.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                            .accessibilityIdentifier("insights.emptyState")
                    }

                    Spacer(minLength: isLoading ? 220 : 50)
                }
                .padding(.vertical)
                .adaptiveContent()
            }

            if isLoading {
                AiProgressPanelView(
                    operationType: .wardrobeAnalysis,
                    message: InsightsCopy.loadingMessage(forAnalysisMode: analysisMode),
                    onCancel: cancelAnalysis
                )
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
        }
        .background(AppTheme.bgPrimary)
        .navigationTitle("Insights")
        .navigationBarTitleDisplayMode(.large)
    }

    private func startNewAnalysis() {
        rawResult = nil
        errorMessage = nil
        preferencesExpanded = true
    }

    private func cancelAnalysis() {
        analysisTask?.cancel()
        analysisTask = nil
        isLoading = false
    }

    private func startAnalysis() {
        analysisTask?.cancel()
        analysisTask = Task {
            await analyze()
        }
    }

    private func analyze() async {
        isLoading = true
        errorMessage = nil
        defer {
            if !Task.isCancelled {
                isLoading = false
                analysisTask = nil
            }
        }
        do {
            try Task.checkCancellation()
            let request = WardrobeGapAnalysisRequest(
                occasion: viewModel.filters.occasion,
                season: viewModel.filters.season,
                style: viewModel.filters.style,
                text_input: viewModel.preferenceText,
                analysis_mode: analysisMode
            )
            rawResult = try await APIService.shared.analyzeWardrobeGaps(request: request)
            preferencesExpanded = false
        } catch is CancellationError {
            return
        } catch let error as APIServiceError {
            errorMessage = error.errorDescription ?? InsightsCopy.genericErrorMessage
        } catch {
            errorMessage = InsightsCopy.genericErrorMessage
        }
    }

}
