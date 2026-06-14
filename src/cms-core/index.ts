// Engine surface — the public contract of the CMS Core SDK.
// Children should ONLY import from this file (or its built bundle).

export * from "./registry";
export * from "./bootstrap";

// Renderers / editors
export { default as ThemeBlocksRenderer } from "@/components/site/ThemeBlocksRenderer";
export { default as VisualCanvas } from "@/components/admin/VisualCanvas";

// Stores / services
export * as themeStore from "@/lib/themeStore";
export * as templateAssignments from "@/lib/templateAssignments";
export * as syncControl from "@/lib/syncControl";
export * as activityLog from "@/lib/activityLog";
export * as taxonomies from "@/lib/taxonomies";
export * as parentClient from "@/lib/parent";

// SEO engine
export * as seo from "@/lib/seo";
export * as postSeo from "@/lib/postSeo";
export * as seoScoring from "@/lib/seoScoring";
export * as seoFiles from "@/lib/seoFiles";

export const CMS_CORE_API_VERSION = "0.1.0";
