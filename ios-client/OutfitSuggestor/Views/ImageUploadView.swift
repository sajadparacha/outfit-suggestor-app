//
//  ImageUploadView.swift
//  OutfitSuggestor
//
//  Image upload component
//

import SwiftUI

struct ImageUploadView: View {
    @Binding var selectedImage: UIImage?
    @Binding var showImagePicker: Bool
    
    var body: some View {
        VStack(spacing: 16) {
            Text("Upload Image")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            if let image = selectedImage {
                // Show selected image
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 300)
                        .cornerRadius(12)
                    
                    Button(action: {
                        selectedImage = nil
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                            .background(Circle().fill(Color.black.opacity(0.6)))
                    }
                    .padding(8)
                }
            } else {
                // Upload button
                Button(action: {
                    showImagePicker = true
                }) {
                    VStack(spacing: 16) {
                        Image(systemName: "photo.on.rectangle.angled")
                            .font(.system(size: 50))
                            .foregroundColor(AppTheme.accent)
                        
                        Text("Tap to Upload Image")
                            .font(.headline)
                            .foregroundColor(AppTheme.textPrimary)
                        
                        Text("JPEG, PNG supported")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(40)
                    .background(Color.white.opacity(0.03))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(AppTheme.accent.opacity(0.8), style: StrokeStyle(lineWidth: 2, dash: [8]))
                    )
                }
            }
        }
        .padding()
        .glassCard()
    }
}

struct ImageUploadView_Previews: PreviewProvider {
    static var previews: some View {
        ImageUploadView(
            selectedImage: .constant(nil),
            showImagePicker: .constant(false)
        )
        .padding()
    }
}

