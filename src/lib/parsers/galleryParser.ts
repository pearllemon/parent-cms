export type GalleryWidget = {
  type: 'gallery';
  images: string[];
};

/**
 * Parses markdown for a simple image gallery.
 * Detects a sequence of image markdown lines (e.g., ![alt](url))
 * separated by empty lines and returns an array of image URLs.
 */
export function parseGallery(md: string): GalleryWidget | null {
  const imageRegex = /!\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi;
  const images: string[] = [];
  let match;
  while ((match = imageRegex.exec(md)) !== null) {
    images.push(match[1].trim());
  }
  if (images.length === 0) return null;
  return { type: 'gallery', images };
}
