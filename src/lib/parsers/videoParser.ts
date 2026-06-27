export type VideoWidget = {
  type: 'video';
  src: string;
  title?: string;
};

/**
 * Parses markdown content for embedded video widgets.
 * Supports raw <iframe> tags and a simple [video src="..." title="..."] shortcode.
 */
export function parseVideo(md: string): VideoWidget | null {
  // Detect iframe embed
  const iframeMatch = md.match(/<iframe[^>]+src=["']([^"']+)["'][^>]*><\/iframe>/i);
  if (iframeMatch) {
    return { type: 'video', src: iframeMatch[1].trim() };
  }

  // Detect [video] shortcode e.g., [video src="https://..." title="My Video"]
  const shortcodeMatch = md.match(/\[video\s+([^\]]+)\]/i);
  if (shortcodeMatch) {
    const attrs = shortcodeMatch[1];
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    const titleMatch = attrs.match(/title=["']([^"']+)["']/i);
    if (srcMatch) {
      return { type: 'video', src: srcMatch[1].trim(), title: titleMatch ? titleMatch[1].trim() : undefined };
    }
  }
  return null;
}
