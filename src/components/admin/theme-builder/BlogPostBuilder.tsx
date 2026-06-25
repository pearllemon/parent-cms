import { useState, useEffect } from "react";
import { supabase } from "@/lib/parent";
import { Plus, Trash2, Edit2, Save, FileText, Eye, Columns, Share2, Bot, List, UserCircle, LayoutPanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface BlogTemplate {
  id: string;
  name: string;
  layout_style: string;
  sidebar_width_percent: number;
  content_max_width: number;
  show_feature_image: boolean;
  feature_image_style: string;
  show_publish_date: boolean;
  show_author: boolean;
  show_reading_time: boolean;
  show_social_shares: boolean;
  share_platforms: string[];
  show_ai_analyze: boolean;
  ai_platforms: string[];
  show_toc: boolean;
  toc_style: string;
  show_author_box: boolean;
  sidebar_widgets: { type: string; enabled: boolean }[];
  heading_font: string;
  body_font: string;
  accent_color: string;
  bg_color: string;
  text_color: string;
  category: string;
  is_default: boolean;
}

const defaultForm: Omit<BlogTemplate, "id"> = {
  name: "",
  layout_style: "sidebar-right",
  sidebar_width_percent: 30,
  content_max_width: 1200,
  show_feature_image: true,
  feature_image_style: "full-width",
  show_publish_date: true,
  show_author: true,
  show_reading_time: true,
  show_social_shares: true,
  share_platforms: ["facebook", "twitter", "linkedin"],
  show_ai_analyze: true,
  ai_platforms: ["chatgpt", "claude", "gemini"],
  show_toc: true,
  toc_style: "accordion",
  show_author_box: true,
  sidebar_widgets: [
    { type: "recent_posts", enabled: true },
    { type: "company_info", enabled: true },
    { type: "contact_form", enabled: true },
    { type: "ad_banner", enabled: false },
  ],
  heading_font: "",
  body_font: "",
  accent_color: "#f6b426",
  bg_color: "#ffffff",
  text_color: "#333333",
  category: "general",
  is_default: false,
};

const widgetLabels: Record<string, string> = {
  recent_posts: "Recent Posts",
  company_info: "Company Info",
  contact_form: "Contact Form",
  ad_banner: "Ad / Banner Slot",
};

const BlogPostBuilder = () => {
  const [templates, setTemplates] = useState<BlogTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<BlogTemplate, "id">>(defaultForm);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetch_ = async () => {
    const { data, error } = await supabase.from("blog_post_templates").select("*").order("created_at");
    if (error) { toast.error("Failed to load templates"); return; }
    setTemplates((data as unknown as BlogTemplate[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload = { ...form, sidebar_widgets: form.sidebar_widgets as any };
    if (editingId) {
      const { error } = await supabase.from("blog_post_templates").update(payload as any).eq("id", editingId);
      if (error) { toast.error("Update failed"); return; }
      toast.success("Template updated");
    } else {
      const { error } = await supabase.from("blog_post_templates").insert(payload as any);
      if (error) { toast.error("Create failed"); return; }
      toast.success("Template created");
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); fetch_();
  };

  const del = async (id: string) => {
    await supabase.from("blog_post_templates").delete().eq("id", id);
    toast.success("Deleted"); fetch_();
  };

  const startEdit = (t: BlogTemplate) => {
    const { id, ...rest } = t;
    setForm(rest); setEditingId(id); setShowForm(true);
  };

  const toggleWidget = (type: string) => {
    setForm({
      ...form,
      sidebar_widgets: form.sidebar_widgets.map(w =>
        w.type === type ? { ...w, enabled: !w.enabled } : w
      ),
    });
  };

  const togglePlatform = (list: string[], val: string): string[] =>
    list.includes(val) ? list.filter(p => p !== val) : [...list, val];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Design blog post templates — layout, sidebar, social shares, AI analysis, author box, and widgets.</p>
        <Button variant="pearl" size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}>
          <Plus className="w-3 h-3 mr-1" /> New Template
        </Button>
      </div>

      {showForm && (
        <div className="pearl-card p-5 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit" : "Create"} Blog Post Template</h3>

          {/* Basic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">Template Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g. seo, marketing" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Layout</label>
              <select value={form.layout_style} onChange={e => setForm({ ...form, layout_style: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="sidebar-right">Sidebar Right</option>
                <option value="sidebar-left">Sidebar Left</option>
                <option value="full-width">Full Width (No Sidebar)</option>
              </select></div>
          </div>

          {/* Layout dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">Sidebar Width %</label>
              <input type="number" value={form.sidebar_width_percent} onChange={e => setForm({ ...form, sidebar_width_percent: Number(e.target.value) })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" min={20} max={40} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Max Content Width (px)</label>
              <input type="number" value={form.content_max_width} onChange={e => setForm({ ...form, content_max_width: Number(e.target.value) })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Feature Image Style</label>
              <select value={form.feature_image_style} onChange={e => setForm({ ...form, feature_image_style: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="full-width">Full Width Hero</option>
                <option value="contained">Contained</option>
                <option value="rounded">Rounded Card</option>
              </select></div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Post Elements</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: "show_feature_image", label: "Feature Image" },
                { key: "show_publish_date", label: "Publish Date" },
                { key: "show_author", label: "Author Name" },
                { key: "show_reading_time", label: "Reading Time" },
                { key: "show_toc", label: "Table of Contents" },
                { key: "show_author_box", label: "Author Box" },
                { key: "show_social_shares", label: "Social Sharing" },
                { key: "show_ai_analyze", label: "AI Analysis Links" },
              ].map(t => (
                <label key={t.key} className="flex items-center gap-2 text-xs">
                  <Switch checked={(form as any)[t.key]} onCheckedChange={v => setForm({ ...form, [t.key]: v })} />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {/* Social platforms */}
          {form.show_social_shares && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1"><Share2 className="w-3 h-3" /> Share Platforms</h4>
              <div className="flex gap-2 flex-wrap">
                {["facebook", "twitter", "linkedin", "whatsapp", "email", "copy_link"].map(p => (
                  <button key={p} onClick={() => setForm({ ...form, share_platforms: togglePlatform(form.share_platforms, p) })}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${form.share_platforms.includes(p) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {p.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI platforms */}
          {form.show_ai_analyze && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1"><Bot className="w-3 h-3" /> AI Analysis Platforms</h4>
              <div className="flex gap-2 flex-wrap">
                {["chatgpt", "claude", "gemini", "perplexity", "copilot"].map(p => (
                  <button key={p} onClick={() => setForm({ ...form, ai_platforms: togglePlatform(form.ai_platforms, p) })}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${form.ai_platforms.includes(p) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TOC style */}
          {form.show_toc && (
            <div className="w-48">
              <label className="text-xs text-muted-foreground mb-1 block">TOC Style</label>
              <select value={form.toc_style} onChange={e => setForm({ ...form, toc_style: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="accordion">Accordion (Collapsed)</option>
                <option value="open">Always Open</option>
                <option value="sticky">Sticky Sidebar</option>
              </select>
            </div>
          )}

          {/* Sidebar widgets */}
          {form.layout_style !== "full-width" && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1"><LayoutPanelLeft className="w-3 h-3" /> Sidebar Widgets</h4>
              <div className="grid grid-cols-2 gap-3">
                {form.sidebar_widgets.map(w => (
                  <label key={w.type} className="flex items-center gap-2 text-xs">
                    <Switch checked={w.enabled} onCheckedChange={() => toggleWidget(w.type)} />
                    {widgetLabels[w.type] || w.type}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Styling */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Styling</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Heading Font</label>
                <input value={form.heading_font} onChange={e => setForm({ ...form, heading_font: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g. Playfair Display" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Body Font</label>
                <input value={form.body_font} onChange={e => setForm({ ...form, body_font: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g. Inter" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Accent</label>
                <div className="flex gap-2 items-center"><input type="color" value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer" /><span className="text-xs text-muted-foreground">{form.accent_color}</span></div></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Background</label>
                <div className="flex gap-2 items-center"><input type="color" value={form.bg_color} onChange={e => setForm({ ...form, bg_color: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer" /><span className="text-xs text-muted-foreground">{form.bg_color}</span></div></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Text</label>
                <div className="flex gap-2 items-center"><input type="color" value={form.text_color} onChange={e => setForm({ ...form, text_color: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer" /><span className="text-xs text-muted-foreground">{form.text_color}</span></div></div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <Switch checked={form.is_default} onCheckedChange={v => setForm({ ...form, is_default: v })} />
            Set as default template for new sites
          </label>

          <div className="flex gap-2">
            <Button variant="pearl" size="sm" onClick={save}><Save className="w-3 h-3 mr-1" /> Save</Button>
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(!previewOpen)}><Eye className="w-3 h-3 mr-1" /> {previewOpen ? "Hide" : "Show"} Preview</Button>
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Live preview */}
      {previewOpen && showForm && (
        <div className="pearl-card p-0 overflow-hidden">
          <div className="bg-muted/30 px-4 py-2 border-b border-border"><span className="text-xs font-medium text-muted-foreground">Live Preview</span></div>
          <div className="p-6" style={{ maxWidth: form.content_max_width, margin: "0 auto", background: form.bg_color, color: form.text_color }}>
            {/* Hero image */}
            {form.show_feature_image && (
              <div className={`mb-6 rounded-lg overflow-hidden bg-muted ${form.feature_image_style === "rounded" ? "rounded-2xl max-w-2xl mx-auto" : ""}`}>
                <div className="w-full h-48 bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-center">
                  <FileText className="w-12 h-12 text-muted-foreground/40" />
                </div>
              </div>
            )}

            <div className={`flex gap-8 ${form.layout_style === "sidebar-left" ? "flex-row-reverse" : ""}`}>
              {/* Main content */}
              <div className={form.layout_style === "full-width" ? "w-full" : `flex-1`}>
                <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: form.heading_font || "inherit" }}>Sample Blog Post Title</h1>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 flex-wrap">
                  {form.show_publish_date && <span>📅 April 7, 2026</span>}
                  {form.show_author && <span>✍️ John Doe</span>}
                  {form.show_reading_time && <span>⏱ 5 min read</span>}
                </div>

                {/* Social shares */}
                {form.show_social_shares && (
                  <div className="flex gap-2 mb-4">
                    {form.share_platforms.map(p => (
                      <span key={p} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold capitalize" style={{ background: form.accent_color, color: "#fff" }}>
                        {p[0].toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}

                {/* AI analyze */}
                {form.show_ai_analyze && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {form.ai_platforms.map(p => (
                      <span key={p} className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">Analyze on {p}</span>
                    ))}
                  </div>
                )}

                {/* TOC */}
                {form.show_toc && (
                  <div className="border border-border rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold mb-1">Table of Contents</p>
                    {form.toc_style === "accordion" && <p className="text-xs text-muted-foreground italic">▾ Click to expand</p>}
                    {form.toc_style !== "accordion" && (
                      <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc"><li>Introduction</li><li>Key Findings</li><li>Conclusion</li></ul>
                    )}
                  </div>
                )}

                {/* Content placeholder */}
                <div className="space-y-3 mb-6" style={{ fontFamily: form.body_font || "inherit" }}>
                  <div className="h-3 bg-muted rounded w-full" /><div className="h-3 bg-muted rounded w-11/12" /><div className="h-3 bg-muted rounded w-9/12" />
                  <div className="h-6" />
                  <div className="h-4 bg-muted/60 rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-full" /><div className="h-3 bg-muted rounded w-10/12" />
                </div>

                {/* Author box */}
                {form.show_author_box && (
                  <div className="border border-border rounded-xl p-4 flex gap-4 items-start">
                    <div className="w-16 h-16 rounded-full bg-muted flex-shrink-0 flex items-center justify-center"><UserCircle className="w-8 h-8 text-muted-foreground/40" /></div>
                    <div><p className="text-sm font-semibold">Author Name</p><p className="text-xs text-muted-foreground mt-1">A brief bio about the author with their expertise and background.</p></div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              {form.layout_style !== "full-width" && (
                <div className="space-y-4" style={{ width: `${form.sidebar_width_percent}%`, minWidth: 200 }}>
                  {form.sidebar_widgets.filter(w => w.enabled).map(w => (
                    <div key={w.type} className="border border-border rounded-lg p-3">
                      <p className="text-xs font-semibold mb-2">{widgetLabels[w.type]}</p>
                      {w.type === "recent_posts" && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-3 bg-muted rounded w-full" />)}</div>}
                      {w.type === "company_info" && <div className="h-3 bg-muted rounded w-3/4" />}
                      {w.type === "contact_form" && (
                        <div className="space-y-2">
                          {["Name", "Email", "Message"].map(f => <div key={f} className="h-8 bg-muted rounded w-full" />)}
                        </div>
                      )}
                      {w.type === "ad_banner" && <div className="h-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">Ad Space</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates list */}
      {loading ? <p className="text-sm text-muted-foreground text-center py-8">Loading...</p> : (
        <>
          {templates.length === 0 && !showForm && (
            <div className="text-center py-12"><FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No blog templates yet. Create your first one.</p></div>
          )}
          {templates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(t => (
                <div key={t.id} className="pearl-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{t.name}</h4>
                      {t.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Default</span>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startEdit(t)}><Edit2 className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={() => del(t.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">{t.layout_style}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">{t.category}</span>
                    {t.show_social_shares && <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">Social ✓</span>}
                    {t.show_ai_analyze && <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">AI ✓</span>}
                    {t.show_toc && <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">TOC ✓</span>}
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="w-4 h-4 rounded-full border" style={{ background: t.accent_color }} />
                    <div className="w-4 h-4 rounded-full border" style={{ background: t.bg_color }} />
                    <div className="w-4 h-4 rounded-full border" style={{ background: t.text_color }} />
                    <span className="text-[10px] text-muted-foreground ml-1">{t.sidebar_width_percent}% sidebar</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BlogPostBuilder;

