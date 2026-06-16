// Watches every route change. If the current path matches an enabled redirect,
// navigates to the destination (in-app) or hard-redirects to external targets.
// Hits are recorded back to public.redirects for analytics.

import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resolveRedirect, recordHit } from "@/lib/redirects";

export default function RedirectsGate() {
  const { pathname } = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    let cancelled = false;
    // Don't redirect admin or auth paths
    if (pathname.startsWith("/admin")) return;
    (async () => {
      try {
        const r = await resolveRedirect(pathname);
        if (cancelled || !r) return;
        const to = r.to_url;
        // record hit fire-and-forget
        recordHit(r.id, r.hits).catch(() => {});
        if (/^https?:\/\//i.test(to)) {
          window.location.replace(to);
        } else {
          nav(to.startsWith("/") ? to : `/${to}`, { replace: true });
        }
      } catch {
        /* swallow */
      }
    })();
    return () => { cancelled = true; };
  }, [pathname, nav]);

  return null;
}
