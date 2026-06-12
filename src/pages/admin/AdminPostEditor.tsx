// WordPress-style post/page editor.
//
// Two-column layout:
//   Main column   — Title (large), Permalink/slug, TipTap WYSIWYG body
//   Right sidebar — Status & Visibility, Publish, Featured image,
//                   Excerpt, Slug, Author, Template, Parent, Discussion,
//                   Revisions count, Lock modified date, Move to Bin,
//                   SEO score badge (opens built-in SEO editor).
//
// Supports both parent-CMS posts (scope=parent, default) and locally
// imported posts (scope=imported, via ?scope=imported). SEO data
// stored in `post_seo` and best-effort mirrored to the parent posts row.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase as parent } from "@/lib/parent";
import { supabase as cloud } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  ChevronDown, ChevronRight, ExternalLink, Trash2, History, Upload, Image as ImageIcon, LayoutTemplate,
} from "lucide-react";
import RichTextEditor from "@/components/editor/RichTextEditor";
import SeoScoreBadge, { seoColor } from "@/components/admin/seo/SeoScoreBadge";
import SeoPanel from "@/components/admin/seo/RankMathPanel";
import CustomFieldsPanel from "@/components/admin/CustomFieldsPanel";
import MediaPicker from "@/components/admin/MediaPicker";
import { ensureCloudSession } from "@/lib/cloudSession";
import {
  emptySeo, loadPostSeo, savePostSeo, type PostSeo, type Scope,
} from "@/lib/postSeo";
import { scoreSeo } from "@/lib/seoScoring";
import { analyzeKeywords, gradeClass } from "@/lib/keywordRelevance";
import { loadValues, saveValues } from "@/lib/customFields";


const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 75);

type Form = {
  title: string;
  slug: string;
  type: string;
  excerpt: string;
  body: string;
  status: "draft" | "published" | "pending" | "private" | "scheduled" | "trash";
  publish_date: string | null;
  featured_image_url: string;
  author: string;
  template: string;
  parent_id: string;
  discussion_open: boolean;
  lock_modified: boolean;
};

const emptyForm = (type = "post"): Form => ({
  title: "", slug: "", type, excerpt: "", body: "",
  status: "draft", publish_date: null, featured_image_url: "",
  author: "", template: "default", parent_id: "",
  discussion_open: false, lock_modified: false,
});

