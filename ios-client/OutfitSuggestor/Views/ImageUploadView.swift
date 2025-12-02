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
                            .foregroundColor(.blue)
                        
                        Text("Tap to Upload Image")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Text("JPEG, PNG supported")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(40)
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.blue.opacity(0.5), style: StrokeStyle(lineWidth: 2, dash: [10]))
                    )
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
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

