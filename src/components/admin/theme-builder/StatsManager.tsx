import { useState, useEffect } from "react";
import { supabase } from "@/lib/parent";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Save, Eye, ArrowLeft, TrendingUp } from "lucide-react";

interface StatsConfig {
  id: string; name: string; heading: string; subheading: string;
  theme_mode: string; accent_color: string; bg_color: string; text_color: string;
  layout_style: string; show_description: boolean; show_cta: boolean;
  cta_text: string; cta_link: string; is_global: boolean; site_id: string | null;
}

interface StatItem {
  id: string; config_id: string; value: string; label: string;
  description: string; icon_name: string; sort_order: number;
}

const StatsManager = () => {
  const [configs, setConfigs] = useState<StatsConfig[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [activeConfig, setActiveConfig] = useState<StatsConfig | null>(null);
  const [items, setItems] = useState<StatItem[]>([]);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editConfigId, setEditConfigId] = useState<string | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [configForm, setConfigForm] = useState({
    name: "Stats Section", heading: "We only deliver results.", subheading: "We don't use excuses of something. Okay maybe sometimes.",
    theme_mode: "light", accent_color: "#000000", bg_color: "#ffffff", text_color: "#000000",
    layout_style: "grid", show_description: true, show_cta: false, cta_text: "Get Started", cta_link: "#",
    is_global: true, site_id: "",
  });

  const [itemForm, setItemForm] = useState({ value: "", label: "", description: "", icon_name: "" });

  const fetchConfigs = async () => {
    const [r1, r2] = await Promise.all([
      supabase.from("stats_configs").select("*").order("created_at", { ascending: false }),
      supabase.from("sites").select("id, name"),
    ]);
    setConfigs(r1.data || []);
    setSites(r2.data || []);
  };

  const fetchItems = async (configId: string) => {
    const { data } = await supabase.from("stats_items").select("*").eq("config_id", configId).order("sort_order");
    setItems(data || []);
  };

  useEffect(() => { fetchConfigs(); }, []);
  useEffect(() => { if (activeConfig) fetchItems(activeConfig.id); }, [activeConfig]);

  const saveConfig = async () => {
    if (!configForm.name.trim()) { toast.error("Name required"); return; }
    const payload = { ...configForm, site_id: configForm.is_global ? null : (configForm.site_id || null) };
    if (editConfigId) {
      await supabase.from("stats_configs").update(payload).eq("id", editConfigId);
      toast.success("Updated");
    } else {
      const { data } = await supabase.from("stats_configs").insert(payload).select().single();
      if (data) setActiveConfig(data as StatsConfig);
      toast.success("Created");
    }
    setShowConfigForm(false); setEditConfigId(null); fetchConfigs();
  };

  const deleteConfig = async (id: string) => {
    await supabase.from("stats_configs").delete().eq("id", id);
    toast.success("Deleted"); if (activeConfig?.id === id) setActiveConfig(null); fetchConfigs();
  };

  const saveItem = async () => {
    if (!itemForm.value.trim() || !itemForm.label.trim()) { toast.error("Value and label required"); return; }
    if (editItemId) {
      await supabase.from("stats_items").update(itemForm).eq("id", editItemId);
      toast.success("Updated");
    } else {
      await supabase.from("stats_items").insert({ ...itemForm, config_id: activeConfig!.id, sort_order: items.length });
      toast.success("Added");
    }
    setShowItemForm(false); setEditItemId(null);
    setItemForm({ value: "", label: "", description: "", icon_name: "" });
    fetchItems(activeConfig!.id);
  };

  const deleteItem = async (id: string) => {
    await supabase.from("stats_items").delete().eq("id", id);
    toast.success("Deleted"); fetchItems(activeConfig!.id);
  };

  const startEditConfig = (c: StatsConfig) => {
    setConfigForm({ ...c, site_id: c.site_id || "" });
    setEditConfigId(c.id); setShowConfigForm(true);
  };

  // ── Config List ──
  if (!activeConfig && !showConfigForm) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Create stats/metrics sections with big numbers — assign to child sites</p>
          <Button variant="pearl" size="sm" onClick={() => {
            setConfigForm({ name: "Stats Section", heading: "We only deliver results.", subheading: "", theme_mode: "light", accent_color: "#000000", bg_color: "#ffffff", text_color: "#000000", layout_style: "grid", show_description: true, show_cta: false, cta_text: "Get Started", cta_link: "#", is_global: true, site_id: "" });
            setEditConfigId(null); setShowConfigForm(true);
          }}><Plus className="w-3 h-3 mr-1" /> New Stats Section</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map(c => (
            <div key={c.id} className="pearl-card p-4 space-y-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => setActiveConfig(c)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">{c.layout_style}</span>
                  {c.is_global && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">GLOBAL</span>}
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditConfig(c)}><Edit2 className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => deleteConfig(c.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.heading}</p>
            </div>
          ))}
          {configs.length === 0 && <p className="col-span-full text-center py-8 text-sm text-muted-foreground">No stats sections yet</p>}
        </div>
      </div>
    );
  }

  // ── Config Form ──
  if (showConfigForm) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setShowConfigForm(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="pearl-card p-5 space-y-4">
          <h3 className="text-base font-semibold">{editConfigId ? "Edit" : "New"} Stats Section</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Name *</label>
              <input value={configForm.name} onChange={e => setConfigForm({ ...configForm, name: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Layout</label>
              <select value={configForm.layout_style} onChange={e => setConfigForm({ ...configForm, layout_style: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="grid">Grid (equal columns)</option><option value="hero">Hero (big number + grid)</option><option value="banner">Banner (inline)</option>
              </select></div>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Heading</label>
            <input value={configForm.heading} onChange={e => setConfigForm({ ...configForm, heading: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Subheading</label>
            <input value={configForm.subheading} onChange={e => setConfigForm({ ...configForm, subheading: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Background</label>
              <div className="flex gap-2"><input type="color" value={configForm.bg_color} onChange={e => setConfigForm({ ...configForm, bg_color: e.target.value })} className="w-9 h-9 rounded border border-input cursor-pointer" />
                <input value={configForm.bg_color} onChange={e => setConfigForm({ ...configForm, bg_color: e.target.value })} className="h-9 flex-1 rounded border border-input bg-background px-2 text-xs font-mono" /></div></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Text Color</label>
              <div className="flex gap-2"><input type="color" value={configForm.text_color} onChange={e => setConfigForm({ ...configForm, text_color: e.target.value })} className="w-9 h-9 rounded border border-input cursor-pointer" />
                <input value={configForm.text_color} onChange={e => setConfigForm({ ...configForm, text_color: e.target.value })} className="h-9 flex-1 rounded border border-input bg-background px-2 text-xs font-mono" /></div></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Accent</label>
              <div className="flex gap-2"><input type="color" value={configForm.accent_color} onChange={e => setConfigForm({ ...configForm, accent_color: e.target.value })} className="w-9 h-9 rounded border border-input cursor-pointer" />
                <input value={configForm.accent_color} onChange={e => setConfigForm({ ...configForm, accent_color: e.target.value })} className="h-9 flex-1 rounded border border-input bg-background px-2 text-xs font-mono" /></div></div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs"><Switch checked={configForm.show_description} onCheckedChange={v => setConfigForm({ ...configForm, show_description: v })} /> Show Descriptions</label>
            <label className="flex items-center gap-2 text-xs"><Switch checked={configForm.show_cta} onCheckedChange={v => setConfigForm({ ...configForm, show_cta: v })} /> Show CTA Button</label>
          </div>
          {configForm.show_cta && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">CTA Text</label>
                <input value={configForm.cta_text} onChange={e => setConfigForm({ ...configForm, cta_text: e.target.value })} className="h-9 w-full rounded border border-input bg-background px-3 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">CTA Link</label>
                <input value={configForm.cta_link} onChange={e => setConfigForm({ ...configForm, cta_link: e.target.value })} className="h-9 w-full rounded border border-input bg-background px-3 text-sm" /></div>
            </div>
          )}
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2 text-xs"><Switch checked={configForm.is_global} onCheckedChange={v => setConfigForm({ ...configForm, is_global: v })} /> Global</label>
            {!configForm.is_global && (
              <select value={configForm.site_id} onChange={e => setConfigForm({ ...configForm, site_id: e.target.value })} className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
                <option value="">Select site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="pearl" size="sm" onClick={saveConfig}><Save className="w-3 h-3 mr-1" /> Save</Button>
            <Button variant="outline" size="sm" onClick={() => setShowConfigForm(false)}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detail View ──
  const cfg = activeConfig!;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => { setActiveConfig(null); setPreviewMode(false); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Stats Sections
        </button>
        <div className="flex gap-2">
          <Button variant={previewMode ? "pearl" : "outline"} size="sm" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="w-3 h-3 mr-1" /> {previewMode ? "Close Preview" : "Preview"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => startEditConfig(cfg)}>
            <Edit2 className="w-3 h-3 mr-1" /> Edit Config
          </Button>
        </div>
      </div>

      {/* Preview */}
      {previewMode && (
        <div className="rounded-xl border border-border overflow-hidden" style={{ backgroundColor: cfg.bg_color, color: cfg.text_color }}>
          <div className="p-8 md:p-12">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">{cfg.heading}</h2>
              {cfg.subheading && <p className="text-sm opacity-60">{cfg.subheading}</p>}
            </div>
            {cfg.layout_style === "hero" && items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col justify-center">
                  <span className="text-5xl md:text-7xl font-black">{items[0].value}</span>
                  <span className="text-sm opacity-60 mt-1">{items[0].label}</span>
                  {cfg.show_description && items[0].description && <p className="text-xs opacity-40 mt-1">{items[0].description}</p>}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {items.slice(1).map(item => (
                    <div key={item.id}>
                      <span className="text-2xl md:text-3xl font-bold">{item.value}</span>
                      <p className="text-xs opacity-60 mt-0.5">{item.label}</p>
                      {cfg.show_description && item.description && <p className="text-[10px] opacity-40 mt-0.5">{item.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`grid gap-6 ${items.length <= 2 ? "grid-cols-2" : items.length === 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
                {items.map(item => (
                  <div key={item.id} className="text-center md:text-left">
                    <span className="text-3xl md:text-4xl font-black">{item.value}</span>
                    <p className="text-xs opacity-60 mt-1">{item.label}</p>
                    {cfg.show_description && item.description && <p className="text-[10px] opacity-40 mt-1 leading-relaxed">{item.description}</p>}
                  </div>
                ))}
              </div>
            )}
            {cfg.show_cta && (
              <div className="mt-8">
                <button className="px-6 py-2.5 rounded-full text-sm font-semibold" style={{ backgroundColor: cfg.accent_color, color: cfg.bg_color }}>{cfg.cta_text}</button>
              </div>
            )}
            {items.length === 0 && <p className="text-center py-12 opacity-50 text-sm">Add stats to see the preview</p>}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Stats ({items.length})</h4>
        <Button variant="pearl" size="sm" onClick={() => {
          setItemForm({ value: "", label: "", description: "", icon_name: "" });
          setEditItemId(null); setShowItemForm(true);
        }}><Plus className="w-3 h-3 mr-1" /> Add Stat</Button>
      </div>

      {showItemForm && (
        <div className="pearl-card p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Value * (e.g. 420%, $1.72B)</label>
              <input value={itemForm.value} onChange={e => setItemForm({ ...itemForm, value: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm font-bold" placeholder="420%" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Label *</label>
              <input value={itemForm.label} onChange={e => setItemForm({ ...itemForm, label: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g. More Speed" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
            <input value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="Short description text" /></div>
          <div className="flex gap-2">
            <Button variant="pearl" size="sm" onClick={saveItem}><Save className="w-3 h-3 mr-1" /> Save</Button>
            <Button variant="outline" size="sm" onClick={() => { setShowItemForm(false); setEditItemId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.id} className="pearl-card p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-xl font-black text-foreground">{item.value}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              {item.description && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{item.description}</p>}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                setItemForm({ value: item.value, label: item.label, description: item.description, icon_name: item.icon_name });
                setEditItemId(item.id); setShowItemForm(true);
              }}><Edit2 className="w-3 h-3" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => deleteItem(item.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
        {items.length === 0 && !showItemForm && <p className="col-span-full text-center py-8 text-sm text-muted-foreground">No stats yet</p>}
      </div>
    </div>
  );
};

export default StatsManager;

