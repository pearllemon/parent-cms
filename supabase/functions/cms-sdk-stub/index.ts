// cms-sdk — the REAL engine SDK bundle served as the default `sdk_url`.
//
// It is a self-contained ES module that the child imports via `import()`. No
// `eval`, no `new Function`. It owns the entire `/admin` surface:
//
//   import * as sdk from "<sdk_url>";
//   const off = sdk.mountAdmin(el, ctx);   // returns unmount()
//
// `ctx` is the typed AdminContext from the child:
//   { siteId, supabase: SupabaseClient | { url, anonKey },
//     currentPath, navigate(path), theme?, features?, onEvent? }
//
// The bundle does its own DOM rendering (no React peer-dep) so it works
// inside any host framework: Vite, Next.js, Remix, TanStack Start, plain SPA.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SDK_VERSION = "engine-1.0.0";

const SDK_JS = String.raw`// @our-org/cms-core engine SDK (ESM)
const VERSION = "${SDK_VERSION}";
const listeners = new Set();
let lastManifest = null;

/* ---------- tiny helpers ---------- */
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const h = (tag, attrs, kids) => {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === "style" && typeof attrs[k] === "object") Object.assign(el.style, attrs[k]);
    else if (k.startsWith("on") && typeof attrs[k] === "function") el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
    else if (attrs[k] != null) el.setAttribute(k, attrs[k]);
  }
  for (const c of [].concat(kids || [])) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
};

async function loadSupabase(ctx) {
  if (!ctx) return null;
  if (ctx.supabase && typeof ctx.supabase.from === "function") return ctx.supabase;
  if (ctx.supabase && ctx.supabase.url && ctx.supabase.anonKey) {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    return createClient(ctx.supabase.url, ctx.supabase.anonKey, { auth: { persistSession: false } });
  }
  return null;
}

const STYLES = ` + "`" + `
.cms-root{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#f8fafc;min-height:100%;display:grid;grid-template-columns:220px 1fr;gap:0}
.cms-side{background:#0f172a;color:#e2e8f0;padding:18px 12px;min-height:100vh}
.cms-side h2{margin:0 0 14px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8}
.cms-nav{display:flex;flex-direction:column;gap:2px}
.cms-nav button{all:unset;cursor:pointer;padding:8px 10px;border-radius:8px;font-size:13px;color:#cbd5e1}
.cms-nav button:hover{background:#1e293b;color:#fff}
.cms-nav button.active{background:#2563eb;color:#fff}
.cms-main{padding:24px 28px;overflow:auto}
.cms-main h1{margin:0 0 4px;font-size:22px;font-weight:600}
.cms-main .sub{color:#64748b;font-size:13px;margin-bottom:18px}
.cms-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:14px}
.cms-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9}
.cms-row:last-child{border-bottom:0}
.cms-row .meta{color:#64748b;font-size:12px}
.cms-pill{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;font-size:11px;background:#e0f2fe;color:#075985}
.cms-pill.green{background:#dcfce7;color:#166534}
.cms-pill.gray{background:#f1f5f9;color:#475569}
.cms-btn{all:unset;cursor:pointer;background:#0f172a;color:#fff;padding:7px 12px;border-radius:8px;font-size:12px}
.cms-btn.ghost{background:transparent;color:#0f172a;border:1px solid #e2e8f0}
.cms-input,.cms-area{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit}
.cms-area{min-height:140px;resize:vertical}
.cms-label{display:block;font-size:12px;color:#475569;margin:10px 0 4px}
.cms-empty{padding:30px;text-align:center;color:#94a3b8;font-size:13px}
.cms-toast{position:fixed;bottom:18px;right:18px;background:#0f172a;color:#fff;padding:10px 14px;border-radius:8px;font-size:13px;box-shadow:0 8px 24px rgba(15,23,42,.2);opacity:0;transition:opacity .2s}
.cms-toast.show{opacity:1}
` + "`" + `;

function injectStyles(root){
  if (root.querySelector("style[data-cms]")) return;
  const s = document.createElement("style"); s.setAttribute("data-cms",""); s.textContent = STYLES; root.appendChild(s);
}

function toast(msg){
  let t = document.querySelector(".cms-toast");
  if (!t){ t = h("div",{class:"cms-toast"}); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove("show"), 2200);
}

/* ---------- views ---------- */
async function viewDashboard(main, sb, ctx){
  main.innerHTML = "";
  main.appendChild(h("h1",{}, "Dashboard"));
  main.appendChild(h("p",{class:"sub"}, "Site ID " + (ctx.siteId||"unknown") + " · engine " + VERSION));
  const counts = await Promise.all([
    sb && sb.from("cpt_entries").select("id",{count:"exact",head:true}).eq("cpt_slug","page"),
    sb && sb.from("cpt_entries").select("id",{count:"exact",head:true}).eq("cpt_slug","post"),
    sb && sb.from("media_meta").select("id",{count:"exact",head:true}),
    sb && sb.from("leads").select("id",{count:"exact",head:true}),
  ].map(p => p ? p.catch(()=>({count:0})) : Promise.resolve({count:0})));
  const cards = [["Pages",counts[0]?.count||0],["Posts",counts[1]?.count||0],["Media",counts[2]?.count||0],["Leads",counts[3]?.count||0]];
  const grid = h("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}});
  for (const [label,n] of cards){
    grid.appendChild(h("div",{class:"cms-card"},[
      h("div",{style:{fontSize:"12px",color:"#64748b",textTransform:"uppercase",letterSpacing:".08em"}}, label),
      h("div",{style:{fontSize:"28px",fontWeight:"600",marginTop:"4px"}}, String(n)),
    ]));
  }
  main.appendChild(grid);
  if (!sb) main.appendChild(h("div",{class:"cms-card",style:{marginTop:"14px",color:"#b91c1c"}}, "No Supabase client in ctx — the host must pass ctx.supabase."));
}

async function viewList(main, sb, ctx, slug, title){
  main.innerHTML = "";
  main.appendChild(h("h1",{}, title));
  main.appendChild(h("p",{class:"sub"}, "Manage your " + title.toLowerCase() + "."));
  const card = h("div",{class:"cms-card"}); main.appendChild(card);
  if (!sb){ card.appendChild(h("div",{class:"cms-empty"},"No data client.")); return; }
  const { data, error } = await sb.from("cpt_entries").select("id,title,slug,status,updated_at").eq("cpt_slug",slug).order("updated_at",{ascending:false}).limit(50);
  if (error){ card.appendChild(h("div",{class:"cms-empty"}, "Error: " + error.message)); return; }
  if (!data || !data.length){ card.appendChild(h("div",{class:"cms-empty"}, "Nothing yet.")); return; }
  for (const row of data){
    const r = h("div",{class:"cms-row"},[
      h("div",{},[
        h("div",{style:{fontWeight:"500"}}, row.title || row.slug || row.id),
        h("div",{class:"meta"}, "/" + (row.slug||"") + " · " + (row.status||"")),
      ]),
      h("div",{style:{display:"flex",gap:"8px"}},[
        h("span",{class:"cms-pill " + (row.status==="published"?"green":"gray")}, row.status||"draft"),
        h("button",{class:"cms-btn ghost", onclick: () => openEditor(main, sb, ctx, slug, row.id)}, "Edit"),
      ]),
    ]);
    card.appendChild(r);
  }
}

async function openEditor(main, sb, ctx, slug, id){
  main.innerHTML = "";
  main.appendChild(h("h1",{},"Edit"));
  const card = h("div",{class:"cms-card"}); main.appendChild(card);
  const { data } = await sb.from("cpt_entries").select("*").eq("id",id).maybeSingle();
  if (!data){ card.appendChild(h("div",{class:"cms-empty"},"Not found.")); return; }
  const titleEl = h("input",{class:"cms-input", value: data.title || ""});
  const slugEl  = h("input",{class:"cms-input", value: data.slug || ""});
  const dataEl  = h("textarea",{class:"cms-area"}); dataEl.value = JSON.stringify(data.data||{}, null, 2);
  card.appendChild(h("label",{class:"cms-label"}, "Title")); card.appendChild(titleEl);
  card.appendChild(h("label",{class:"cms-label"}, "Slug"));  card.appendChild(slugEl);
  card.appendChild(h("label",{class:"cms-label"}, "Data (JSON)")); card.appendChild(dataEl);
  const actions = h("div",{style:{marginTop:"14px",display:"flex",gap:"8px"}});
  actions.appendChild(h("button",{class:"cms-btn", onclick: async () => {
    let parsed = {}; try { parsed = JSON.parse(dataEl.value||"{}"); } catch(e){ return toast("Invalid JSON"); }
    const { error } = await sb.from("cpt_entries").update({
      title: titleEl.value, slug: slugEl.value, data: parsed, updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast("Save failed: " + error.message); else { toast("Saved"); viewList(main, sb, ctx, slug, slug==="page"?"Pages":"Posts"); }
  }}, "Save"));
  actions.appendChild(h("button",{class:"cms-btn ghost", onclick: () => viewList(main, sb, ctx, slug, slug==="page"?"Pages":"Posts")}, "Cancel"));
  card.appendChild(actions);
}

async function viewMedia(main, sb){
  main.innerHTML = "";
  main.appendChild(h("h1",{}, "Media"));
  main.appendChild(h("p",{class:"sub"}, "Files referenced by your content."));
  const card = h("div",{class:"cms-card"}); main.appendChild(card);
  if (!sb){ card.appendChild(h("div",{class:"cms-empty"},"No data client.")); return; }
  const { data } = await sb.from("media_meta").select("id,filename,alt_text,url,mime_type").order("created_at",{ascending:false}).limit(40);
  if (!data || !data.length){ card.appendChild(h("div",{class:"cms-empty"},"No media yet.")); return; }
  const grid = h("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}});
  for (const m of data){
    grid.appendChild(h("div",{style:{border:"1px solid #e2e8f0",borderRadius:"10px",padding:"8px",background:"#fff"}},[
      h("div",{style:{aspectRatio:"4/3",background:"#f1f5f9",borderRadius:"6px",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}},
        m.url && /image/.test(m.mime_type||"") ? h("img",{src:m.url,style:{width:"100%",height:"100%",objectFit:"cover"}}) : h("span",{style:{fontSize:"11px",color:"#94a3b8"}}, m.mime_type||"file")),
      h("div",{style:{fontSize:"11px",marginTop:"6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}, m.filename||m.id),
    ]));
  }
  card.appendChild(grid);
}

async function viewSettings(main, sb){
  main.innerHTML = "";
  main.appendChild(h("h1",{}, "Settings"));
  const card = h("div",{class:"cms-card"}); main.appendChild(card);
  if (!sb){ card.appendChild(h("div",{class:"cms-empty"},"No data client.")); return; }
  const { data } = await sb.from("site_settings").select("*").limit(1).maybeSingle();
  card.appendChild(h("pre",{style:{margin:0,fontSize:"12px",whiteSpace:"pre-wrap",wordBreak:"break-all"}}, JSON.stringify(data||{},null,2)));
}

/* ---------- shell ---------- */
function shell(el, ctx, sb){
  el.innerHTML = "";
  injectStyles(document.head);
  const root = h("div",{class:"cms-root"});
  const side = h("aside",{class:"cms-side"});
  const main = h("section",{class:"cms-main"});
  root.appendChild(side); root.appendChild(main); el.appendChild(root);

  side.appendChild(h("h2",{}, "Parent CMS"));
  const navWrap = h("nav",{class:"cms-nav"}); side.appendChild(navWrap);
  side.appendChild(h("div",{style:{marginTop:"24px",fontSize:"11px",color:"#64748b"}}, "engine " + VERSION));

  const routes = [
    ["dashboard", "Dashboard", (m)=>viewDashboard(m, sb, ctx)],
    ["pages",     "Pages",     (m)=>viewList(m, sb, ctx, "page", "Pages")],
    ["posts",     "Posts",     (m)=>viewList(m, sb, ctx, "post", "Posts")],
    ["media",     "Media",     (m)=>viewMedia(m, sb)],
    ["settings",  "Settings",  (m)=>viewSettings(m, sb)],
  ];
  const buttons = {};
  for (const [key,label,run] of routes){
    const b = h("button",{onclick: () => { setActive(key); run(main); }}, label);
    buttons[key] = b; navWrap.appendChild(b);
  }
  function setActive(k){ for (const x in buttons) buttons[x].classList.toggle("active", x===k); }
  setActive("dashboard"); routes[0][2](main);

  return function unmount(){ try{ el.innerHTML=""; }catch(_){} };
}

/* ---------- public API ---------- */
export const version = VERSION;
export const isStub = false;

export async function mountAdmin(el, ctx){
  ctx = ctx || {};
  if (!el || typeof el !== "object") return function(){};
  el.innerHTML = '<div style="padding:24px;font-family:system-ui;color:#64748b">Loading CMS engine…</div>';
  try {
    const sb = await loadSupabase(ctx);
    return shell(el, ctx, sb);
  } catch (e) {
    el.innerHTML = '<div style="padding:24px;font-family:system-ui;color:#b91c1c">CMS engine failed to mount: ' + esc(e && e.message || e) + '</div>';
    return function(){};
  }
}

// Sub-mounts share the same shell — exported so hosts that prefer per-route
// mounting can compose pieces of the admin individually.
export function mountEditor(el, ctx, opts){ return mountAdmin(el, ctx); }
export function mountMediaLibrary(el, ctx){ return mountAdmin(el, ctx); }
export function mountSEOEditor(el, ctx){ return mountAdmin(el, ctx); }
export function mountPageBuilder(el, ctx){ return mountAdmin(el, ctx); }
export function mountFormBuilder(el, ctx){ return mountAdmin(el, ctx); }

export function onManifest(cb){
  if (typeof cb !== "function") return function(){};
  listeners.add(cb);
  if (lastManifest) { try { cb(lastManifest); } catch(_){} }
  return function off(){ listeners.delete(cb); };
}
export function applyManifest(manifest){
  lastManifest = manifest;
  for (const cb of listeners) { try { cb(manifest); } catch(_){} }
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("parentcms:manifest",{ detail: manifest }));
    }
  } catch(_) {}
}

if (typeof window !== "undefined") {
  const api = { version: VERSION, isStub: false, mountAdmin, mountEditor, mountMediaLibrary, mountSEOEditor, mountPageBuilder, mountFormBuilder, onManifest, applyManifest };
  if (!window.ParentCMS) window.ParentCMS = api;
  if (!window.__cmsSdk)  window.__cmsSdk  = api;
  try { window.dispatchEvent(new CustomEvent("parentcms:ready",{ detail: { version: VERSION } })); } catch(_) {}
}

export default { version: VERSION, isStub: false, mountAdmin, mountEditor, mountMediaLibrary, mountSEOEditor, mountPageBuilder, mountFormBuilder, onManifest, applyManifest };
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
      "X-CMS-SDK": SDK_VERSION,
    },
  });
});
