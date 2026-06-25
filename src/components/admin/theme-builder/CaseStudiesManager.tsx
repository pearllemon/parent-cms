import { useState, useEffect } from "react";
import { supabase } from "@/lib/parent";
import { Plus, Trash2, Edit2, Save, TrendingUp, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CaseStudy {
  id: string;
  site_id: string | null;
  title: string;
  description: string;
  results: string;
  image_url: string;
  video_url: string;
  visit_link: string;
  sort_order: number;
  is_published: boolean;
}

interface Site { id: string; name: string; }

const defaultForm: Omit<CaseStudy, "id"> = {
  site_id: null, title: "", description: "", results: "",
  image_url: "", video_url: "", visit_link: "#", sort_order: 0, is_published: true,
};

const CaseStudiesManager = () => {
  const [items, setItems] = useState<CaseStudy[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CaseStudy, "id">>(defaultForm);

  const fetch_ = async () => {
    const [{ data: d }, { data: s }] = await Promise.all([
      supabase.from("case_studies").select("*").order("sort_order"),
      supabase.from("sites").select("id, name").order("name"),
    ]);
    setItems((d as unknown as CaseStudy[]) || []);
    setSites((s as unknown as Site[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    if (editingId) {
      const { error } = await supabase.from("case_studies").update(form as any).eq("id", editingId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("case_studies").insert(form as any);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Created");
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); fetch_();
  };

  const del = async (id: string) => {
    await supabase.from("case_studies").delete().eq("id", id);
    toast.success("Deleted"); fetch_();
  };

  const startEdit = (c: CaseStudy) => {
    const { id, ...rest } = c;
    setForm(rest); setEditingId(id); setShowForm(true);
  };

  const getSiteName = (id: string | null) => sites.find(s => s.id === id)?.name || "Global";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Manage case studies with zigzag layouts, videos, results, and visit links.</p>
        <Button variant="pearl" size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}>
          <Plus className="w-3 h-3 mr-1" /> Add Case Study
        </Button>
      </div>

      {showForm && (
        <div className="pearl-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit" : "Add"} Case Study</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">Site</label>
              <select value={form.site_id || ""} onChange={e => setForm({ ...form, site_id: e.target.value || null })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Global</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px]" /></div>
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Results / Key Metrics</label>
              <textarea value={form.results} onChange={e => setForm({ ...form, results: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px]" placeholder="e.g. 300% increase in organic traffic..." /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Image URL</label>
              <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Video URL</label>
              <input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Visit Link</label>
              <input value={form.visit_link} onChange={e => setForm({ ...form, visit_link: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} className="rounded" /> Published</label>
          </div>
          <div className="flex gap-2">
            <Button variant="pearl" size="sm" onClick={save}><Save className="w-3 h-3 mr-1" /> Save</Button>
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? <p className="text-sm text-muted-foreground text-center py-8">Loading...</p> : items.length === 0 ? (
        <div className="text-center py-12"><TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No case studies yet.</p></div>
      ) : (
        <div className="space-y-4">
          {items.map((c, idx) => (
            <div key={c.id} className={`pearl-card overflow-hidden flex flex-col ${idx % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"}`}>
              {c.image_url && (
                <div className="md:w-2/5 h-48 md:h-auto relative overflow-hidden">
                  <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
                  {c.video_url && (
                    <a href={c.video_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-foreground/20 hover:bg-foreground/30 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center"><Play className="w-5 h-5 text-primary-foreground ml-0.5" /></div>
                    </a>
                  )}
                </div>
              )}
              <div className="flex-1 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-foreground">{c.title}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.is_published ? "bg-pearl-gold-muted text-primary" : "bg-muted text-muted-foreground"}`}>
                    {c.is_published ? "Live" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Site: {getSiteName(c.site_id)}</p>
                <p className="text-sm text-muted-foreground">{c.description}</p>
                {c.results && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-foreground mb-1">Key Results</p>
                    <p className="text-xs text-muted-foreground">{c.results}</p>
                  </div>
                )}
                <div className="flex gap-1 pt-1">
                  {c.visit_link !== "#" && <a href={c.visit_link} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="text-xs h-7"><ExternalLink className="w-3 h-3 mr-1" /> Visit</Button></a>}
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => startEdit(c)}><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-destructive ml-auto" onClick={() => del(c.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CaseStudiesManager;

