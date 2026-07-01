// Comprehensive Site Settings.
//
// Tabs: General · Branding · SEO defaults · Social · Analytics · Email ·
//       Performance · Security · Permalinks & Cache · Advanced.
// Backed by the `site_settings` table (one row per site).

import { useEffect, useState } from "react";
import { supabase as cloud } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Save, Trash2, RefreshCw, Image as ImageIcon } from "lucide-react";
import { clearAllCache, getCacheStats, type CacheStats } from "@/lib/cache";
import MediaPicker from "@/components/admin/MediaPicker";

/* eslint-disable @typescript-eslint/no-explicit-any */
const T = (t: string) => (cloud.from(t as any) as any);
const P = (t: string) => (parent.from(t as any) as any);

type Settings = Record<string, any>;

export default function AdminSettings() {
  const { config, refresh } = useSiteConfig();
  const siteId = config?.site?.id;
  const [s, setS] = useState<Settings>({});
  const [pages, setPages] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [perm, setPerm] = useState("/%postname%/");
  const [cacheTtl, setCacheTtl] = useState(3600);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [clearing, setClearing] = useState(false);
  const [picker, setPicker] = useState<{ field: string } | null>(null);

  const set = (k: string, v: any) => setS((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!siteId) return;
    void (async () => {
      const { data } = await T("site_settings").select("*").limit(1).maybeSingle();
      setS((data as Settings) || {});
      const { data: pl } = await P("permalink_settings").select("pattern").eq("site_id", siteId).maybeSingle();
      if (pl?.pattern) setPerm(pl.pattern);
      const { data: cs } = await P("site_cache_settings").select("cache_ttl_seconds").eq("site_id", siteId).maybeSingle();
      if (cs?.cache_ttl_seconds) setCacheTtl(cs.cache_ttl_seconds);

      // Fetch pages of type "page"
      try {
        const { data: parentPg } = await P("posts")
          .select("id,title,slug")
          .eq("site_id", siteId)
          .eq("type", "page");
        
        const { data: localPg } = await T("imported_posts")
          .select("id,title,slug")
          .eq("type", "page");

        const merged = [...(parentPg || []), ...(localPg || [])];
        const seen = new Set<string>();
        const unique = merged.filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        unique.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        setPages(unique);
      } catch (e) {
        console.warn("Failed to fetch pages:", e);
      }
    })();
    void getCacheStats().then(setStats);
  }, [siteId]);

  const save = async () => {
    if (!siteId || !s.id) return;
    setSaving(true);
    try {
      await T("site_settings").update(s).eq("id", s.id);
      await P("permalink_settings").upsert({ site_id: siteId, pattern: perm }, { onConflict: "site_id" });
      await P("site_cache_settings").upsert({ site_id: siteId, cache_ttl_seconds: cacheTtl }, { onConflict: "site_id" });
      toast.success("Settings saved");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const clearCache = async () => {
    setClearing(true);
    try { await clearAllCache(); await refresh(); setStats(await getCacheStats()); toast.success("Cache cleared"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setClearing(false); }
  };

  const ImageField = ({ field, label, hint }: { field: string; label: string; hint?: string }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        {s[field] ? <img src={s[field]} alt="" className="w-12 h-12 rounded border object-cover" /> : <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>}
        <Input className="flex-1" value={s[field] || ""} onChange={(e) => set(field, e.target.value)} placeholder="https://…" />
        <Button type="button" size="sm" variant="outline" onClick={() => setPicker({ field })}>Browse</Button>
        {s[field] && <Button type="button" size="sm" variant="ghost" onClick={() => set(field, "")}>Clear</Button>}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  // Extras-backed helpers (verification + code injection live inside `extras`)
  const extras: Record<string, any> = (s.extras as Record<string, any>) || {};
  const setExtra = (path: string[], v: any) => {
    const next = JSON.parse(JSON.stringify(extras || {}));
    let cur = next;
    for (let i = 0; i < path.length - 1; i++) {
      cur[path[i]] = cur[path[i]] || {};
      cur = cur[path[i]];
    }
    cur[path[path.length - 1]] = v;
    set("extras", next);
  };
  const ver = extras.verification || {};
  const inj = extras.code_injection || {};

  const TABS = [
    { id: "general", label: "General" },
    { id: "branding", label: "Branding" },
    { id: "seo", label: "SEO Defaults" },
    { id: "verification", label: "Webmaster Verification" },
    { id: "injection", label: "Code Injection" },
    { id: "social", label: "Social / OG" },
    { id: "analytics", label: "Analytics" },
    { id: "email", label: "Email" },
    { id: "performance", label: "Performance" },
    { id: "security", label: "Security" },
    { id: "cache", label: "Permalinks & Cache" },
    { id: "advanced", label: "Advanced" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Settings</h1>
          <p className="text-sm text-muted-foreground">Site-wide configuration. Changes apply to the live site immediately after save.</p>
        </div>
        <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save all"}</Button>
      </div>

      <Tabs defaultValue="general" orientation="vertical" className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        <TabsList className="flex md:flex-col h-auto md:h-fit md:items-stretch md:justify-start bg-muted/40 p-1 rounded-lg flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="md:justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-w-0">
        <TabsContent value="general" className="mt-0"><Card className="p-5 space-y-3">
          <div><Label>Site name</Label><Input value={s.site_name || ""} onChange={(e) => set("site_name", e.target.value)} /></div>
          <div><Label>Tagline</Label><Input value={s.tagline || ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Short description for headers, social cards" /></div>
          
          <div>
            <Label>Select Homepage Page</Label>
            <Select
              value={extras.homepage_page_id || "default"}
              onValueChange={(val) => setExtra(["homepage_page_id"], val === "default" ? null : val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Default (Matches home/index slug)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Matches home/index slug)</SelectItem>
                {pages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title || `Untitled Page (${p.slug})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Choose a page to show when users visit the root URL of the site.
            </p>
          </div>

          <div className="text-xs text-muted-foreground pt-2">Site ID: <code className="font-mono">{siteId}</code> · Domain: <code>{config?.site?.domain?.toString()}</code></div>
        </Card></TabsContent>

        <TabsContent value="branding" className="mt-0"><Card className="p-5 space-y-3">
          <ImageField field="logo_url" label="Site logo (light backgrounds)" />
          <ImageField field="logo_dark_url" label="Site logo (dark backgrounds)" />
          <ImageField field="favicon_url" label="Favicon" hint="Use a square PNG/ICO, at least 64×64." />
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Brand primary color</Label><Input type="color" value={s.brand_primary || "#000000"} onChange={(e) => set("brand_primary", e.target.value)} /></div>
            <div><Label>Brand accent color</Label><Input type="color" value={s.brand_accent || "#000000"} onChange={(e) => set("brand_accent", e.target.value)} /></div>
          </div>
        </Card></TabsContent>

        <TabsContent value="seo" className="mt-0"><Card className="p-5 space-y-3">
          <div><Label>Default meta title</Label><Input value={s.default_meta_title || ""} onChange={(e) => set("default_meta_title", e.target.value)} placeholder="Used when a page has none" /></div>
          <div><Label>Default meta description</Label><Textarea rows={3} value={s.default_meta_description || ""} onChange={(e) => set("default_meta_description", e.target.value)} /></div>
          <ImageField field="default_og_image" label="Default OG/Twitter image" hint="1200×630 recommended" />
          <p className="text-xs text-muted-foreground">Per-page overrides live in the SEO Workspace. These are global fallbacks.</p>
        </Card></TabsContent>

        <TabsContent value="verification" className="mt-0"><Card className="p-5 space-y-4">
          <div>
            <h3 className="font-medium text-sm">Search-engine ownership verification</h3>
            <p className="text-xs text-muted-foreground">Paste the verification <em>content</em> value from each console — we inject the matching <code>&lt;meta&gt;</code> tag site-wide. No need to add HTML files.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Google Search Console</Label>
              <Input value={ver.google || ""} onChange={(e) => setExtra(["verification","google"], e.target.value)} placeholder="google-site-verification content" />
            </div>
            <div>
              <Label className="text-xs">Bing Webmaster Tools</Label>
              <Input value={ver.bing || ""} onChange={(e) => setExtra(["verification","bing"], e.target.value)} placeholder="msvalidate.01 content" />
            </div>
            <div>
              <Label className="text-xs">Yandex Webmaster</Label>
              <Input value={ver.yandex || ""} onChange={(e) => setExtra(["verification","yandex"], e.target.value)} placeholder="yandex-verification content" />
            </div>
            <div>
              <Label className="text-xs">Pinterest</Label>
              <Input value={ver.pinterest || ""} onChange={(e) => setExtra(["verification","pinterest"], e.target.value)} placeholder="p:domain_verify content" />
            </div>
            <div>
              <Label className="text-xs">Facebook Domain</Label>
              <Input value={ver.facebook || ""} onChange={(e) => setExtra(["verification","facebook"], e.target.value)} placeholder="facebook-domain-verification content" />
            </div>
          </div>
        </Card></TabsContent>

        <TabsContent value="injection" className="mt-0"><Card className="p-5 space-y-4">
          <div>
            <h3 className="font-medium text-sm">Custom code injection</h3>
            <p className="text-xs text-muted-foreground">Raw HTML inserted on every page. Use this for analytics snippets, chat widgets, A/B-testing scripts. Code runs as-is — paste only sources you trust.</p>
          </div>
          <div>
            <Label className="text-xs">&lt;head&gt; — appended to document head</Label>
            <Textarea rows={6} className="font-mono text-xs" value={inj.head || ""} onChange={(e) => setExtra(["code_injection","head"], e.target.value)} placeholder="<!-- e.g. <script src='https://cdn.example.com/widget.js'></script> -->" />
          </div>
          <div>
            <Label className="text-xs">&lt;body&gt; open — prepended to body</Label>
            <Textarea rows={6} className="font-mono text-xs" value={inj.body_open || ""} onChange={(e) => setExtra(["code_injection","body_open"], e.target.value)} placeholder="<!-- e.g. GTM noscript fallback -->" />
          </div>
          <div>
            <Label className="text-xs">&lt;body&gt; close (footer) — appended to body</Label>
            <Textarea rows={6} className="font-mono text-xs" value={inj.body_close || ""} onChange={(e) => setExtra(["code_injection","body_close"], e.target.value)} placeholder="<!-- e.g. chat widget loader -->" />
          </div>
        </Card></TabsContent>

        <TabsContent value="social" className="mt-0"><Card className="p-5 space-y-3">
          <div><Label>Twitter handle</Label><Input value={s.twitter_handle || ""} onChange={(e) => set("twitter_handle", e.target.value)} placeholder="@yourbrand" /></div>
          <div><Label>Facebook App ID</Label><Input value={s.facebook_app_id || ""} onChange={(e) => set("facebook_app_id", e.target.value)} /></div>
        </Card></TabsContent>

        <TabsContent value="analytics" className="mt-0"><Card className="p-5 space-y-3">
          <div><Label>Google Analytics measurement ID</Label><Input value={s.google_analytics_id || ""} onChange={(e) => set("google_analytics_id", e.target.value)} placeholder="G-XXXXXXX" /></div>
          <div><Label>Google Tag Manager ID</Label><Input value={s.google_tag_manager_id || ""} onChange={(e) => set("google_tag_manager_id", e.target.value)} placeholder="GTM-XXXXXX" /></div>
          <div><Label>Facebook Pixel ID</Label><Input value={s.facebook_pixel_id || ""} onChange={(e) => set("facebook_pixel_id", e.target.value)} /></div>
          <div><Label>Plausible domain</Label><Input value={s.plausible_domain || ""} onChange={(e) => set("plausible_domain", e.target.value)} placeholder="example.com" /></div>
        </Card></TabsContent>

        <TabsContent value="email" className="mt-0"><Card className="p-5 space-y-3">
          <div><Label>Provider</Label>
            <Select value={s.email_provider || "none"} onValueChange={(v) => set("email_provider", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="smtp">SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>From name</Label><Input value={s.email_from_name || ""} onChange={(e) => set("email_from_name", e.target.value)} /></div>
            <div><Label>From address</Label><Input type="email" value={s.email_from_address || ""} onChange={(e) => set("email_from_address", e.target.value)} /></div>
          </div>
          <div><Label>Reply-to</Label><Input type="email" value={s.email_reply_to || ""} onChange={(e) => set("email_reply_to", e.target.value)} /></div>
        </Card></TabsContent>

        <TabsContent value="performance" className="mt-0"><Card className="p-5 space-y-3">
          <div className="flex items-center justify-between border rounded p-3"><Label>Lazy-load images</Label><Switch checked={s.perf_lazy_images ?? true} onCheckedChange={(v) => set("perf_lazy_images", v)} /></div>
          <div className="flex items-center justify-between border rounded p-3"><Label>Minify HTML/CSS/JS</Label><Switch checked={s.perf_minify ?? true} onCheckedChange={(v) => set("perf_minify", v)} /></div>
          <div className="flex items-center justify-between border rounded p-3"><Label>Image CDN</Label><Switch checked={s.perf_image_cdn ?? true} onCheckedChange={(v) => set("perf_image_cdn", v)} /></div>
          <div><Label>Preconnect domains (comma-separated)</Label>
            <Input value={(s.perf_preconnect || []).join(", ")} onChange={(e) => set("perf_preconnect", e.target.value.split(",").map((x: string) => x.trim()).filter(Boolean))} placeholder="fonts.googleapis.com, cdn.example.com" />
          </div>
        </Card></TabsContent>

        <TabsContent value="security" className="mt-0"><Card className="p-5 space-y-3">
          <div className="flex items-center justify-between border rounded p-3"><Label>Force HTTPS</Label><Switch checked={s.sec_force_https ?? true} onCheckedChange={(v) => set("sec_force_https", v)} /></div>
          <div className="flex items-center justify-between border rounded p-3"><Label>HSTS</Label><Switch checked={s.sec_hsts ?? false} onCheckedChange={(v) => set("sec_hsts", v)} /></div>
          <div><Label>Content-Security-Policy (advanced)</Label><Textarea rows={3} className="font-mono text-xs" value={s.sec_csp || ""} onChange={(e) => set("sec_csp", e.target.value)} placeholder="default-src 'self'; …" /></div>
          <div><Label>Referrer-Policy</Label>
            <Select value={s.sec_referrer_policy || "strict-origin-when-cross-origin"} onValueChange={(v) => set("sec_referrer_policy", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["no-referrer", "no-referrer-when-downgrade", "origin", "origin-when-cross-origin", "same-origin", "strict-origin", "strict-origin-when-cross-origin", "unsafe-url"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card></TabsContent>

        <TabsContent value="cache" className="mt-0"><Card className="p-5 space-y-3">
          <div><Label>Permalink pattern</Label><Input value={perm} onChange={(e) => setPerm(e.target.value)} placeholder="/%postname%/" /></div>
          <div><Label>Cache TTL (seconds)</Label><Input type="number" min={60} value={cacheTtl} onChange={(e) => setCacheTtl(Number(e.target.value))} /></div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-muted/40 rounded p-3"><div className="text-xs text-muted-foreground">JSON entries</div><div className="font-display text-2xl">{stats?.jsonEntries ?? "—"}</div></div>
            <div className="bg-muted/40 rounded p-3"><div className="text-xs text-muted-foreground">JSON size</div><div className="font-display text-2xl">{stats ? `${(stats.jsonBytes / 1024).toFixed(1)} KB` : "—"}</div></div>
            <div className="bg-muted/40 rounded p-3"><div className="text-xs text-muted-foreground">Cached images</div><div className="font-display text-2xl">{stats?.imageEntries ?? "—"}</div></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => getCacheStats().then(setStats)}><RefreshCw className="w-4 h-4 mr-1" /> Refresh stats</Button>
            <Button variant="destructive" disabled={clearing} onClick={clearCache}><Trash2 className="w-4 h-4 mr-1" /> {clearing ? "Clearing…" : "Clear all cache"}</Button>
          </div>
        </Card></TabsContent>

        <TabsContent value="advanced" className="mt-0"><Card className="p-5 space-y-3">
          <Label>Extras (JSON)</Label>
          <Textarea rows={10} className="font-mono text-xs" value={JSON.stringify(s.extras || {}, null, 2)} onChange={(e) => { try { set("extras", JSON.parse(e.target.value)); } catch { /* ignore */ } }} />
          <p className="text-xs text-muted-foreground">Catch-all bag for project-specific settings. The Webmaster Verification and Code Injection tabs read/write keys inside this object.</p>
        </Card></TabsContent>
        </div>
      </Tabs>

      <MediaPicker
        open={!!picker}
        onOpenChange={(o) => !o && setPicker(null)}
        onPick={(it) => picker && set(picker.field, it.url)}
      />
    </div>
  );
}
