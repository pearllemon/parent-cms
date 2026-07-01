import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/parent";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit2, Save, Star, ChevronLeft, ChevronRight,
  Eye, ArrowLeft, Copy
} from "lucide-react";
import ImagePickerField from "../ImagePickerField";

interface TestimonialConfig {
  id: string; name: string; heading: string; subheading: string;
  theme_mode: string; accent_color: string; bg_color: string; text_color: string;
  auto_play: boolean; auto_play_interval: number; cards_per_view: number;
  show_rating: boolean; show_avatar: boolean; show_arrows: boolean; show_dots: boolean;
  is_global: boolean; site_id: string | null;
}

interface TestimonialItem {
  id: string; config_id: string; quote: string; author_name: string;
  author_role: string; author_image_url: string; rating: number; sort_order: number;
}

const TestimonialsManager = () => {
  const [configs, setConfigs] = useState<TestimonialConfig[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [activeConfig, setActiveConfig] = useState<TestimonialConfig | null>(null);
  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editConfigId, setEditConfigId] = useState<string | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [configForm, setConfigForm] = useState({
    name: "Testimonials", heading: "Testimonial", subheading: "Don't just take our word for it - see what actual users of our service have to say about their experience.",
    theme_mode: "dark", accent_color: "#a855f7", bg_color: "#1a1a2e", text_color: "#ffffff",
    auto_play: true, auto_play_interval: 5000, cards_per_view: 3,
    show_rating: true, show_avatar: true, show_arrows: true, show_dots: true,
    is_global: true, site_id: "",
  });

  const [itemForm, setItemForm] = useState({
    quote: "", author_name: "", author_role: "", author_image_url: "", rating: 5,
  });

  const fetchConfigs = async () => {
    const [r1, r2] = await Promise.all([
      supabase.from("testimonial_configs").select("*").order("created_at", { ascending: false }),
      supabase.from("sites").select("id, name"),
    ]);
    setConfigs(r1.data || []);
    setSites(r2.data || []);
  };

  const fetchItems = async (configId: string) => {
    const { data } = await supabase.from("testimonial_items").select("*").eq("config_id", configId).order("sort_order");
    setItems(data || []);
  };

  useEffect(() => { fetchConfigs(); }, []);

  useEffect(() => {
    if (activeConfig) fetchItems(activeConfig.id);
  }, [activeConfig]);

  const saveConfig = async () => {
    if (!configForm.name.trim()) { toast.error("Name required"); return; }
    const payload = { ...configForm, site_id: configForm.is_global ? null : (configForm.site_id || null) };
    if (editConfigId) {
      await supabase.from("testimonial_configs").update(payload).eq("id", editConfigId);
      toast.success("Config updated");
    } else {
      const { data } = await supabase.from("testimonial_configs").insert(payload).select().single();
      if (data) setActiveConfig(data as TestimonialConfig);
      toast.success("Config created");
    }
    setShowConfigForm(false); setEditConfigId(null); fetchConfigs();
  };

  const deleteConfig = async (id: string) => {
    await supabase.from("testimonial_configs").delete().eq("id", id);
    toast.success("Deleted"); if (activeConfig?.id === id) setActiveConfig(null); fetchConfigs();
  };

  const saveItem = async () => {
    if (!itemForm.quote.trim() || !itemForm.author_name.trim()) { toast.error("Quote and author required"); return; }
    if (editItemId) {
      await supabase.from("testimonial_items").update(itemForm).eq("id", editItemId);
      toast.success("Updated");
    } else {
      await supabase.from("testimonial_items").insert({ ...itemForm, config_id: activeConfig!.id, sort_order: items.length });
      toast.success("Added");
    }
    setShowItemForm(false); setEditItemId(null);
    setItemForm({ quote: "", author_name: "", author_role: "", author_image_url: "", rating: 5 });
    fetchItems(activeConfig!.id);
  };

  const deleteItem = async (id: string) => {
    await supabase.from("testimonial_items").delete().eq("id", id);
    toast.success("Deleted"); fetchItems(activeConfig!.id);
  };

  const startEditConfig = (c: TestimonialConfig) => {
    setConfigForm({ ...c, site_id: c.site_id || "" });
    setEditConfigId(c.id); setShowConfigForm(true);
  };

  const startEditItem = (item: TestimonialItem) => {
    setItemForm({ quote: item.quote, author_name: item.author_name, author_role: item.author_role, author_image_url: item.author_image_url, rating: item.rating });
    setEditItemId(item.id); setShowItemForm(true);
  };

  const cardsToShow = previewDevice === "mobile" ? 1 : previewDevice === "tablet" ? 2 : (activeConfig?.cards_per_view || 3);
  const maxIndex = Math.max(0, items.length - cardsToShow);

  // Auto-play
  useEffect(() => {
    if (!previewMode || !activeConfig?.auto_play || items.length <= cardsToShow) return;
    const timer = setInterval(() => {
      setCarouselIndex(i => i >= maxIndex ? 0 : i + 1);
    }, activeConfig.auto_play_interval);
    return () => clearInterval(timer);
  }, [previewMode, activeConfig, items.length, cardsToShow, maxIndex]);

  // ── Config List View ──
  if (!activeConfig && !showConfigForm) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Create testimonial carousels — assign to any child site or keep global</p>
          <Button variant="pearl" size="sm" onClick={() => {
            setConfigForm({ name: "Testimonials", heading: "Testimonial", subheading: "Don't just take our word for it - see what actual users of our service have to say about their experience.", theme_mode: "dark", accent_color: "#a855f7", bg_color: "#1a1a2e", text_color: "#ffffff", auto_play: true, auto_play_interval: 5000, cards_per_view: 3, show_rating: true, show_avatar: true, show_arrows: true, show_dots: true, is_global: true, site_id: "" });
            setEditConfigId(null); setShowConfigForm(true);
          }}><Plus className="w-3 h-3 mr-1" /> New Testimonial Section</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map(c => (
            <div key={c.id} className="pearl-card p-4 space-y-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => { setActiveConfig(c); setCarouselIndex(0); }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.accent_color }} />
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">{c.theme_mode}</span>
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
          {configs.length === 0 && <p className="col-span-full text-center py-8 text-sm text-muted-foreground">No testimonial sections yet</p>}
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
          <h3 className="text-base font-semibold">{editConfigId ? "Edit" : "New"} Testimonial Section</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Name *</label>
              <input value={configForm.name} onChange={e => setConfigForm({ ...configForm, name: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Theme Mode</label>
              <select value={configForm.theme_mode} onChange={e => setConfigForm({ ...configForm, theme_mode: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="dark">Dark</option><option value="light">Light</option>
              </select></div>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Heading</label>
            <input value={configForm.heading} onChange={e => setConfigForm({ ...configForm, heading: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Subheading</label>
            <textarea value={configForm.subheading} onChange={e => setConfigForm({ ...configForm, subheading: e.target.value })} rows={2} className="w-full rounded-lg border border-input bg-background p-3 text-sm resize-none" /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Accent Color</label>
              <div className="flex gap-2"><input type="color" value={configForm.accent_color} onChange={e => setConfigForm({ ...configForm, accent_color: e.target.value })} className="w-9 h-9 rounded border border-input cursor-pointer" />
                <input value={configForm.accent_color} onChange={e => setConfigForm({ ...configForm, accent_color: e.target.value })} className="h-9 flex-1 rounded border border-input bg-background px-2 text-xs font-mono" /></div></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Background</label>
              <div className="flex gap-2"><input type="color" value={configForm.bg_color} onChange={e => setConfigForm({ ...configForm, bg_color: e.target.value })} className="w-9 h-9 rounded border border-input cursor-pointer" />
                <input value={configForm.bg_color} onChange={e => setConfigForm({ ...configForm, bg_color: e.target.value })} className="h-9 flex-1 rounded border border-input bg-background px-2 text-xs font-mono" /></div></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Text Color</label>
              <div className="flex gap-2"><input type="color" value={configForm.text_color} onChange={e => setConfigForm({ ...configForm, text_color: e.target.value })} className="w-9 h-9 rounded border border-input cursor-pointer" />
                <input value={configForm.text_color} onChange={e => setConfigForm({ ...configForm, text_color: e.target.value })} className="h-9 flex-1 rounded border border-input bg-background px-2 text-xs font-mono" /></div></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Cards Per View</label>
              <input type="number" min={1} max={5} value={configForm.cards_per_view} onChange={e => setConfigForm({ ...configForm, cards_per_view: parseInt(e.target.value) || 3 })} className="h-9 w-full rounded border border-input bg-background px-3 text-sm" /></div>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { key: "auto_play", label: "Auto-play" }, { key: "show_rating", label: "Show Rating" },
              { key: "show_avatar", label: "Show Avatar" }, { key: "show_arrows", label: "Show Arrows" },
              { key: "show_dots", label: "Show Dots" },
            ].map(f => (
              <label key={f.key} className="flex items-center gap-2 text-xs">
                <Switch checked={(configForm as any)[f.key]} onCheckedChange={v => setConfigForm({ ...configForm, [f.key]: v })} />
                {f.label}
              </label>
            ))}
          </div>
          {configForm.auto_play && (
            <div><label className="text-xs text-muted-foreground mb-1 block">Auto-play Interval (ms)</label>
              <input type="number" min={1000} step={500} value={configForm.auto_play_interval} onChange={e => setConfigForm({ ...configForm, auto_play_interval: parseInt(e.target.value) || 5000 })} className="h-9 w-48 rounded border border-input bg-background px-3 text-sm" /></div>
          )}
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={configForm.is_global} onCheckedChange={v => setConfigForm({ ...configForm, is_global: v })} /> Global (all sites)
            </label>
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

  // ── Active Config Detail + Items + Preview ──
  const cfg = activeConfig!;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => { setActiveConfig(null); setPreviewMode(false); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Testimonial Sections
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

      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cfg.accent_color }} />
        <h3 className="text-lg font-bold">{cfg.name}</h3>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">{cfg.theme_mode}</span>
        {cfg.is_global && <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">GLOBAL</span>}
      </div>

      {/* ── PREVIEW ── */}
      {previewMode && (
        <div className="space-y-2">
          <div className="flex gap-2 justify-center">
            {(["desktop", "tablet", "mobile"] as const).map(d => (
              <button key={d} onClick={() => { setPreviewDevice(d); setCarouselIndex(0); }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize ${previewDevice === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {d}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-border overflow-hidden mx-auto transition-all"
            style={{
              maxWidth: previewDevice === "mobile" ? 375 : previewDevice === "tablet" ? 768 : "100%",
              backgroundColor: cfg.bg_color, color: cfg.text_color,
            }}>
            <div className="p-8 md:p-12">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl md:text-4xl font-bold mb-2" style={{
                    background: `linear-gradient(135deg, ${cfg.accent_color}, ${cfg.text_color})`,
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>{cfg.heading}</h2>
                  {cfg.subheading && <p className="text-sm opacity-70 max-w-lg">{cfg.subheading}</p>}
                </div>
                {cfg.show_arrows && items.length > cardsToShow && (
                  <div className="flex gap-2">
                    <button onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                      className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-white/10 transition-colors"
                      style={{ borderColor: `${cfg.text_color}30` }}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCarouselIndex(Math.min(maxIndex, carouselIndex + 1))}
                      className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-white/10 transition-colors"
                      style={{ borderColor: `${cfg.text_color}30` }}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <div className="flex transition-transform duration-500 ease-in-out" style={{
                  transform: `translateX(-${carouselIndex * (100 / cardsToShow)}%)`,
                  gap: "1rem",
                }}>
                  {items.map(item => (
                    <div key={item.id} className="flex-shrink-0 rounded-xl p-6 flex flex-col justify-between"
                      style={{
                        width: `calc(${100 / cardsToShow}% - ${(cardsToShow - 1) / cardsToShow}rem)`,
                        backgroundColor: `${cfg.text_color}08`,
                        border: `1px solid ${cfg.text_color}15`,
                      }}>
                      <p className="text-sm leading-relaxed mb-4 opacity-90">"{item.quote}"</p>
                      {cfg.show_rating && (
                        <div className="flex gap-0.5 mb-4">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className="w-4 h-4" fill={s <= item.rating ? "#f59e0b" : "none"} stroke={s <= item.rating ? "#f59e0b" : `${cfg.text_color}40`} />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {cfg.show_avatar && item.author_image_url && (
                          <img src={item.author_image_url} alt={item.author_name} className="w-10 h-10 rounded-full object-cover" />
                        )}
                        {cfg.show_avatar && !item.author_image_url && (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${cfg.accent_color}30`, color: cfg.accent_color }}>
                            {item.author_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold">{item.author_name}</p>
                          {item.author_role && <p className="text-xs opacity-60">{item.author_role}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {cfg.show_dots && items.length > cardsToShow && (
                <div className="flex justify-center gap-2 mt-6">
                  {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                    <button key={i} onClick={() => setCarouselIndex(i)}
                      className="w-2.5 h-2.5 rounded-full transition-colors"
                      style={{ backgroundColor: i === carouselIndex ? cfg.accent_color : `${cfg.text_color}30` }} />
                  ))}
                </div>
              )}
              {items.length === 0 && <p className="text-center py-12 opacity-50 text-sm">Add testimonials to see the preview</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Items Management ── */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Testimonials ({items.length})</h4>
        <Button variant="pearl" size="sm" onClick={() => {
          setItemForm({ quote: "", author_name: "", author_role: "", author_image_url: "", rating: 5 });
          setEditItemId(null); setShowItemForm(true);
        }}><Plus className="w-3 h-3 mr-1" /> Add Testimonial</Button>
      </div>

      {showItemForm && (
        <div className="pearl-card p-4 space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">Quote *</label>
            <textarea value={itemForm.quote} onChange={e => setItemForm({ ...itemForm, quote: e.target.value })} rows={3} className="w-full rounded-lg border border-input bg-background p-3 text-sm resize-none" placeholder="What the customer said..." /></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Author Name *</label>
              <input value={itemForm.author_name} onChange={e => setItemForm({ ...itemForm, author_name: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Role / Title</label>
              <input value={itemForm.author_role} onChange={e => setItemForm({ ...itemForm, author_role: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g. Creative Director" /></div>
            <ImagePickerField label="Author Image URL" value={itemForm.author_image_url} onChange={url => setItemForm({ ...itemForm, author_image_url: url })} />
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setItemForm({ ...itemForm, rating: s })} className="p-0.5">
                  <Star className="w-5 h-5" fill={s <= itemForm.rating ? "#f59e0b" : "none"} stroke={s <= itemForm.rating ? "#f59e0b" : "currentColor"} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="pearl" size="sm" onClick={saveItem}><Save className="w-3 h-3 mr-1" /> Save</Button>
            <Button variant="outline" size="sm" onClick={() => { setShowItemForm(false); setEditItemId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id} className="pearl-card p-4 flex items-start gap-4">
            {cfg.show_avatar && (
              item.author_image_url
                ? <img src={item.author_image_url} alt={item.author_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">{item.author_name.charAt(0)}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground line-clamp-2">"{item.quote}"</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold">{item.author_name}</span>
                {item.author_role && <span className="text-xs text-muted-foreground">· {item.author_role}</span>}
                <div className="flex gap-0.5 ml-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="w-3 h-3" fill={s <= item.rating ? "#f59e0b" : "none"} stroke={s <= item.rating ? "#f59e0b" : "currentColor"} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditItem(item)}><Edit2 className="w-3 h-3" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => deleteItem(item.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
        {items.length === 0 && !showItemForm && <p className="text-center py-8 text-sm text-muted-foreground">No testimonials yet — add your first one above</p>}
      </div>
    </div>
  );
};

export default TestimonialsManager;

