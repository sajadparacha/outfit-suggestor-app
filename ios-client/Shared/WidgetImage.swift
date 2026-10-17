//
//  WidgetImage.swift
//  Shared by the watch widget extension (and the iPhone app for unit tests).
//
//  On device, watchOS shows the redacted placeholder instead of the widget when an image is larger
//  than the pixels it is drawn into, so every widget picture is redrawn at its exact on-screen size.
//

import CoreGraphics
import UIKit

enum WidgetImage {
    /// Every current Apple Watch renders at 2x.
    static let scale: CGFloat = 2

    /// Square sRGB bitmap of `points` × `scale` pixels; `fill` crops to cover, otherwise fits inside.
    static func fitted(_ image: CGImage, points: CGFloat, fill: Bool) -> UIImage? {
        let side = Int((points * scale).rounded())
        guard side > 0, image.width > 0, image.height > 0,
              let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                  data: nil, width: side, height: side, bitsPerComponent: 8, bytesPerRow: 0,
                  space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
              ) else { return nil }
        let width = CGFloat(image.width), height = CGFloat(image.height)
        let target = CGFloat(side)
        let ratio = fill ? max(target / width, target / height) : min(target / width, target / height)
        let drawn = CGSize(width: width * ratio, height: height * ratio)
        context.interpolationQuality = .high
        context.draw(image, in: CGRect(
            x: (target - drawn.width) / 2, y: (target - drawn.height) / 2,
            width: drawn.width, height: drawn.height
        ))
        return context.makeImage().map { UIImage(cgImage: $0, scale: scale, orientation: .up) }
    }
}
