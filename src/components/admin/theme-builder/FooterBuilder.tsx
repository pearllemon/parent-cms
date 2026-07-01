import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Save, Eye, Code2, Upload, Copy, MapPin, Link2, Globe, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/parent";
import { toast } from "sonner";
import ImagePickerField from "../ImagePickerField";

interface FooterConfig {
  id: string;
  name: string;
  logo_url: string;
  logo_alt: string;
  description: string;
  copyright_text: string;
  company_info: string;
  map_embed_url: string;
  show_map: boolean;
  show_locations: boolean;
  show_form: boolean;
  form_heading: string;
  contact_set_id: string | null;
  theme_id: string | null;
  bg_color: string;
  text_color: string;
  accent_color: string;
  link_color: string;
}

interface FooterColumn { id: string; footer_config_id: string; heading: string; sort_order: number; }
interface FooterLink { id: string; column_id: string; label: string; href: string; sort_order: number; }
interface FooterSocialLink { id: string; footer_config_id: string; platform: string; url: string; sort_order: number; }
interface FooterLocation { id: string; footer_config_id: string; country: string; flag_emoji: string; cities: string[]; sort_order: number; }
interface FooterBottomLink { id: string; footer_config_id: string; label: string; href: string; sort_order: number; }

const socialPlatforms = ["YouTube", "Facebook", "Instagram", "X (Twitter)", "Pinterest", "LinkedIn", "TikTok"];

type Tab = "settings" | "columns" | "social" | "locations" | "bottom" | "json" | "preview";

