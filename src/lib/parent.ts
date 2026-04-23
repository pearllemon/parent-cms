// Pearl Lemon parent-site connector.
// Auto-registers this child site, tracks page views, and exposes lead submit.
const API = "https://zvaiqrewtqvsokzbxnxt.supabase.co/functions/v1/site-config";
const KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2YWlxcmV3dHF2c29remJ4bnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NDcwNDQsImV4cCI6MjA5MTEyMzA0NH0.1EJJiOnH51FzKuAtU8QTpmu2GgZCgX1FjaLpHTtdl-k";

let siteIdPromise: Promise<string | null> | null = null;

export function getSiteId(): Promise<string | null> {
  if (siteIdPromise) return siteIdPromise;
  if (typeof window === "undefined") return Promise.resolve(null);
  const domain = window.location.hostname;
  siteIdPromise = fetch(`${API}?action=heartbeat&domain=${encodeURIComponent(domain)}`, {
    headers: { apikey: KEY },
  })
    .then((r) => r.json())
    .then((d) => {
      const id = d?.site_id ?? null;
      if (id) (window as unknown as { __PL_SITE_ID?: string }).__PL_SITE_ID = id;
      return id;
    })
    .catch(() => null);
  return siteIdPromise;
}

export async function trackPageView(path: string) {
  try {
    const site_id = await getSiteId();
    if (!site_id) return;
    let sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("session_id", sessionId);
    }
    fetch(`${API}?action=page_view`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY },
      body: JSON.stringify({
        site_id,
        page_path: path,
        referrer: document.referrer,
        session_id: sessionId,
        user_agent: navigator.userAgent,
      }),
      keepalive: true,
    });
  } catch {
    /* noop */
  }
}

export async function submitLead(input: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}) {
  const site_id = await getSiteId();
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY },
    body: JSON.stringify({ ...input, source_site_id: site_id }),
  });
  if (!res.ok) throw new Error(`Lead submission failed (${res.status})`);
  return res.json().catch(() => ({}));
}
