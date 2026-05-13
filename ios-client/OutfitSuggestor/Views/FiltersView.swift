//
//  FiltersView.swift
//  OutfitSuggestor
//
//  Filters and preferences view
//

import SwiftUI

struct FiltersView: View {
    @Binding var filters: OutfitFilters
    @Binding var preferenceText: String
    
    var body: some View {
        VStack(spacing: 16) {
            Text("Preferences")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            // Free text input
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
            
            // Occasion Picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Occasion")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                
                Picker("Occasion", selection: $filters.occasion) {
                    ForEach(Occasion.allCases, id: \.self) { occasion in
                        Text(occasion.rawValue).tag(occasion.apiValue)
                    }
                }
                .pickerStyle(MenuPickerStyle())
                .frame(maxWidth: .infinity)
                .padding(8)
                .background(Color.white.opacity(0.08))
                .cornerRadius(8)
            }
            
            // Season Picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Season")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                
                Picker("Season", selection: $filters.season) {
                    ForEach(Season.allCases, id: \.self) { season in
                        Text(season.rawValue).tag(season.apiValue)
                    }
                }
                .pickerStyle(MenuPickerStyle())
                .frame(maxWidth: .infinity)
                .padding(8)
                .background(Color.white.opacity(0.08))
                .cornerRadius(8)
            }
            
            // Style Picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Style")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
                
                Picker("Style", selection: $filters.style) {
                    ForEach(Style.allCases, id: \.self) { style in
                        Text(style.rawValue).tag(style.apiValue)
                    }
                }
                .pickerStyle(MenuPickerStyle())
                .frame(maxWidth: .infinity)
                .padding(8)
                .background(Color.white.opacity(0.08))
                .cornerRadius(8)
            }
        }
        .padding()
        .glassCard()
    }
}

struct FiltersView_Previews: PreviewProvider {
    static var previews: some View {
        FiltersView(
            filters: .constant(OutfitFilters()),
            preferenceText: .constant("")
        )
        .padding()
    }
}

