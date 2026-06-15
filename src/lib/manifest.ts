// §14 — Unified Field Schema for the Visual Editor.
// Widgets, sections and blocks all describe themselves via this Manifest type.
// The editor's panels (Content / Style / Layout / Advanced / Interactions) are
// rendered automatically from the Field[] in each panel.

export type Breakpoint = "desktop" | "tablet" | "mobile";

export type FieldType =
  | "text" | "textarea" | "richtext" | "markdown"
  | "number" | "slider" | "toggle"
  | "color" | "gradient"
  | "image" | "media" | "link" | "url"
  | "select" | "multiselect"
  | "icon" | "font"
  | "spacing" | "border" | "shadow" | "radius"
  | "align" | "justify" | "grid" | "flex"
  | "animation" | "effect" | "cssCode"
  | "dynamicData" | "formField" | "visibility" | "breakpoint";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  group?: "content" | "style" | "layout" | "advanced" | "interactions";
  responsive?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  conditional?: { key: string; eq: unknown };
  // Label controls — labels can be shown/hidden/positioned individually.
  showLabel?: boolean;
  labelPosition?: "top" | "left" | "inside" | "hidden";
  labelStyle?: { color?: string; weight?: number | string; size?: string };
  default?: unknown;
  placeholder?: string;
  help?: string;
};

export type ManifestPanel = "content" | "style" | "layout" | "advanced" | "interactions";

export type Manifest = {
  id: string;
  name: string;
  category: string;
  icon?: string;
  version: string;
  responsive: Breakpoint[];
  panels: Record<ManifestPanel, Field[]>;
  defaults: Partial<Record<Breakpoint, Record<string, unknown>>>;
};

// Per-breakpoint props storage shape used in saved blocks.
export type ResponsiveProps = Partial<Record<Breakpoint, Record<string, unknown>>>;

// Merge desktop → tablet (<1024) → mobile (<640) into a flat prop bag.
export function resolveProps(p: ResponsiveProps, bp: Breakpoint = "desktop"): Record<string, unknown> {
  const d = p.desktop || {};
  if (bp === "desktop") return { ...d };
  const t = { ...d, ...(p.tablet || {}) };
  if (bp === "tablet") return t;
  return { ...t, ...(p.mobile || {}) };
}

// Manifest registry — widgets self-register on import.
const REGISTRY = new Map<string, Manifest>();
export function registerManifest(m: Manifest) { REGISTRY.set(m.id, m); }
export function getManifest(id: string): Manifest | null { return REGISTRY.get(id) ?? null; }
export function listManifests(): Manifest[] { return Array.from(REGISTRY.values()); }
