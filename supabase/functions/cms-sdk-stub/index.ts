// cms-sdk-stub — minimal but real ES module served as the default `sdk_url`
// for any release that doesn't ship a custom engine bundle yet.
//
// Contract (stable across stub and real bundles):
//
//   import * as sdk from "<sdk_url>";
//   sdk.version           // string
//   sdk.isStub            // boolean
//   sdk.mountAdmin(el, ctx)        -> unmount()
//   sdk.mountEditor(el, ctx, opts) -> unmount()
//   sdk.mountMediaLibrary(el, ctx) -> unmount()
//   sdk.mountSEOEditor(el, ctx)    -> unmount()
//   sdk.applyManifest(manifest)    -> void
//   sdk.onManifest(cb)             -> off()
//
// The stub renders a friendly "connected, waiting for engine" panel so the
// child's /admin route is never blank, even before an admin uploads a real
// bundle. CORS is wide-open; Content-Type is application/javascript so
// dynamic import() succeeds.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SDK_JS = String.raw`// @our-org/cms-core stub SDK (ESM)
const VERSION = "stub-1.1.0";
const listeners = new Set();

function escape(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function panelHtml(title, ctx, body) {
  const site = escape(ctx && ctx.siteId || "unknown");
  const path = escape(ctx && ctx.currentPath || "/admin");
  return [
    '<div data-cms-stub style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:linear-gradient(180deg,#fafafa,#f1f5f9);border:1px solid #e2e8f0;border-radius:14px;padding:28px;max-width:720px;margin:32px auto;box-shadow:0 1px 2px rgba(15,23,42,.04)">',
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">',
        '<span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.15)"></span>',
        '<strong style="font-size:14px;letter-spacing:.02em;text-transform:uppercase;color:#475569">Parent CMS connected</strong>',
        '<span style="margin-left:auto;font-size:11px;color:#94a3b8">SDK ' + escape(VERSION) + '</span>',
      '</div>',
      '<h1 style="font-size:22px;margin:0 0 8px;font-weight:600">' + escape(title) + '</h1>',
      '<p style="margin:0 0 18px;color:#475569;line-height:1.55">' + body + '</p>',
      '<dl style="display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;font-size:13px;margin:0;padding:14px;background:#fff;border:1px solid #e2e8f0;border-radius:10px">',
        '<dt style="color:#64748b">Site ID</dt><dd style="margin:0;font-family:ui-monospace,monospace">' + site + '</dd>',
        '<dt style="color:#64748b">Route</dt><dd style="margin:0;font-family:ui-monospace,monospace">' + path + '</dd>',
        '<dt style="color:#64748b">SDK</dt><dd style="margin:0">stub bundle (no custom engine uploaded yet)</dd>',
      '</dl>',
    '</div>',
  ].join("");
}

function mount(el, html) {
  if (!el || typeof el !== "object") return function noop() {};
  el.innerHTML = html;
  return function unmount() {
    try { el.innerHTML = ""; } catch (_) {}
  };
}

export const version = VERSION;
export const isStub = true;

export function mountAdmin(el, ctx) {
  ctx = ctx || {};
  return mount(el, panelHtml(
    "Admin shell is live",
    ctx,
    "The child site is verified and talking to the parent CMS. " +
    "Once an admin publishes a release with a real engine bundle, the full " +
    "<strong>/admin</strong> experience will load here automatically — no child rebuild required."
  ));
}

export function mountEditor(el, ctx /*, opts */) {
  return mount(el, panelHtml("Content editor",   ctx || {}, "Editor stub. The real WYSIWYG editor ships in the engine bundle."));
}
export function mountMediaLibrary(el, ctx) {
  return mount(el, panelHtml("Media library",    ctx || {}, "Media library stub. Upload UI ships with the engine bundle."));
}
export function mountSEOEditor(el, ctx) {
  return mount(el, panelHtml("SEO editor",       ctx || {}, "SEO editor stub. Scoring + snippet previews ship with the engine bundle."));
}
export function mountPageBuilder(el, ctx) {
  return mount(el, panelHtml("Page builder",     ctx || {}, "Page builder stub. Drag-and-drop canvas ships with the engine bundle."));
}
export function mountFormBuilder(el, ctx) {
  return mount(el, panelHtml("Form builder",     ctx || {}, "Form builder stub. Form designer ships with the engine bundle."));
}

export function onManifest(cb) {
  if (typeof cb !== "function") return function () {};
  listeners.add(cb);
  return function off() { listeners.delete(cb); };
}

export function applyManifest(manifest) {
  for (const cb of listeners) { try { cb(manifest); } catch (_) {} }
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("parentcms:manifest", { detail: manifest }));
    }
  } catch (_) {}
}

// Back-compat: also expose on window so legacy children that read
// window.ParentCMS / window.__cmsSdk keep working.
if (typeof window !== "undefined") {
  const api = {
    version: VERSION, isStub: true,
    mountAdmin, mountEditor, mountMediaLibrary, mountSEOEditor,
    mountPageBuilder, mountFormBuilder, onManifest, applyManifest,
  };
  if (!window.ParentCMS) window.ParentCMS = api;
  if (!window.__cmsSdk)  window.__cmsSdk  = api;
  try { window.dispatchEvent(new CustomEvent("parentcms:ready", { detail: { stub: true, version: VERSION } })); } catch (_) {}
}

export default { version: VERSION, isStub: true, mountAdmin, mountEditor, mountMediaLibrary, mountSEOEditor, mountPageBuilder, mountFormBuilder, onManifest, applyManifest };
`;

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  return new Response(SDK_JS, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      "X-CMS-SDK": "stub-1.1.0",
    },
  });
});
