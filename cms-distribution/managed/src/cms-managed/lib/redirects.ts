// Redirects — typed CRUD + resolver helpers backed by public.redirects.
import { supabase } from "@/integrations/supabase/client";

export type Redirect = {
  id: string;
  from_path: string;
  to_url: string;
  status_code: 301 | 302 | 307 | 308;
  enabled: boolean;
  match_type: "exact" | "prefix";
  notes?: string | null;
  hits: number;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
};

const TBL = "redirects" as any;

function normalize(p: string): string {
  if (!p) return "/";
  let out = p.trim();
  if (!out.startsWith("/")) out = "/" + out;
  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);
  return out;
}

export async function listRedirects(): Promise<Redirect[]> {
  const { data, error } = await (supabase.from(TBL) as any)
    .select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Redirect[];
}

export async function createRedirect(r: Partial<Redirect>) {
  const payload = {
    from_path: normalize(r.from_path || ""),
    to_url: (r.to_url || "").trim(),
    status_code: r.status_code || 301,
    enabled: r.enabled ?? true,
    match_type: r.match_type || "exact",
    notes: r.notes || null,
  };
  if (!payload.from_path || !payload.to_url) throw new Error("from_path and to_url are required");
  if (normalize(payload.to_url) === payload.from_path)
    throw new Error("Redirect loop: from_path equals to_url");
  const { data, error } = await (supabase.from(TBL) as any).insert(payload).select().single();
  if (error) throw error;
  return data as Redirect;
}

export async function updateRedirect(id: string, patch: Partial<Redirect>) {
  const clean: any = { ...patch };
  if (clean.from_path) clean.from_path = normalize(clean.from_path);
  const { error } = await (supabase.from(TBL) as any).update(clean).eq("id", id);
  if (error) throw error;
}

export async function deleteRedirect(id: string) {
  const { error } = await (supabase.from(TBL) as any).delete().eq("id", id);
  if (error) throw error;
}

/** Resolve a request path against the redirects table. */
export async function resolveRedirect(path: string): Promise<Redirect | null> {
  const p = normalize(path);
  const { data } = await (supabase.from(TBL) as any)
    .select("*").eq("enabled", true);
  const rows = (data || []) as Redirect[];
  // exact wins over prefix; longest prefix wins
  const exact = rows.find((r) => r.match_type === "exact" && normalize(r.from_path) === p);
  if (exact) return exact;
  const prefixes = rows
    .filter((r) => r.match_type === "prefix" && p.startsWith(normalize(r.from_path)))
    .sort((a, b) => b.from_path.length - a.from_path.length);
  return prefixes[0] || null;
}

export async function recordHit(id: string, current: number) {
  await (supabase.from(TBL) as any)
    .update({ hits: (current || 0) + 1, last_hit_at: new Date().toISOString() })
    .eq("id", id);
}

export const normalizePath = normalize;
