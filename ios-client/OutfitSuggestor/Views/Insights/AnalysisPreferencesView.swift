//
//  AnalysisPreferencesView.swift
//  OutfitSuggestor
//

import SwiftUI

struct AnalysisPreferencesView: View {
    @Binding var lifestyle: InsightsLifestyle
    @Binding var preferenceText: String
    @Binding var analysisMode: String

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(InsightsCopy.preferencesIntro)
                .font(.subheadline)
                .foregroundColor(AppTheme.textPrimary)

            Text(InsightsCopy.lifestyleOnlyNote)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)

            lifestyleMixSection
            dressCodeSection
            seasonSection
            styleSection
            eventFocusSection
            notesSection
            analysisModeSection
        }
        .padding(16)
        .glassCard()
        .padding(.horizontal)
        .accessibilityIdentifier("insights.preferencesForm")
    }

    private var lifestyleMixSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(InsightsCopy.lifestyleMixTitle)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
            InsightsFlowLayout(spacing: 8) {
                ForEach(InsightsLifestyle.mixOptions) { option in
                    mixChip(option)
                }
            }
        }
        .accessibilityIdentifier("insights.lifestyleMix")
    }

    private func mixChip(_ option: InsightsLifestyleOption) -> some View {
        let selected = lifestyle.isMixSelected(option.value)
        return preferenceChip(
            label: option.label,
            selected: selected,
            showPrimary: lifestyle.isPrimary(option.value),
            dimmed: !selected && !lifestyle.canAddMixChip,
            identifier: "insights.lifestyleMix.\(option.value)"
        ) {
            lifestyle.tapMix(option.value)
        }
    }

    private var dressCodeSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(InsightsCopy.dressCodeTitle)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
            InsightsFlowLayout(spacing: 8) {
                ForEach(InsightsLifestyle.dressCodeOptions) { option in
                    preferenceChip(
                        label: option.label,
                        selected: lifestyle.isDressCodeSelected(option.value),
                        identifier: "insights.dressCode.\(option.value)"
                    ) {
                        lifestyle.tapDressCode(option.value)
                    }
                }
            }
        }
        .accessibilityIdentifier("insights.dressCode")
    }

    private var seasonSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(InsightsCopy.seasonTitle)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
            InsightsFlowLayout(spacing: 8) {
                yearRoundChip
                ForEach(InsightsLifestyle.climateOptions) { option in
                    climateChip(option)
                }
            }
        }
        .accessibilityIdentifier("insights.seasonCore")
    }

    private var yearRoundChip: some View {
        Text(InsightsCopy.yearRoundLabel)
            .font(.subheadline.weight(.semibold))
            .foregroundColor(AppTheme.textPrimary)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(AppTheme.accentSoft)
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(AppTheme.accent.opacity(0.55), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .accessibilityIdentifier("insights.seasonCore.yearRound")
    }

    private func climateChip(_ option: InsightsLifestyleOption) -> some View {
        preferenceChip(
            label: option.label,
            selected: lifestyle.isClimateSelected(option.value),
            identifier: "insights.seasonCore.\(option.value)"
        ) {
            lifestyle.tapClimate(option.value)
        }
    }

    private var styleSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(InsightsCopy.styleTitle)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
            Text(InsightsCopy.stylePrimaryTitle)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
            InsightsFlowLayout(spacing: 8) {
                ForEach(InsightsLifestyle.stylePrimaryOptions) { option in
                    preferenceChip(
                        label: option.label,
                        selected: lifestyle.isStylePrimarySelected(option.value),
                        showPrimary: lifestyle.isPrimaryStyle(option.value),
                        identifier: "insights.stylePrimary.\(option.value)"
                    ) {
                        lifestyle.tapStylePrimary(option.value)
                    }
                }
            }
            .accessibilityIdentifier("insights.stylePrimary")
            Text(InsightsCopy.styleAccentTitle)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
            InsightsFlowLayout(spacing: 8) {
                preferenceChip(
                    label: InsightsCopy.noneOption,
                    selected: lifestyle.hasNoAccents,
                    identifier: "insights.styleAccent.none"
                ) {
                    lifestyle.clearAccents()
                }
                ForEach(InsightsLifestyle.styleAccentOptions) { option in
                    preferenceChip(
                        label: option.label,
                        selected: lifestyle.isAccentSelected(option.value),
                        identifier: "insights.styleAccent.\(option.value)"
                    ) {
                        lifestyle.tapAccent(option.value)
                    }
                }
            }
            .accessibilityIdentifier("insights.styleAccent")
        }
    }

    private var eventFocusSection: some View {
        DisclosureGroup(InsightsCopy.eventFocusTitle) {
            Picker(InsightsCopy.eventFocusTitle, selection: eventFocusBinding) {
                Text(InsightsCopy.noneOption).tag("")
                ForEach(Occasion.allCases, id: \.apiValue) { occasion in
                    Text(occasion.rawValue).tag(occasion.apiValue)
                }
            }
            .pickerStyle(.menu)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 8)
        }
        .font(.subheadline.weight(.semibold))
        .foregroundColor(AppTheme.textPrimary)
        .accessibilityIdentifier("insights.eventFocus")
    }

    private var eventFocusBinding: Binding<String> {
        Binding(
            get: { lifestyle.eventFocus ?? "" },
            set: { lifestyle.eventFocus = $0.isEmpty ? nil : $0 }
        )
    }

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            TextField(InsightsCopy.notesPlaceholder, text: $preferenceText, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(3...6)
                .autocapitalization(.none)
            Text(InsightsCopy.notesHelper)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
        }
    }

    private var analysisModeSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(InsightsCopy.modePickerTitle)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
            Text(InsightsCopy.modePickerSubtitle)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
            Picker(InsightsCopy.modePickerTitle, selection: $analysisMode) {
                Text(InsightsCopy.quickCheckSegmentLabel).tag("free")
                Text(InsightsCopy.aiStylistSegmentLabel).tag("premium")
            }
            .pickerStyle(.segmented)
        }
        .accessibilityIdentifier("insights.analysisMode")
    }

    private func preferenceChip(
        label: String,
        selected: Bool,
        showPrimary: Bool = false,
        dimmed: Bool = false,
        identifier: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(label)
                    .font(.subheadline.weight(.semibold))
                if showPrimary {
                    Text(InsightsCopy.primaryBadge)
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(AppTheme.accent.opacity(0.35))
                        .cornerRadius(6)
                }
            }
            .foregroundColor(AppTheme.textPrimary)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(selected ? AppTheme.accentSoft : AppTheme.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(selected ? AppTheme.accent.opacity(0.55) : AppTheme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .opacity(dimmed ? 0.45 : 1)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(identifier)
    }
}
