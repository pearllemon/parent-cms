// Applies Theme Designer tokens (colors / typography) as CSS custom properties
// scoped to the public frontend ONLY. Tokens are written into a <style> tag
// targeting `.site-theme-root`, never `:root`, so the admin/CMS UI keeps its
// own design system and CMS theme changes never leak into admin styling.

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
    const STYLE_ID = "site-theme-tokens";
    const ensureStyle = () => {
      let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
      if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        document.head.appendChild(el);
      }
      return el;
    };
    void (async () => {
      try {
        const t = await loadTokens();
        if (!mounted) return;
        
        // If tokens haven't been saved to DB yet (no ID), do not inject defaults.
        // This allows the site's index.css to provide the fallback colors safely.
        if (!t.id) return;

        const decls: string[] = [];
        Object.entries(t.colors || {}).forEach(([name, value]) => {
          if (typeof value !== "string") return;
          const hsl = hexToHsl(value);
          if (hsl) decls.push(`--${name}: ${hsl};`);
          decls.push(`--color-${name}: ${value};`);
        });
        if (t.typography?.fontFamilyHeading) decls.push(`--font-display: "${t.typography.fontFamilyHeading}";`);
        if (t.typography?.fontFamilyBody) decls.push(`--font-body: "${t.typography.fontFamilyBody}";`);
        if (t.typography?.baseSize) decls.push(`--font-base-size: ${t.typography.baseSize}px;`);
        Object.entries(t.spacing || {}).forEach(([k, v]) => {
          if (typeof v === "number") decls.push(`--space-${k}: ${v}px;`);
        });
        const css = `.site-theme-root{${decls.join("")}}`;
        ensureStyle().textContent = css;
      } catch { /* tokens optional */ }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return null;
}
