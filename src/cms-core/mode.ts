// Parent / Child mode detection.
// Default = "parent" (this CMS is the master). When this project is remixed
// into a child website, set VITE_CMS_MODE=child in the child's environment
// or call setCmsMode("child") at runtime. The setting is cached in
// localStorage so it persists across reloads.

export type CmsMode = "parent" | "child" | "hybrid";

const LS_KEY = "cms-mode";

export function getCmsMode(): CmsMode {
  // Build-time env override wins
  const envMode = (import.meta.env.VITE_CMS_MODE as string | undefined)?.toLowerCase();
  if (envMode === "child" || envMode === "hybrid" || envMode === "parent") return envMode;
  
  // Detect child site dynamically based on Supabase URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== "https://kpmnwhtrxjsnitlafgom.supabase.co") {
    return "child";
  }

  try {
    const stored = localStorage.getItem(LS_KEY) as CmsMode | null;
    if (stored === "child" || stored === "hybrid" || stored === "parent") return stored;
  } catch { /* */ }
  return "parent";
}

export function setCmsMode(mode: CmsMode) {
  try { localStorage.setItem(LS_KEY, mode); } catch { /* */ }
}

export const isParent = () => getCmsMode() === "parent";
export const isChild = () => getCmsMode() === "child";
export const isHybrid = () => getCmsMode() === "hybrid";
