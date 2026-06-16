// Applies Theme Designer global tokens (colors / typography) as CSS custom
// properties on :root, so the live site picks them up without a rebuild.

import { useEffect } from "react";
import { loadTokens } from "@/lib/themeStore";

// Convert "#rrggbb" → "h s% l%" string for Tailwind's hsl(var(--token)) usage.
function hexToHsl(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function ThemeTokensInjector() {
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const t = await loadTokens();
        if (!mounted) return;
        const root = document.documentElement;
        Object.entries(t.colors || {}).forEach(([name, value]) => {
          if (typeof value !== "string") return;
          const hsl = hexToHsl(value);
          if (hsl) root.style.setProperty(`--${name}`, hsl);
          root.style.setProperty(`--color-${name}`, value);
        });
        if (t.typography?.fontFamilyHeading) root.style.setProperty("--font-display", `"${t.typography.fontFamilyHeading}"`);
        if (t.typography?.fontFamilyBody) root.style.setProperty("--font-body", `"${t.typography.fontFamilyBody}"`);
        if (t.typography?.baseSize) root.style.setProperty("--font-base-size", `${t.typography.baseSize}px`);
        Object.entries(t.spacing || {}).forEach(([k, v]) => {
          if (typeof v === "number") root.style.setProperty(`--space-${k}`, `${v}px`);
        });
      } catch { /* tokens optional */ }
    })();
    return () => { mounted = false; };
  }, []);
  return null;
}
