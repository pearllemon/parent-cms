// Admin: SEO tools.
// Generates a sitemap.xml from all known static + dynamic routes (posts,
// pages, services) and lets the admin download it for upload to the host
// root, or copy the XML. Also shows a snapshot of robots.txt directives.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { services } from "@/data/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, RefreshCcw, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Row = { slug: string; updated_at: string | null; type?: string | null };

const STATIC_ROUTES: { path: string; priority: number; changefreq: string }[] = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/about", priority: 0.8, changefreq: "monthly" },
  { path: "/blog", priority: 0.9, changefreq: "daily" },
  { path: "/contact", priority: 0.7, changefreq: "monthly" },
  { path: "/book-a-call", priority: 0.7, changefreq: "monthly" },
  { path: "/press-and-media", priority: 0.5, changefreq: "monthly" },
  { path: "/books", priority: 0.5, changefreq: "monthly" },
  { path: "/privacy", priority: 0.3, changefreq: "yearly" },
  { path: "/terms", priority: 0.3, changefreq: "yearly" },
];

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

function urlEntry(loc: string, lastmod: string | null, changefreq: string, priority: number): string {
  const parts = [`    <loc>${xmlEscape(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>`);
  parts.push(`    <changefreq>${changefreq}</changefreq>`);
  parts.push(`    <priority>${priority.toFixed(1)}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

export default function AdminSeo() {
  const { config } = useSiteConfig();
  const [baseUrl, setBaseUrl] = useState<string>(
    typeof window !== "undefined" ? window.location.origin : ""
  );
  const [parentPosts, setParentPosts] = useState<Row[]>([]);
  const [importedPosts, setImportedPosts] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const out: Row[] = [];

    if (config?.site?.id) {
      const { data } = await parent
        .from("posts")
        .select("slug,updated_at,type,status")
        .eq("site_id", config.site.id)
        .eq("status", "published")
        .limit(2000);
      setParentPosts((data || []).map((r: any) => ({ slug: r.slug, updated_at: r.updated_at, type: r.type })));
    } else {
      setParentPosts([]);
    }

    const { data: imp } = await supabase
      .from("imported_posts")
      .select("slug,updated_at,type")
      .limit(5000);
    setImportedPosts((imp || []).filter((r: any) => r.slug).map((r: any) => ({ slug: r.slug, updated_at: r.updated_at, type: r.type })));

    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [config?.site?.id]);

  const xml = useMemo(() => {
    const seen = new Set<string>();
    const entries: string[] = [];
    const base = baseUrl.replace(/\/+$/, "");

    const add = (path: string, lastmod: string | null, changefreq: string, priority: number) => {
      const key = path.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      entries.push(urlEntry(`${base}${path}`, lastmod, changefreq, priority));
    };

    for (const r of STATIC_ROUTES) add(r.path, null, r.changefreq, r.priority);
    for (const s of services) add(`/services/${s.slug}`, null, "monthly", 0.8);

    for (const p of parentPosts) {
      const path = p.type === "page" ? `/p/${p.slug}` : `/blog/${p.slug}`;
      add(path, p.updated_at, p.type === "page" ? "monthly" : "weekly", p.type === "page" ? 0.7 : 0.6);
    }
    for (const p of importedPosts) {
      const path = p.type === "page" ? `/p/${p.slug}` : `/blog/${p.slug}`;
      add(path, p.updated_at, p.type === "page" ? "monthly" : "weekly", p.type === "page" ? 0.7 : 0.6);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
  }, [baseUrl, parentPosts, importedPosts]);

  const totalUrls = useMemo(() => (xml.match(/<url>/g) || []).length, [xml]);

  const robots = useMemo(
    () =>
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "",
        `Sitemap: ${baseUrl.replace(/\/+$/, "")}/sitemap.xml`,
      ].join("\n"),
    [baseUrl]
  );

  const download = (name: string, content: string, type = "application/xml") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(xml);
    setCopied(true);
    toast.success("Sitemap copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-64 space-y-1.5">
          <Label className="text-xs">Base URL</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://yourdomain.com"
          />
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Reload content"}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Static routes</p>
          <p className="text-2xl font-display">{STATIC_ROUTES.length + services.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">CMS posts/pages</p>
          <p className="text-2xl font-display">{parentPosts.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Imported posts/pages</p>
          <p className="text-2xl font-display">{importedPosts.length}</p>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">sitemap.xml</p>
            <p className="text-xs text-muted-foreground">{totalUrls} URLs · ready for Google Search Console</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied" : "Copy XML"}
            </Button>
            <Button size="sm" onClick={() => download("sitemap.xml", xml)}>
              <Download className="w-4 h-4 mr-2" /> Download sitemap.xml
            </Button>
          </div>
        </div>
        <Textarea readOnly value={xml} className="font-mono text-xs h-64" />
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">robots.txt</p>
            <p className="text-xs text-muted-foreground">Replace public/robots.txt with this when you set a real domain.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => download("robots.txt", robots, "text/plain")}>
            <Download className="w-4 h-4 mr-2" /> Download robots.txt
          </Button>
        </div>
        <Textarea readOnly value={robots} className="font-mono text-xs h-32" />
      </div>
    </div>
  );
}