const AdminPostEditorWP = () => {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") || "post";
  const scope: Scope = (searchParams.get("scope") as Scope) || (isNew ? "parent" : "parent");
  const { config } = useSiteConfig();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm(initialType));
  const [seo, setSeo] = useState<PostSeo>(() => emptySeo(scope, "new"));
  const [seoOpen, setSeoOpen] = useState(false);
  const [revisionCount, setRevisionCount] = useState(0);
  const [parentPages, setParentPages] = useState<{ id: string; title: string }[]>([]);
  const [cfValues, setCfValues] = useState<Record<string, unknown>>({});
  const [featuredPickerOpen, setFeaturedPickerOpen] = useState(false);

  // Load post + seo
  useEffect(() => {
    if (isNew) return;
    (async () => {
      setLoading(true);
      try {
        if (scope === "parent") {
          const { data, error } = await parent.from("posts").select("*").eq("id", id!).single();
          if (error) throw error;
          if (data) {
            setForm({
              title: data.title || "",
              slug: data.slug || "",
              type: data.type || "post",
              excerpt: data.excerpt || "",
              body: data.body || data.content || "",
              status: (data.status as any) || "draft",
              publish_date: data.publish_date || data.published_at || null,
              featured_image_url: data.featured_image_url || "",
              author: typeof data.author === "string" ? data.author : (data.author as any)?.name || "",
              template: (data as any).template || "default",
              parent_id: (data as any).parent_id || "",
              discussion_open: !!(data as any).discussion_open,
              lock_modified: !!(data as any).lock_modified,
            });
          }
        } else {
          const { data, error } = await (cloud.from("imported_posts") as any).select("*").eq("id", id!).single();
          if (error) throw error;
          if (data) {
            setForm({
              title: data.title || "", slug: data.slug || "", type: data.type || "post",
              excerpt: data.excerpt || "", body: data.body || "",
              status: data.status || "draft", publish_date: data.publish_date || null,
              featured_image_url: data.featured_image_url || "",
              author: "", template: "default", parent_id: "",
              discussion_open: false, lock_modified: false,
            });
          }
        }

        const existing = await loadPostSeo(scope, id!);
        if (existing) setSeo(existing);
        else setSeo(emptySeo(scope, id!));

        // Revisions count (only for child-side entries; parent has its own log)
        const { count } = await (cloud.from("revisions" as any) as any)
          .select("id", { count: "exact", head: true })
          .eq("entity_type", scope === "parent" ? "parent_post" : "imported_post")
          .eq("entity_id", id!);
        setRevisionCount(count || 0);

        // Custom field values
        const entityType = (form.type === "page" ? "page" : "post");
        const v = await loadValues(entityType, id!);
        setCfValues(v);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, scope, isNew]);

  // Parent pages for "Parent" selector
  useEffect(() => {
    if (!config?.site?.id) return;
    parent.from("posts").select("id,title").eq("site_id", config.site.id).eq("type", "page").limit(200)
      .then(({ data }) => setParentPages((data as any) || []));
  }, [config?.site?.id]);

  const setF = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const fullSlug = useMemo(() => form.slug || slugify(form.title), [form.slug, form.title]);

  // Live SEO score
  const liveScore = useMemo(() => {
    const r = scoreSeo({
      url: typeof window !== "undefined" ? `${window.location.origin}/${form.type === "page" ? "p" : "blog"}/${fullSlug}` : "/",
      title: seo.seo_title || form.title,
      description: seo.seo_description || form.excerpt,
      slug: fullSlug, html: form.body,
      canonical: seo.canonical_url || undefined,
      ogImage: seo.social.og_image || form.featured_image_url,
    });
    return r.score;
  }, [form, seo, fullSlug]);

  const onUploadFeatured = async (file: File) => {
    const path = `posts/${config?.site?.id || "x"}/${Date.now()}-${file.name}`;
    if (scope === "parent") {
      const { error } = await parent.storage.from("media").upload(path, file);
      if (error) return toast.error(error.message);
      const { data } = parent.storage.from("media").getPublicUrl(path);
      setF("featured_image_url", data.publicUrl);
    } else {
      const { error } = await cloud.storage.from("post-images").upload(path, file);
      if (error) return toast.error(error.message);
      const { data } = cloud.storage.from("post-images").getPublicUrl(path);
      setF("featured_image_url", data.publicUrl);
    }
    toast.success("Image uploaded");
  };

  const save = async (overrideStatus?: Form["status"]) => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (scope === "parent" && !config?.site?.id) return toast.error("Site not loaded");
    if (!(await ensureCloudSession())) return;

    setSaving(true);
    try {
      const status = overrideStatus || form.status;
      const slug = fullSlug;
      let savedId = id!;

      if (scope === "parent") {
        const payload: any = {
          title: form.title, slug, type: form.type, excerpt: form.excerpt, body: form.body,
          status, publish_date: status === "published" ? (form.publish_date || new Date().toISOString()) : form.publish_date,
          featured_image_url: form.featured_image_url || null,
          site_id: config!.site!.id,
        };
        // Optional columns; ignore failures
        try {
          payload.template = form.template;
          payload.parent_id = form.parent_id || null;
        } catch {}
        if (isNew) {
          const { data, error } = await parent.from("posts").insert(payload).select("id").single();
          if (error) throw error;
          savedId = data.id;
        } else {
          const { error } = await parent.from("posts").update(payload).eq("id", id!);
          if (error) throw error;
        }
      } else {
        const payload: any = {
          title: form.title, slug, type: form.type, excerpt: form.excerpt, body: form.body,
          status, publish_date: form.publish_date, featured_image_url: form.featured_image_url || null,
        };
        const { error } = await (cloud.from("imported_posts") as any).update(payload).eq("id", id!);
        if (error) throw error;
      }

      // Persist SEO + sync to parent (best-effort inside savePostSeo)
      await savePostSeo({ ...seo, post_id: savedId, slug, last_score: liveScore });

      // Persist custom field values
      try {
        const entityType = (form.type === "page" ? "page" : "post");
        await saveValues(entityType, savedId, config?.site?.id || null, cfValues);
      } catch { /* ignore */ }

      toast.success(status === "published" ? "Published" : status === "trash" ? "Moved to Bin" : "Saved");
      if (isNew) nav(`/admin/posts/${savedId}${scope === "imported" ? "?scope=imported" : ""}`, { replace: true });
      if (status === "trash") nav("/admin/posts");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  const colors = seoColor(liveScore);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* MAIN COLUMN */}
      <div className="space-y-4 min-w-0">
        <header className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl">{isNew ? `New ${form.type}` : `Edit ${form.type}`}</h1>
          <div className="flex items-center gap-2">
            <SeoScoreBadge score={liveScore} onClick={() => setSeoOpen(true)} />
            <Button variant="outline" size="sm" onClick={() => nav(`/admin/edit/${id || "new"}`)}>
              <LayoutTemplate className="w-4 h-4 mr-1" /> Edit Visually
            </Button>
            <Button variant="outline" disabled={saving} onClick={() => save()}>Save draft</Button>
            <Button disabled={saving} onClick={() => save("published")} className="bg-green-600 hover:bg-green-700">
              {form.status === "published" ? "Update" : "Publish"}
            </Button>
          </div>
        </header>

        <div className="bg-background border rounded-2xl p-5 space-y-3">
          <Input
            placeholder="Add title"
            value={form.title}
            onChange={(e) => setF("title", e.target.value)}
            className="text-2xl h-12 border-0 px-0 focus-visible:ring-0 font-display"
          />
          <div className="flex items-center text-xs text-muted-foreground gap-1">
            <span>Permalink:</span>
            <span className="truncate">/{form.type === "page" ? "p" : "blog"}/</span>
            <Input
              value={form.slug}
              onChange={(e) => setF("slug", slugify(e.target.value))}
              placeholder={slugify(form.title) || "slug"}
              className="h-7 text-xs flex-1 max-w-xs"
            />
          </div>

          <RichTextEditor
            value={form.body}
            onChange={(html) => setF("body", html)}
            placeholder="Start writing your content…"
            onPickImage={async () => window.prompt("Image URL:") || null}
          />
        </div>
      </div>

      {/* SIDEBAR */}
      <aside className="space-y-3">
        <SideBlock title="Status & Visibility" defaultOpen>
          <Row label="Status">
            <Select value={form.status} onValueChange={(v: any) => setF("status", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="trash">Trash</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Publish">
            <Input type="datetime-local" className="h-8 text-xs"
              value={form.publish_date ? form.publish_date.slice(0, 16) : ""}
              onChange={(e) => setF("publish_date", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </Row>
          <Row label="URL Slug"><Input className="h-8 text-xs" value={form.slug} onChange={(e) => setF("slug", slugify(e.target.value))} /></Row>
          <Row label="Author"><Input className="h-8 text-xs" value={form.author} onChange={(e) => setF("author", e.target.value)} placeholder="Author name" /></Row>
          <Row label="Template">
            <Select value={form.template} onValueChange={(v) => setF("template", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default template</SelectItem>
                <SelectItem value="full-width">Full width</SelectItem>
                <SelectItem value="sidebar-left">Sidebar left</SelectItem>
                <SelectItem value="sidebar-right">Sidebar right</SelectItem>
                <SelectItem value="landing">Landing page</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          {form.type === "page" && (
            <Row label="Parent">
              <Select value={form.parent_id || "_none"} onValueChange={(v) => setF("parent_id", v === "_none" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {parentPages.filter((p) => p.id !== id).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title || p.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
          )}
          <Row label="Discussion">
            <Switch checked={form.discussion_open} onCheckedChange={(v) => setF("discussion_open", v)} />
          </Row>
          <Row label="Revisions"><Badge variant="outline" className="text-xs"><History className="w-3 h-3 mr-1" />{revisionCount}</Badge></Row>
          <Row label="Lock Modified Date">
            <Switch checked={form.lock_modified} onCheckedChange={(v) => setF("lock_modified", v)} />
          </Row>

          <div className="pt-2 flex items-center gap-2">
            {form.slug && (
              <Button asChild size="sm" variant="ghost">
                <a href={`/${form.type === "page" ? "p" : "blog"}/${fullSlug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" /> View
                </a>
              </Button>
            )}
            {!isNew && (
              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 ml-auto" onClick={() => save("trash")}>
                <Trash2 className="w-3 h-3 mr-1" /> Move to Bin
              </Button>
            )}
          </div>
        </SideBlock>

        {/* SEO Score card */}
        <button
          type="button"
          onClick={() => setSeoOpen(true)}
          className={`w-full ${colors.bg} ${colors.text} rounded-2xl p-4 text-left transition-transform hover:scale-[1.01]`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-80">SEO Score</div>
              <div className="text-2xl font-bold">{liveScore} / 100</div>
              <div className="text-xs opacity-90">{colors.label} — click to open SEO editor</div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </div>
        </button>

        {/* Focus keyword relevance badges */}
        {seo.focus_keyword && (
          <div className="bg-background border rounded-2xl p-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Focus keyword relevance</div>
            <div className="flex flex-wrap gap-1.5">
              {analyzeKeywords(seo.focus_keyword, {
                title: seo.seo_title || form.title,
                description: seo.seo_description || form.excerpt,
                slug: fullSlug,
                html: form.body,
              }).map((a) => (
                <span
                  key={a.keyword}
                  title={`${a.score}/100 — ${a.notes.join(" · ") || "Looks good"}`}
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${gradeClass(a.grade)}`}
                >
                  {a.keyword} · {a.score}
                </span>
              ))}
            </div>
          </div>
        )}

        <SideBlock title="Featured Image" defaultOpen>
          {form.featured_image_url ? (
            <div className="space-y-2">
              <img src={form.featured_image_url} alt="" className="w-full rounded-lg object-cover aspect-video" />
              <div className="flex gap-2">
                <label className="flex-1">
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <span><Upload className="w-3 h-3 mr-1" /> Replace</span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadFeatured(e.target.files[0])} />
                </label>
                <Button size="sm" variant="ghost" onClick={() => setF("featured_image_url", "")}>Remove</Button>
              </div>
            </div>
          ) : (
            <label className="block">
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50">
                <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground" />
                <div className="text-xs mt-1 text-muted-foreground">Click to upload</div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadFeatured(e.target.files[0])} />
            </label>
          )}
        </SideBlock>

        <SideBlock title="Excerpt">
          <Textarea rows={3} value={form.excerpt} onChange={(e) => setF("excerpt", e.target.value)} placeholder="Brief summary…" />
        </SideBlock>
      </aside>

      <SeoPanel
        open={seoOpen}
        onOpenChange={setSeoOpen}
        seo={seo}
        onChange={setSeo}
        siteUrl={typeof window !== "undefined" ? window.location.origin : ""}
        ctx={{
          title: form.title, slug: fullSlug, excerpt: form.excerpt, html: form.body,
          featured_image: form.featured_image_url,
          url: typeof window !== "undefined" ? `${window.location.origin}/${form.type === "page" ? "p" : "blog"}/${fullSlug}` : "/",
        }}
      />
    </div>
  );
};

function SideBlock({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="bg-background border rounded-2xl">
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 text-sm font-medium">
        {title}
        <ChevronDown className="w-4 h-4 transition-transform [&[data-state=open]>svg]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

export default AdminPostEditorWP;