const FooterBuilder = () => {
  const [configs, setConfigs] = useState<FooterConfig[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [columns, setColumns] = useState<FooterColumn[]>([]);
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [socialLinks, setSocialLinks] = useState<FooterSocialLink[]>([]);
  const [locations, setLocations] = useState<FooterLocation[]>([]);
  const [bottomLinks, setBottomLinks] = useState<FooterBottomLink[]>([]);
  const [contactSets, setContactSets] = useState<any[]>([]);
  const [phones, setPhones] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("settings");
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const active = configs.find(c => c.id === activeId);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, csRes, phRes] = await Promise.all([
        supabase.from("footer_configs").select("*").order("created_at"),
        supabase.from("contact_sets").select("*"),
        supabase.from("phone_numbers").select("*"),
      ]);

      if (cfgRes.error || csRes.error || phRes.error) {
        const error = cfgRes.error || csRes.error || phRes.error;
        console.error("Loader error:", error);
        if (error.message?.includes("relation") || error.message?.includes("cache") || error.message?.includes("schema") || error.code === "PGRST116" || error.code === "42P01") {
          setTableMissing(true);
        } else {
          toast.error("Failed to load footer builder data");
        }
        setLoading(false);
        return;
      }

      const cfgs = (cfgRes.data || []) as FooterConfig[];
      setConfigs(cfgs);
      setContactSets(csRes.data || []);
      setPhones(phRes.data || []);
      setTableMissing(false);

      if (cfgs.length > 0 && !activeId) {
        setActiveId(cfgs[0].id);
        await loadFooterData(cfgs[0].id);
      }
    } catch (err) {
      console.error(err);
      setTableMissing(true);
    } finally {
      setLoading(false);
    }
  };

  const loadFooterData = async (id: string) => {
    const [colRes, socRes, locRes, btmRes] = await Promise.all([
      supabase.from("footer_columns").select("*").eq("footer_config_id", id).order("sort_order"),
      supabase.from("footer_social_links").select("*").eq("footer_config_id", id).order("sort_order"),
      supabase.from("footer_locations").select("*").eq("footer_config_id", id).order("sort_order"),
      supabase.from("footer_bottom_links").select("*").eq("footer_config_id", id).order("sort_order"),
    ]);
    const cols = (colRes.data || []) as FooterColumn[];
    setColumns(cols);
    setSocialLinks((socRes.data || []) as FooterSocialLink[]);
    setLocations((locRes.data || []) as FooterLocation[]);
    setBottomLinks((btmRes.data || []) as FooterBottomLink[]);

    if (cols.length > 0) {
      const linkRes = await supabase.from("footer_links").select("*").in("column_id", cols.map(c => c.id)).order("sort_order");
      setLinks((linkRes.data || []) as FooterLink[]);
    } else {
      setLinks([]);
    }
  };

  const selectConfig = async (id: string) => {
    setActiveId(id);
    await loadFooterData(id);
  };

  const createConfig = async () => {
    const { data, error } = await supabase.from("footer_configs").insert({ name: `Footer ${configs.length + 1}` }).select().single();
    if (error) { toast.error(error.message); return; }
    setConfigs([...configs, data as FooterConfig]);
    setActiveId(data.id);
    setColumns([]); setLinks([]); setSocialLinks([]); setLocations([]); setBottomLinks([]);
    toast.success("Footer created");
  };

  const updateConfig = async (partial: Partial<FooterConfig>) => {
    if (!activeId) return;
    const { error } = await supabase.from("footer_configs").update(partial).eq("id", activeId);
    if (error) { toast.error(error.message); return; }
    setConfigs(configs.map(c => c.id === activeId ? { ...c, ...partial } : c));
  };

  const deleteConfig = async (id: string) => {
    await supabase.from("footer_configs").delete().eq("id", id);
    const next = configs.filter(c => c.id !== id);
    setConfigs(next);
    if (activeId === id) {
      if (next.length > 0) { selectConfig(next[0].id); } else { setActiveId(null); }
    }
    toast.success("Deleted");
  };

  // Column CRUD
  const addColumn = async () => {
    if (!activeId) return;
    const { data } = await supabase.from("footer_columns").insert({ footer_config_id: activeId, heading: "New Section", sort_order: columns.length }).select().single();
    if (data) setColumns([...columns, data as FooterColumn]);
  };

  const updateColumn = async (id: string, heading: string) => {
    await supabase.from("footer_columns").update({ heading }).eq("id", id);
    setColumns(columns.map(c => c.id === id ? { ...c, heading } : c));
  };

  const deleteColumn = async (id: string) => {
    await supabase.from("footer_columns").delete().eq("id", id);
    setColumns(columns.filter(c => c.id !== id));
    setLinks(links.filter(l => l.column_id !== id));
  };

  // Link CRUD
  const addLink = async (columnId: string) => {
    const colLinks = links.filter(l => l.column_id === columnId);
    const { data } = await supabase.from("footer_links").insert({ column_id: columnId, label: "New Link", href: "#", sort_order: colLinks.length }).select().single();
    if (data) setLinks([...links, data as FooterLink]);
  };

  const updateLink = async (id: string, partial: Partial<FooterLink>) => {
    await supabase.from("footer_links").update(partial).eq("id", id);
    setLinks(links.map(l => l.id === id ? { ...l, ...partial } : l));
  };

  const deleteLink = async (id: string) => {
    await supabase.from("footer_links").delete().eq("id", id);
    setLinks(links.filter(l => l.id !== id));
  };

  // Social CRUD
  const addSocial = async () => {
    if (!activeId) return;
    const { data } = await supabase.from("footer_social_links").insert({ footer_config_id: activeId, platform: "YouTube", url: "#", sort_order: socialLinks.length }).select().single();
    if (data) setSocialLinks([...socialLinks, data as FooterSocialLink]);
  };

  const updateSocial = async (id: string, partial: Partial<FooterSocialLink>) => {
    await supabase.from("footer_social_links").update(partial).eq("id", id);
    setSocialLinks(socialLinks.map(s => s.id === id ? { ...s, ...partial } : s));
  };

  const deleteSocial = async (id: string) => {
    await supabase.from("footer_social_links").delete().eq("id", id);
    setSocialLinks(socialLinks.filter(s => s.id !== id));
  };

  // Location CRUD
  const addLocation = async () => {
    if (!activeId) return;
    const { data } = await supabase.from("footer_locations").insert({ footer_config_id: activeId, country: "New Country", flag_emoji: "🏳️", cities: [], sort_order: locations.length }).select().single();
    if (data) setLocations([...locations, data as FooterLocation]);
  };

  const updateLocation = async (id: string, partial: Partial<FooterLocation>) => {
    await supabase.from("footer_locations").update(partial).eq("id", id);
    setLocations(locations.map(l => l.id === id ? { ...l, ...partial } : l));
  };

  const deleteLocation = async (id: string) => {
    await supabase.from("footer_locations").delete().eq("id", id);
    setLocations(locations.filter(l => l.id !== id));
  };

  // Bottom link CRUD
  const addBottomLink = async () => {
    if (!activeId) return;
    const { data } = await supabase.from("footer_bottom_links").insert({ footer_config_id: activeId, label: "New Link", href: "#", sort_order: bottomLinks.length }).select().single();
    if (data) setBottomLinks([...bottomLinks, data as FooterBottomLink]);
  };

  const updateBottomLink = async (id: string, partial: Partial<FooterBottomLink>) => {
    await supabase.from("footer_bottom_links").update(partial).eq("id", id);
    setBottomLinks(bottomLinks.map(l => l.id === id ? { ...l, ...partial } : l));
  };

  const deleteBottomLink = async (id: string) => {
    await supabase.from("footer_bottom_links").delete().eq("id", id);
    setBottomLinks(bottomLinks.filter(l => l.id !== id));
  };

  const activeContactSet = contactSets.find(cs => cs.id === active?.contact_set_id);
  const activePhones = phones.filter(p => p.contact_set_id === active?.contact_set_id);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "settings", label: "General", icon: <Globe className="w-3.5 h-3.5" /> },
    { id: "columns", label: "Link Columns", icon: <Link2 className="w-3.5 h-3.5" /> },
    { id: "social", label: "Social", icon: <Share2 className="w-3.5 h-3.5" /> },
    { id: "locations", label: "Locations", icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: "bottom", label: "Bottom Bar", icon: <GripVertical className="w-3.5 h-3.5" /> },
    { id: "json", label: "JSON", icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: "preview", label: "Preview", icon: <Eye className="w-3.5 h-3.5" /> },
  ];

  if (tableMissing) {
    return (
      <div className="pearl-card p-6 border-amber-500/30 bg-amber-500/5 text-amber-955 rounded-xl space-y-3">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-amber-700">
          ⚠️ Database Schema Configuration Needed
        </h3>
        <p className="text-sm leading-relaxed">
          The <code>footer_configs</code> or other required Theme Builder tables were not found in your database schema cache.
        </p>
        <p className="text-xs opacity-80">
          <strong>Resolution:</strong> Please execute the migration script located at <code>supabase/migrations/20260625123500_theme_builder_tables.sql</code> in your Supabase SQL Editor to provision the required database tables, then refresh the page.
        </p>
      </div>
    );
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading footer configs…</div>;

  return (
    <div className="space-y-6">
      {/* Config selector */}
      <div className="flex items-center gap-3 flex-wrap">
        {configs.map(c => (
          <button
            key={c.id}
            onClick={() => selectConfig(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              activeId === c.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.name}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={createConfig}><Plus className="w-3 h-3 mr-1" /> New Footer</Button>
      </div>

      {!active && <p className="text-sm text-muted-foreground">Create a footer configuration to get started.</p>}

      {active && (
        <div className="pearl-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <input
              value={active.name}
              onChange={e => updateConfig({ name: e.target.value })}
              className="text-base font-semibold bg-transparent border-none outline-none text-foreground"
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteConfig(active.id)}>
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* General Settings */}
          {tab === "settings" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Logo Alt Text</label>
                  <input value={active.logo_alt} onChange={e => updateConfig({ logo_alt: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <ImagePickerField label="Logo URL" value={active.logo_url} onChange={url => updateConfig({ logo_url: url })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <textarea value={active.description} onChange={e => updateConfig({ description: e.target.value })} rows={2} className="w-full rounded-lg border border-input bg-background p-3 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Copyright Text</label>
                  <input value={active.copyright_text} onChange={e => updateConfig({ copyright_text: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Company Info (VAT, Company No.)</label>
                  <input value={active.company_info} onChange={e => updateConfig({ company_info: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="Company Number: 10411490 | VAT: 252 7124 23" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Form Heading</label>
                <input value={active.form_heading} onChange={e => updateConfig({ form_heading: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Map Embed URL</label>
                <input value={active.map_embed_url} onChange={e => updateConfig({ map_embed_url: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="https://www.google.com/maps/embed?..." />
              </div>
              <div className="flex gap-6 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={active.show_form} onChange={e => updateConfig({ show_form: e.target.checked })} className="rounded" /> Show Contact Form
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={active.show_map} onChange={e => updateConfig({ show_map: e.target.checked })} className="rounded" /> Show Map
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={active.show_locations} onChange={e => updateConfig({ show_locations: e.target.checked })} className="rounded" /> Show Locations
                </label>
              </div>
              {/* Colors */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Footer Colors</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {([
                    { key: "bg_color", label: "Background" },
                    { key: "text_color", label: "Text" },
                    { key: "accent_color", label: "Accent" },
                    { key: "link_color", label: "Links" },
                  ] as const).map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">{label}</label>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded border border-border flex-shrink-0" style={{ backgroundColor: `hsl(${active[key]})` }} />
                        <input value={active[key]} onChange={e => updateConfig({ [key]: e.target.value })} className="h-7 w-full rounded border border-input bg-background px-1.5 text-[10px] font-mono" placeholder="H S% L%" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Contact Set */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Contact Set</label>
                <select
                  value={active.contact_set_id || ""}
                  onChange={e => updateConfig({ contact_set_id: e.target.value || null })}
                  className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">None</option>
                  {contactSets.map(cs => <option key={cs.id} value={cs.id}>{cs.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Columns Tab */}
          {tab === "columns" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Link Columns ({columns.length})</p>
                <Button variant="outline" size="sm" onClick={addColumn}><Plus className="w-3 h-3 mr-1" /> Add Column</Button>
              </div>
              {columns.map(col => (
                <div key={col.id} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input value={col.heading} onChange={e => updateColumn(col.id, e.target.value)} className="h-8 flex-1 rounded border border-input bg-background px-2 text-sm font-medium" />
                    <Button variant="ghost" size="sm" className="text-destructive h-8" onClick={() => deleteColumn(col.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                  <div className="space-y-2 pl-2">
                    {links.filter(l => l.column_id === col.id).map(link => (
                      <div key={link.id} className="flex items-center gap-2">
                        <input value={link.label} onChange={e => updateLink(link.id, { label: e.target.value })} className="h-7 flex-1 rounded border border-input bg-background px-2 text-xs" placeholder="Label" />
                        <input value={link.href} onChange={e => updateLink(link.id, { href: e.target.value })} className="h-7 flex-1 rounded border border-input bg-background px-2 text-xs font-mono" placeholder="/url" />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteLink(link.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => addLink(col.id)}><Plus className="w-3 h-3 mr-1" /> Add Link</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Social Tab */}
          {tab === "social" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Social Links ({socialLinks.length})</p>
                <Button variant="outline" size="sm" onClick={addSocial}><Plus className="w-3 h-3 mr-1" /> Add Social</Button>
              </div>
              {socialLinks.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <select value={s.platform} onChange={e => updateSocial(s.id, { platform: e.target.value })} className="h-8 rounded border border-input bg-background px-2 text-xs">
                    {socialPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input value={s.url} onChange={e => updateSocial(s.id, { url: e.target.value })} className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs font-mono" placeholder="https://..." />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteSocial(s.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          )}

          {/* Locations Tab */}
          {tab === "locations" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Locations ({locations.length})</p>
                <Button variant="outline" size="sm" onClick={addLocation}><Plus className="w-3 h-3 mr-1" /> Add Location</Button>
              </div>
              {locations.map(loc => (
                <div key={loc.id} className="flex items-center gap-2 flex-wrap">
                  <input value={loc.flag_emoji} onChange={e => updateLocation(loc.id, { flag_emoji: e.target.value })} className="h-8 w-12 rounded border border-input bg-background px-1 text-center text-sm" />
                  <input value={loc.country} onChange={e => updateLocation(loc.id, { country: e.target.value })} className="h-8 w-32 rounded border border-input bg-background px-2 text-xs" placeholder="Country" />
                  <input value={loc.cities.join(", ")} onChange={e => updateLocation(loc.id, { cities: e.target.value.split(",").map(c => c.trim()).filter(Boolean) })} className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs" placeholder="City1, City2, ..." />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteLocation(loc.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Bar Tab */}
          {tab === "bottom" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Bottom Bar Links ({bottomLinks.length})</p>
                <Button variant="outline" size="sm" onClick={addBottomLink}><Plus className="w-3 h-3 mr-1" /> Add Link</Button>
              </div>
              {bottomLinks.map(bl => (
                <div key={bl.id} className="flex items-center gap-2">
                  <input value={bl.label} onChange={e => updateBottomLink(bl.id, { label: e.target.value })} className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs" placeholder="Sitemap" />
                  <input value={bl.href} onChange={e => updateBottomLink(bl.id, { href: e.target.value })} className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs font-mono" placeholder="/sitemap" />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteBottomLink(bl.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          )}

          {/* JSON Tab */}
          {tab === "json" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Export or import footer configuration as JSON.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setJsonInput(JSON.stringify({ config: active, columns, links, socialLinks, locations, bottomLinks }, null, 2))}>
                  <Copy className="w-3 h-3 mr-1" /> Export
                </Button>
              </div>
              <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={14} className="w-full rounded-lg border border-input bg-background p-3 text-xs font-mono text-foreground resize-none" />
            </div>
          )}

          {/* Preview Tab */}
          {tab === "preview" && (
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: `hsl(${active.bg_color})`, color: `hsl(${active.text_color})` }}>
              <div className="max-w-6xl mx-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Col 1: Logo + Description + Columns */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: `hsl(${active.accent_color})` }}>{active.logo_alt}</h3>
                    <p className="text-xs mt-1 opacity-70">{active.description}</p>
                  </div>
                  {columns.map(col => (
                    <div key={col.id}>
                      <h4 className="text-sm font-semibold mb-2">{col.heading}</h4>
                      <div className="space-y-1">
                        {links.filter(l => l.column_id === col.id).map(link => (
                          <p key={link.id} className="text-xs cursor-pointer hover:underline" style={{ color: `hsl(${active.link_color})` }}>{link.label}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Col 2: Contact + Map */}
                <div className="space-y-4">
                  {activeContactSet && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Contact Details:</h4>
                      {activePhones.map((p: any) => (
                        <p key={p.id} className="text-xs" style={{ color: `hsl(${active.link_color})` }}>📞 {p.label}: {p.number}</p>
                      ))}
                      <p className="text-xs mt-1" style={{ color: `hsl(${active.accent_color})` }}>✉ {activeContactSet.email}</p>
                    </div>
                  )}
                  {active.show_map && active.map_embed_url && (
                    <div className="rounded-lg overflow-hidden h-32 bg-muted">
                      <iframe src={active.map_embed_url} width="100%" height="100%" style={{ border: 0 }} loading="lazy" />
                    </div>
                  )}
                </div>

                {/* Col 3: Form */}
                {active.show_form && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">{active.form_heading}</h4>
                    <input placeholder="Name" className="h-8 w-full rounded border border-white/20 bg-white/5 px-3 text-xs" />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Email" className="h-8 rounded border border-white/20 bg-white/5 px-3 text-xs" />
                      <input placeholder="Phone" className="h-8 rounded border border-white/20 bg-white/5 px-3 text-xs" />
                    </div>
                    <textarea placeholder="Message" rows={3} className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-xs resize-none" />
                    <button className="w-full h-9 rounded text-sm font-semibold" style={{ backgroundColor: `hsl(${active.accent_color})`, color: `hsl(${active.bg_color})` }}>Send</button>
                  </div>
                )}
              </div>

              {/* Locations */}
              {active.show_locations && locations.length > 0 && (
                <div className="border-t border-white/10 px-8 py-4">
                  <div className="flex gap-4 flex-wrap justify-center">
                    {locations.map(loc => (
                      <span key={loc.id} className="text-xs">{loc.flag_emoji} {loc.country}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social + Bottom */}
              {socialLinks.length > 0 && (
                <div className="flex justify-center gap-4 py-4">
                  {socialLinks.map(s => (
                    <span key={s.id} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">{s.platform}</span>
                  ))}
                </div>
              )}

              <div className="border-t border-white/10 px-8 py-3 flex items-center justify-between text-[10px] opacity-60 flex-wrap gap-2">
                <span>{active.copyright_text} {active.company_info && `| ${active.company_info}`}</span>
                <div className="flex gap-3">
                  {bottomLinks.map(bl => (
                    <span key={bl.id} className="hover:underline cursor-pointer">{bl.label}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FooterBuilder;

