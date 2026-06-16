// Guard for the Lovable Cloud (child) Supabase session.
// The admin signs in against the parent CMS and we MIRROR that
// credential into Cloud at login. If the user opens /admin with a
// stale parent-only session, Cloud writes fail with RLS errors.
// Call ensureCloudSession() before any Cloud insert/update.

import { supabase as cloud } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function hasCloudSession(): Promise<boolean> {
  const { data } = await cloud.auth.getSession();
  return !!data.session;
}

export async function ensureCloudSession(opts?: { silent?: boolean }): Promise<boolean> {
  const ok = await hasCloudSession();
  if (!ok && !opts?.silent) {
    toast.error("Your editor session expired. Please sign in again.", {
      action: {
        label: "Sign in",
        onClick: () => {
          window.location.href = "/admin/login";
        },
      },
    });
  }
  return ok;
}
