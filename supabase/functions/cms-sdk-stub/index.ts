// cms-sdk-stub — serves a minimal `window.ParentCMS` JavaScript bundle so that
// a freshly cut release can boot even before an admin has uploaded a real
// engine SDK. Children dynamically import() this URL.
//
// The stub:
//   - defines window.ParentCMS with no-op mount* methods,
//   - exposes ParentCMS.applyManifest(manifest) which delegates to the engine
//     surface already shipped with the child shim,
//   - signals to the host page that the shim is alive (a small badge).
//
// CORS is wide open; the response is served as application/javascript with a
// long cache TTL.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SDK_JS = `// @our-org/cms-core stub SDK
(function () {
  if (typeof window === "undefined") return;
  if (window.ParentCMS) return;
  var listeners = [];
  function noop() { /* mount stub */ }
  window.ParentCMS = {
    version: "stub-1.0.0",
    isStub: true,
    mountEditor: noop,
    mountMediaLibrary: noop,
    mountSEOEditor: noop,
    mountPageBuilder: noop,
    mountFormBuilder: noop,
    onManifest: function (cb) { listeners.push(cb); },
    applyManifest: function (manifest) {
      try { listeners.forEach(function (cb) { try { cb(manifest); } catch (_) {} }); }
      catch (_) {}
      try {
        window.dispatchEvent(new CustomEvent("parentcms:manifest", { detail: manifest }));
      } catch (_) {}
    },
  };
  try {
    window.dispatchEvent(new CustomEvent("parentcms:ready", { detail: { stub: true } }));
  } catch (_) {}
})();
export default window.ParentCMS;
`;

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(SDK_JS, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
    },
  });
});
