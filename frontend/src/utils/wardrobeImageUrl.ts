/**
 * Build a browser-ready src URL from wardrobe/history base64 image_data.
 */
export function wardrobeImageDataUrl(imageData: string | null | undefined): string | null {
  if (!imageData) return null;
  if (imageData.startsWith('data:')) return imageData;
  return `data:image/jpeg;base64,${imageData}`;
}
