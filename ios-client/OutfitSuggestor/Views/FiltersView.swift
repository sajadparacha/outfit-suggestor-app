//
//  FiltersView.swift
//  OutfitSuggestor
//
//  Filters and preferences view
//

import SwiftUI

struct FiltersView: View {
    enum Layout {
        case form
        case grid
    }

    @Binding var filters: OutfitFilters
    @Binding var preferenceText: String
    var layout: Layout = .form
    var useWardrobeOnly: Binding<Bool>? = nil
    var showWardrobeOnly: Bool = false

    @State private var activeSheet: FilterSheet?

    private enum FilterSheet: Identifiable {
        case occasion, season, style, notes

        var id: String {
            switch self {
            case .occasion: return "occasion"
            case .season: return "season"
            case .style: return "style"
            case .notes: return "notes"
            }
        }
    }

    private let gridColumns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10),
    ]

    var body: some View {
        Group {
            switch layout {
            case .form:
                formLayout
            case .grid:
                gridLayout
            }
        }
        .sheet(item: $activeSheet) { sheet in
            filterSheet(for: sheet)
        }
    }

    private var formLayout: some View {
        VStack(spacing: 16) {
            Text("Preferences")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .leading, spacing: 8) {
                Text("Describe your style")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)

                TextField("e.g., Business casual, modern style", text: $preferenceText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
            }

            Divider()
                .padding(.vertical, 8)

            Text("Or use filters")
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            formPicker(title: "Occasion", selection: $filters.occasion, options: Occasion.allCases.map { ($0.rawValue, $0.apiValue) })
            formPicker(title: "Season", selection: $filters.season, options: Season.allCases.map { ($0.rawValue, $0.apiValue) })
            formPicker(title: "Style", selection: $filters.style, options: Style.allCases.map { ($0.rawValue, $0.apiValue) })
        }
        .padding()
        .glassCard()
    }

    private var gridLayout: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Preferences")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            LazyVGrid(columns: gridColumns, spacing: 10) {
                gridCell(title: "Occasion", value: displayOccasion, icon: "calendar") {
                    activeSheet = .occasion
                }
                gridCell(title: "Season", value: displaySeason, icon: "leaf") {
                    activeSheet = .season
                }
                gridCell(title: "Style", value: displayStyle, icon: "paintbrush") {
                    activeSheet = .style
                }
                gridCell(title: "Notes", value: notesSummary, icon: "note.text") {
                    activeSheet = .notes
                }
            }

            if showWardrobeOnly, let useWardrobeOnly {
                wardrobeOnlyCheckbox(binding: useWardrobeOnly)
            }
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private func formPicker(title: String, selection: Binding<String>, options: [(String, String)]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)

            Picker(title, selection: selection) {
                ForEach(options, id: \.1) { label, value in
                    Text(label).tag(value)
                }
            }
            .pickerStyle(MenuPickerStyle())
            .frame(maxWidth: .infinity)
            .padding(8)
            .background(Color.white.opacity(0.08))
            .cornerRadius(8)
        }
    }

    @ViewBuilder
    private func gridCell(title: String, value: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.gradientStart)
                    Text(title)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                }
                Text(value)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .glassCard()
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(GridContract.filterAccessibilityId(for: title))
    }

    @ViewBuilder
    private func wardrobeOnlyCheckbox(binding: Binding<Bool>) -> some View {
        let label = VStack(alignment: .leading, spacing: 2) {
            Text(GridContract.wardrobeOnlyTitle)
                .font(.subheadline.weight(.medium))
                .foregroundColor(AppTheme.textPrimary)
            Text(MicroHelpCopy.wardrobeOnly)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
        }

        Button {
            binding.wrappedValue.toggle()
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: binding.wrappedValue ? "checkmark.square.fill" : "square")
                    .font(.title3)
                    .foregroundColor(binding.wrappedValue ? AppTheme.accent : AppTheme.textSecondary)
                label
                Spacer(minLength: 0)
            }
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(GridContract.wardrobeOnlyCheckboxAccessibilityId)
        .accessibilityAddTraits(.isButton)
        .accessibilityValue(binding.wrappedValue ? "checked" : "unchecked")
    }

    @ViewBuilder
    private func filterSheet(for sheet: FilterSheet) -> some View {
        NavigationView {
            List {
                switch sheet {
                case .occasion:
                    pickerRows(Occasion.allCases.map { ($0.rawValue, $0.apiValue) }, selection: $filters.occasion)
                case .season:
                    pickerRows(Season.allCases.map { ($0.rawValue, $0.apiValue) }, selection: $filters.season)
                case .style:
                    pickerRows(Style.allCases.map { ($0.rawValue, $0.apiValue) }, selection: $filters.style)
                case .notes:
                    Section {
                        TextField("Add style notes or preferences", text: $preferenceText, axis: .vertical)
                            .lineLimit(3...6)
                    }
                }
            }
            .navigationTitle(sheetTitle(for: sheet))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { activeSheet = nil }
                }
            }
        }
        .presentationDetents(sheet == .notes ? [.medium] : [.medium, .large])
    }

    @ViewBuilder
    private func pickerRows(_ options: [(String, String)], selection: Binding<String>) -> some View {
        ForEach(options, id: \.1) { label, value in
            Button {
                selection.wrappedValue = value
                activeSheet = nil
            } label: {
                HStack {
                    Text(label)
                    Spacer()
                    if selection.wrappedValue == value {
                        Image(systemName: "checkmark")
                            .foregroundColor(AppTheme.gradientStart)
                    }
                }
            }
        }
    }

    private var displayOccasion: String {
        Occasion.allCases.first { $0.apiValue == filters.occasion }?.rawValue ?? filters.occasion.capitalized
    }

    private var displaySeason: String {
        Season.allCases.first { $0.apiValue == filters.season }?.rawValue ?? filters.season.capitalized
    }

    private var displayStyle: String {
        Style.allCases.first { $0.apiValue == filters.style }?.rawValue ?? filters.style.capitalized
    }

    private var notesSummary: String {
        let trimmed = preferenceText.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "Add notes" : trimmed
    }

    private func sheetTitle(for sheet: FilterSheet) -> String {
        switch sheet {
        case .occasion: return "Occasion"
        case .season: return "Season"
        case .style: return "Style"
        case .notes: return "Notes"
        }
    }
}

extension FiltersView {
    enum GridContract {
        static let fieldTitles = ["Occasion", "Season", "Style", "Notes"]
        static let wardrobeOnlyTitle = "Use my wardrobe only"
        static let wardrobeOnlyCheckboxAccessibilityId = "main.wardrobeOnlyCheckbox"

        static func filterAccessibilityId(for title: String) -> String {
            "home.filter.\(title.lowercased())"
        }

        static func shouldShowWardrobeOnlyCheckbox(showWardrobeOnly: Bool, bindingProvided: Bool) -> Bool {
            showWardrobeOnly && bindingProvided
        }
    }
}

struct FiltersView_Previews: PreviewProvider {
    static var previews: some View {
        FiltersView(
            filters: .constant(OutfitFilters()),
            preferenceText: .constant(""),
            layout: .grid
        )
        .padding()
        .background(AppTheme.bgPrimary)
    }
}
