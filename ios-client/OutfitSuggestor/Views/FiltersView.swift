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
                .frame(maxWidth: .infinity, alignment: .leading)
            
            // Free text input
            VStack(alignment: .leading, spacing: 8) {
                Text("Describe your style")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                TextField("e.g., Business casual, modern style", text: $preferenceText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
            }
            
            Divider()
                .padding(.vertical, 8)
            
            Text("Or use filters")
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            // Occasion Picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Occasion")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Picker("Occasion", selection: $filters.occasion) {
                    ForEach(Occasion.allCases, id: \.self) { occasion in
                        Text(occasion.rawValue).tag(occasion.rawValue.lowercased())
                    }
                }
                .pickerStyle(MenuPickerStyle())
                .frame(maxWidth: .infinity)
                .padding(8)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(8)
            }
            
            // Season Picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Season")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Picker("Season", selection: $filters.season) {
                    ForEach(Season.allCases, id: \.self) { season in
                        Text(season.rawValue).tag(season.rawValue.lowercased())
                    }
                }
                .pickerStyle(MenuPickerStyle())
                .frame(maxWidth: .infinity)
                .padding(8)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(8)
            }
            
            // Style Picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Style")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Picker("Style", selection: $filters.style) {
                    ForEach(Style.allCases, id: \.self) { style in
                        Text(style.rawValue).tag(style.rawValue.lowercased())
                    }
                }
                .pickerStyle(MenuPickerStyle())
                .frame(maxWidth: .infinity)
                .padding(8)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
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

