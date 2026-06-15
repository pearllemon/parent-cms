// Runtime-configurable Supabase client used by the admin bundle.
// vite.admin.config.ts aliases "@/integrations/supabase/client" to this file
// so every admin module imports a Proxy that's wired to the CHILD's Supabase
// project at mount time via configureSupabase().
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function configureSupabase(url: string, anonKey: string) {
  _client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storage: localStorage },
  });
}

function get(): SupabaseClient {
  if (!_client) throw new Error("[cms-bundle] Supabase not configured. Call configure() before mounting.");
  return _client;
}

// Proxy so `import { supabase } from "@/integrations/supabase/client"` works
// even though the real client doesn't exist until configure() runs.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (c as any)[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
}) as SupabaseClient;
