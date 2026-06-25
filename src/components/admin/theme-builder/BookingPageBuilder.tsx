import { useState, useEffect } from "react";
import { supabase } from "@/lib/parent";
import { Plus, Trash2, Edit2, Save, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BookingConfig {
  id: string;
  site_id: string | null;
  calendar_embed_code: string;
  heading: string;
  subheading: string;
  team_heading: string;
  team_description: string;
  custom_sections_html: string;
  is_global: boolean;
}

interface Site { id: string; name: string; domain: string; }

const defaultForm: Omit<BookingConfig, "id"> = {
  site_id: null, calendar_embed_code: "", heading: "Book A Call",
  subheading: "Schedule a meeting with our team", team_heading: "Meet Our Team",
  team_description: "", custom_sections_html: "", is_global: false,
};

const BookingPageBuilder = () => {
  const [configs, setConfigs] = useState<BookingConfig[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<BookingConfig, "id">>(defaultForm);

  const fetch_ = async () => {
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from("booking_page_configs").select("*").order("created_at", { ascending: false }),
      supabase.from("sites").select("id, name, domain").order("name"),
    ]);
    setConfigs((c as unknown as BookingConfig[]) || []);
    setSites((s as unknown as Site[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const save = async () => {
    if (editingId) {
      const { error } = await supabase.from("booking_page_configs").update(form as any).eq("id", editingId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("booking_page_configs").insert(form as any);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Created");
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); fetch_();
  };

  const del = async (id: string) => {
    await supabase.from("booking_page_configs").delete().eq("id", id);
    toast.success("Deleted"); fetch_();
  };

  const startEdit = (c: BookingConfig) => {
    const { id, ...rest } = c;
    setForm(rest); setEditingId(id); setShowForm(true);
  };

  const getSiteName = (siteId: string | null) => {
    if (!siteId) return "Global";
    return sites.find(s => s.id === siteId)?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Configure Book-a-Call pages per site with calendar embeds, team sections, and custom HTML.</p>
        <Button variant="pearl" size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}>
          <Plus className="w-3 h-3 mr-1" /> New Config
        </Button>
      </div>

      {showForm && (
        <div className="pearl-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit" : "Create"} Booking Page</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">Site</label>
              <select value={form.site_id || ""} onChange={e => setForm({ ...form, site_id: e.target.value || null })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Global (all sites)</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Heading</label>
              <input value={form.heading} onChange={e => setForm({ ...form, heading: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Subheading</label>
              <input value={form.subheading} onChange={e => setForm({ ...form, subheading: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Calendar Embed Code (HTML/iframe)</label>
              <textarea value={form.calendar_embed_code} onChange={e => setForm({ ...form, calendar_embed_code: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[100px] font-mono" placeholder='<iframe src="https://calendly.com/..." ...' /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Team Section Heading</label>
              <input value={form.team_heading} onChange={e => setForm({ ...form, team_heading: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Team Description</label>
              <input value={form.team_description} onChange={e => setForm({ ...form, team_description: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Custom Sections (HTML)</label>
              <textarea value={form.custom_sections_html} onChange={e => setForm({ ...form, custom_sections_html: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px] font-mono" placeholder="Add any extra HTML sections..." /></div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.is_global} onChange={e => setForm({ ...form, is_global: e.target.checked })} className="rounded" /> Apply globally to all sites</label>
          </div>
          <div className="flex gap-2">
            <Button variant="pearl" size="sm" onClick={save}><Save className="w-3 h-3 mr-1" /> Save</Button>
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? <p className="text-sm text-muted-foreground text-center py-8">Loading...</p> : configs.length === 0 ? (
        <div className="text-center py-12"><Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No booking page configs yet.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map(c => (
            <div key={c.id} className="pearl-card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{c.heading}</h4>
                  <p className="text-xs text-muted-foreground">Site: {getSiteName(c.site_id)} {c.is_global && "· Global"}</p>
                </div>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">{c.subheading}</p>
              {c.calendar_embed_code && <p className="text-[10px] text-primary font-mono truncate">Embed: {c.calendar_embed_code.substring(0, 60)}...</p>}
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => startEdit(c)}><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-destructive ml-auto" onClick={() => del(c.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingPageBuilder;

