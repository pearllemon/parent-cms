import { useState, useEffect } from "react";
import { supabase } from "@/lib/parent";
import { Plus, Trash2, Edit2, Eye, Save, MessageCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ImagePickerField from "../ImagePickerField";

interface PopupConfig {
  id: string;
  name: string;
  category: string;
  heading: string;
  description: string;
  image_url: string;
  cta_text: string;
  cta_link: string;
  dismiss_text: string;
  bg_color: string;
  text_color: string;
  accent_color: string;
  border_radius: string;
  trigger_type: string;
  trigger_delay_seconds: number;
  show_once_per_session: boolean;
  is_active: boolean;
}

interface PopupEvent {
  popup_id: string;
  event_type: string;
}

const defaultForm: Omit<PopupConfig, "id"> = {
  name: "",
  category: "general",
  heading: "Missing Out on SEO? It's Time to Catch Up and Take the Lead",
  description: "Don't miss out on the opportunity to rank higher. Your competitors are optimizing their SEO—why aren't you?",
  image_url: "",
  cta_text: "Yes, Let's Get Started!",
  cta_link: "#",
  dismiss_text: "Thanks, I'll Be Back Later!",
  bg_color: "0 0% 100%",
  text_color: "0 0% 15%",
  accent_color: "46 100% 49%",
  border_radius: "16px",
  trigger_type: "exit_intent",
  trigger_delay_seconds: 5,
  show_once_per_session: true,
  is_active: true,
};

const PopupBuilder = () => {
  const [configs, setConfigs] = useState<PopupConfig[]>([]);
  const [analytics, setAnalytics] = useState<PopupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<PopupConfig | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState<Omit<PopupConfig, "id">>(defaultForm);

  const fetchPopups = async () => {
    const { data, error } = await supabase.from("popup_configs").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load popups"); return; }
    setConfigs((data as unknown as PopupConfig[]) || []);
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    const { data } = await supabase.from("popup_events").select("popup_id, event_type");
    setAnalytics((data as unknown as PopupEvent[]) || []);
  };

  useEffect(() => { fetchPopups(); fetchAnalytics(); }, []);

  const categories = ["all", ...Array.from(new Set(configs.map(c => c.category)))];
  const filtered = categoryFilter === "all" ? configs : configs.filter(c => c.category === categoryFilter);

  const getStats = (id: string) => {
    const impressions = analytics.filter(a => a.popup_id === id && a.event_type === "impression").length;
    const clicks = analytics.filter(a => a.popup_id === id && a.event_type === "click").length;
    return { impressions, clicks, ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0" };
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    if (editingId) {
      const { error } = await supabase.from("popup_configs").update(form as any).eq("id", editingId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("popup_configs").insert(form as any);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Created");
    }
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
    fetchPopups();
  };

  const deleteConfig = async (id: string) => {
    const { error } = await supabase.from("popup_configs").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Deleted");
    fetchPopups();
  };

  const startEdit = (c: PopupConfig) => {
    const { id, ...rest } = c;
    setForm(rest);
    setEditingId(c.id);
    setShowForm(true);
  };

  if (preview) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setPreview(null)}>← Back to Editor</Button>
        <div className="flex items-center justify-center min-h-[500px] bg-muted/50 rounded-xl">
          <div className="w-full max-w-md shadow-2xl" style={{ backgroundColor: `hsl(${preview.bg_color})`, color: `hsl(${preview.text_color})`, borderRadius: preview.border_radius }}>
            <div className="relative p-6 text-center space-y-4">
              <button className="absolute top-3 right-4 text-lg opacity-50 hover:opacity-100">×</button>
              {preview.image_url && (
                <div className="mx-auto w-32 h-32 rounded-full overflow-hidden border-4" style={{ borderColor: `hsl(${preview.accent_color})` }}>
                  <img src={preview.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <h2 className="text-xl font-bold leading-tight">{preview.heading}</h2>
              <p className="text-sm opacity-75 leading-relaxed">{preview.description}</p>
              <button className="w-full h-11 rounded-full text-sm font-bold" style={{ backgroundColor: `hsl(${preview.accent_color})`, color: `hsl(${preview.bg_color})` }}>{preview.cta_text}</button>
              <button className="w-full h-10 rounded-full text-sm font-medium bg-muted/20 border">{preview.dismiss_text}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Create popup overlays with tracking, categorized for different website groups.</p>
        <div className="flex gap-2">
          <Button variant={showAnalytics ? "pearl" : "outline"} size="sm" onClick={() => setShowAnalytics(!showAnalytics)}><BarChart3 className="w-3 h-3 mr-1" /> Analytics</Button>
          <Button variant="pearl" size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}><Plus className="w-3 h-3 mr-1" /> New Popup</Button>
        </div>
      </div>

      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)} className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${categoryFilter === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{cat}</button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="pearl-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit" : "Create"} Popup</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Category</label><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g. seo, catering, digital-marketing" /></div>
            <ImagePickerField label="Image URL (avatar)" value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} />
            <div><label className="text-xs text-muted-foreground mb-1 block">CTA Link</label><input value={form.cta_link} onChange={e => setForm({ ...form, cta_link: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Heading</label><input value={form.heading} onChange={e => setForm({ ...form, heading: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px]" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">CTA Button Text</label><input value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Dismiss Text</label><input value={form.dismiss_text} onChange={e => setForm({ ...form, dismiss_text: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Trigger</label>
              <select value={form.trigger_type} onChange={e => setForm({ ...form, trigger_type: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="exit_intent">Exit Intent</option><option value="delay">Time Delay</option><option value="scroll">Scroll %</option>
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Delay (seconds)</label><input type="number" value={form.trigger_delay_seconds} onChange={e => setForm({ ...form, trigger_delay_seconds: Number(e.target.value) })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">BG Color (HSL)</label><input value={form.bg_color} onChange={e => setForm({ ...form, bg_color: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Accent Color (HSL)</label><input value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Border Radius</label><input value={form.border_radius} onChange={e => setForm({ ...form, border_radius: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div className="flex gap-6 items-center">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.show_once_per_session} onChange={e => setForm({ ...form, show_once_per_session: e.target.checked })} className="rounded" /> Once per session</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" /> Active</label>
            </div>
          </div>
          <div className="flex gap-2"><Button variant="pearl" size="sm" onClick={save}><Save className="w-3 h-3 mr-1" /> Save</Button><Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button></div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12"><MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No popups yet.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(c => {
            const stats = getStats(c.id);
            return (
              <div key={c.id} className="pearl-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{c.name}</h4>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${c.is_active ? "bg-pearl-gold-muted text-primary" : "bg-muted text-muted-foreground"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Category: {c.category} · Trigger: {c.trigger_type}</p>
                  </div>
                  <div className="flex gap-1 items-center" style={{ backgroundColor: `hsl(${c.accent_color})`, width: 16, height: 16, borderRadius: 4 }} />
                </div>
                {showAnalytics && (
                  <div className="flex gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                    <span>Impressions: <strong className="text-foreground">{stats.impressions}</strong></span>
                    <span>Clicks: <strong className="text-foreground">{stats.clicks}</strong></span>
                    <span>CTR: <strong className="text-foreground">{stats.ctr}%</strong></span>
                  </div>
                )}
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setPreview(c)}><Eye className="w-3 h-3 mr-1" /> Preview</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => startEdit(c)}><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-destructive ml-auto" onClick={() => deleteConfig(c.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PopupBuilder;

