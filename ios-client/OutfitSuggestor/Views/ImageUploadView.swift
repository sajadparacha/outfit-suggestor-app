//
//  ImageUploadView.swift
//  OutfitSuggestor
//
//  Image upload component
//

import SwiftUI
import UIKit

struct ImageUploadView: View {
    @Binding var selectedImage: UIImage?
    @Binding var showImagePicker: Bool
    @Binding var pickerSourceType: UIImagePickerController.SourceType

    var body: some View {
        VStack(spacing: 14) {
            if let image = selectedImage {
                selectedImagePreview(image)
            } else {
                stackedUploadButtons
            }
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private var stackedUploadButtons: some View {
        uploadCard(
            title: "Take Photo",
            subtitle: "Use your camera",
            icon: "camera.fill",
            isPrimary: true
        ) {
            pickerSourceType = .camera
            showImagePicker = true
        }
        .accessibilityIdentifier("main.takePhotoButton")

        uploadCard(
            title: "Upload from Gallery",
            subtitle: "Choose an existing photo",
            icon: "photo.on.rectangle.angled",
            isPrimary: false
        ) {
            pickerSourceType = .photoLibrary
            showImagePicker = true
        }
        .accessibilityIdentifier("main.uploadButton")

        if AppConfig.isUITestMode {
            Button("Use Sample Image") {
                let renderer = UIGraphicsImageRenderer(size: CGSize(width: 240, height: 320))
                selectedImage = renderer.image { ctx in
                    UIColor.systemBlue.setFill()
                    ctx.fill(CGRect(x: 0, y: 0, width: 240, height: 320))
                }
            }
            .buttonStyle(.bordered)
            .tint(AppTheme.accent)
            .accessibilityIdentifier("main.useSampleImageButton")
        }
    }

    @ViewBuilder
    private func uploadCard(
        title: String,
        subtitle: String,
        icon: String,
        isPrimary: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(isPrimary ? AppTheme.gradientStart : AppTheme.textPrimary)
                    .frame(width: 44, height: 44)
                    .background(isPrimary ? AppTheme.accentSoft : AppTheme.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
            }
            .padding(16)
            .background(isPrimary ? AppTheme.accentSoft.opacity(0.35) : AppTheme.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(isPrimary ? AppTheme.gradientStart.opacity(0.5) : AppTheme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func selectedImagePreview(_ image: UIImage) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Selected item")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            ZStack(alignment: .topTrailing) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 260)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(AppTheme.border, lineWidth: 1)
                    )

                Button {
                    selectedImage = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.white)
                        .background(Circle().fill(Color.black.opacity(0.6)))
                }
                .padding(8)
            }

            HStack(spacing: 10) {
                compactActionButton(title: "Retake", icon: "camera") {
                    pickerSourceType = .camera
                    showImagePicker = true
                }
                compactActionButton(title: "Change", icon: "photo") {
                    pickerSourceType = .photoLibrary
                    showImagePicker = true
                }
            }
        }
        .padding(14)
        .glassCard()
    }

    @ViewBuilder
    private func compactActionButton(title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
        }
        .buttonStyle(.bordered)
        .tint(AppTheme.accent)
    }
}

struct ImageUploadView_Previews: PreviewProvider {
    static var previews: some View {
        ImageUploadView(
            selectedImage: .constant(nil),
            showImagePicker: .constant(false),
            pickerSourceType: .constant(.photoLibrary)
        )
        .padding()
        .background(AppTheme.bgPrimary)
    }
}
