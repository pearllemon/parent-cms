import { useState, useEffect } from "react";
import { supabase } from "@/lib/parent";
import { Plus, Trash2, Edit2, Eye, Save, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ImagePickerField from "../ImagePickerField";

interface ErrorPageConfig {
  id: string;
  name: string;
  heading: string;
  subheading: string;
  description: string;
  image_url: string;
  show_search: boolean;
  show_lead_form: boolean;
  search_placeholder: string;
  cta_text: string;
  bg_color: string;
  text_color: string;
  accent_color: string;
}

const defaultForm: Omit<ErrorPageConfig, "id"> = {
  name: "",
  heading: "Oooops...",
  subheading: "Page not found",
  description: "The page you are looking for doesn't exist or other error occurred.",
  image_url: "https://pearllemon.com/wp-content/uploads/2024/10/robot404-1024x1024.webp",
  show_search: true,
  show_lead_form: true,
  search_placeholder: "What page you were looking for?",
  cta_text: "Go Back to Homepage",
  bg_color: "0 0% 100%",
  text_color: "0 0% 15%",
  accent_color: "46 100% 49%",
};

const ErrorPageBuilder = () => {
  const [configs, setConfigs] = useState<ErrorPageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<ErrorPageConfig | null>(null);
  const [form, setForm] = useState<Omit<ErrorPageConfig, "id">>(defaultForm);
  const [tableMissing, setTableMissing] = useState(false);

  const fetch404s = async () => {
    try {
      const { data, error } = await supabase.from("error_page_configs").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        if (error.message?.includes("relation") || error.message?.includes("cache") || error.message?.includes("schema") || error.code === "PGRST116" || error.code === "42P01") {
          setTableMissing(true);
        } else {
          toast.error("Failed to load 404 configs: " + error.message);
        }
        setLoading(false);
        return;
      }
      setConfigs((data as unknown as ErrorPageConfig[]) || []);
      setTableMissing(false);
    } catch (err) {
      console.error(err);
      setTableMissing(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch404s(); }, []);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    if (editingId) {
      const { error } = await supabase.from("error_page_configs").update(form as any).eq("id", editingId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("error_page_configs").insert(form as any);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Created");
    }
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
    fetch404s();
  };

  const deleteConfig = async (id: string) => {
    const { error } = await supabase.from("error_page_configs").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Deleted");
    fetch404s();
  };

  const startEdit = (c: ErrorPageConfig) => {
    setForm({ name: c.name, heading: c.heading, subheading: c.subheading, description: c.description, image_url: c.image_url, show_search: c.show_search, show_lead_form: c.show_lead_form, search_placeholder: c.search_placeholder, cta_text: c.cta_text, bg_color: c.bg_color, text_color: c.text_color, accent_color: c.accent_color });
    setEditingId(c.id);
    setShowForm(true);
  };

  if (tableMissing) {
    return (
      <div className="pearl-card p-6 border-amber-500/30 bg-amber-500/5 text-amber-950 rounded-xl space-y-3">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-amber-700">
          ⚠️ Database Schema Configuration Needed
        </h3>
        <p className="text-sm leading-relaxed">
          The <code>error_page_configs</code> table was not found in your database schema cache. This tab manages the central templates for child sites.
        </p>
        <p className="text-xs opacity-80">
          <strong>Resolution:</strong> Please execute the migration script located at <code>supabase/migrations/20260625123500_theme_builder_tables.sql</code> in your Supabase SQL Editor to provision the required database tables, then refresh the page.
        </p>
      </div>
    );
  }

  if (preview) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setPreview(null)}>← Back to Editor</Button>
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: `hsl(${preview.bg_color})`, color: `hsl(${preview.text_color})` }}>
          <div className="flex flex-col md:flex-row items-center justify-center min-h-[500px] p-8 gap-8">
            <div className="flex-shrink-0 max-w-[400px]">
              {preview.image_url && <img src={preview.image_url} alt="404" className="w-full h-auto" />}
            </div>
            <div className="space-y-4 max-w-md">
              <h1 className="text-3xl font-black">{preview.heading}</h1>
              <h2 className="text-xl font-bold">{preview.subheading}</h2>
              <p className="text-sm opacity-80">{preview.description}</p>
              {preview.show_search && (
                <div className="flex gap-2">
                  <input className="flex-1 h-10 rounded-lg border px-3 text-sm bg-white/10" placeholder={preview.search_placeholder} readOnly />
                  <button className="h-10 px-5 rounded-lg text-sm font-semibold" style={{ backgroundColor: `hsl(${preview.accent_color})`, color: `hsl(${preview.bg_color})` }}>Send</button>
                </div>
              )}
              <button className="h-10 px-6 rounded-lg border text-sm font-semibold" style={{ borderColor: `hsl(${preview.text_color})` }}>{preview.cta_text}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Create 404 error page templates that sync to child websites.</p>
        <Button variant="pearl" size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}><Plus className="w-3 h-3 mr-1" /> New 404 Page</Button>
      </div>

      {showForm && (
        <div className="pearl-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit" : "Create"} 404 Config</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="Pearl Lemon 404" /></div>
            <ImagePickerField label="Image URL" value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} />
            <div><label className="text-xs text-muted-foreground mb-1 block">Heading</label><input value={form.heading} onChange={e => setForm({ ...form, heading: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Subheading</label><input value={form.subheading} onChange={e => setForm({ ...form, subheading: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px]" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Search Placeholder</label><input value={form.search_placeholder} onChange={e => setForm({ ...form, search_placeholder: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">CTA Text</label><input value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Background Color (HSL)</label><input value={form.bg_color} onChange={e => setForm({ ...form, bg_color: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Text Color (HSL)</label><input value={form.text_color} onChange={e => setForm({ ...form, text_color: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Accent Color (HSL)</label><input value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div className="flex gap-6 items-center md:col-span-2">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.show_search} onChange={e => setForm({ ...form, show_search: e.target.checked })} className="rounded" /> Show Search Bar</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.show_lead_form} onChange={e => setForm({ ...form, show_lead_form: e.target.checked })} className="rounded" /> Capture as Lead</label>
            </div>
          </div>
          <div className="flex gap-2"><Button variant="pearl" size="sm" onClick={save}><Save className="w-3 h-3 mr-1" /> Save</Button><Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button></div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12"><Image className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No 404 page configs yet.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map(c => (
            <div key={c.id} className="pearl-card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{c.name}</h4>
                  <p className="text-xs text-muted-foreground">{c.heading} — {c.subheading}</p>
                </div>
                <div className="flex gap-1 items-center" style={{ backgroundColor: `hsl(${c.accent_color})` , width: 16, height: 16, borderRadius: 4 }} />
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setPreview(c)}><Eye className="w-3 h-3 mr-1" /> Preview</Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => startEdit(c)}><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-destructive ml-auto" onClick={() => deleteConfig(c.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ErrorPageBuilder;

