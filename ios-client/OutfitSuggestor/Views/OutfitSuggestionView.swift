// 
//  OutfitSuggestionView.swift
//  OutfitSuggestor
//
//  View to display outfit suggestion results
//

import SwiftUI

struct OutfitSuggestionView: View {
    let suggestion: OutfitSuggestion
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Your Perfect Outfit")
                .font(.title2)
                .fontWeight(.bold)
            
            // Outfit items
            VStack(spacing: 12) {
                OutfitItemCard(icon: "👔", label: "Shirt", description: suggestion.shirt)
                OutfitItemCard(icon: "👖", label: "Trouser", description: suggestion.trouser)
                OutfitItemCard(icon: "🧥", label: "Blazer", description: suggestion.blazer)
                OutfitItemCard(icon: "👞", label: "Shoes", description: suggestion.shoes)
                OutfitItemCard(icon: "🪢", label: "Belt", description: suggestion.belt)
            }
            
            // Reasoning
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "lightbulb.fill")
                        .foregroundColor(.yellow)
                    Text("Why This Outfit Works")
                        .font(.headline)
                }
                
                Text(suggestion.reasoning)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.blue.opacity(0.1))
            .cornerRadius(12)
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
    }
}

struct OutfitItemCard: View {
    let icon: String
    let label: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(icon)
                .font(.title)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(label)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            
            Spacer()
        }
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
}

struct OutfitSuggestionView_Previews: PreviewProvider {
    static var previews: some View {
        OutfitSuggestionView(
            suggestion: OutfitSuggestion(
                shirt: "Classic white dress shirt",
                trouser: "Navy blue dress trousers",
                blazer: "Charcoal gray blazer",
                shoes: "Black leather oxford shoes",
                belt: "Black leather belt",
                reasoning: "This outfit combines classic business attire with modern proportions."
            )
        )
        .padding()
    }
}

