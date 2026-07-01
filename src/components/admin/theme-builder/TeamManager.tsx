import { useState, useEffect } from "react";
import { supabase } from "@/lib/parent";
import { Plus, Trash2, Edit2, Save, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ImagePickerField from "../ImagePickerField";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  bio: string;
  image_url: string;
  linkedin_url: string;
  sort_order: number;
  is_head: boolean;
}

const defaultForm: Omit<TeamMember, "id"> = {
  name: "", role: "", department: "general", bio: "", image_url: "",
  linkedin_url: "", sort_order: 0, is_head: false,
};

const TeamManager = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<TeamMember, "id">>(defaultForm);
  const [deptFilter, setDeptFilter] = useState("all");

  const fetch_ = async () => {
    const { data, error } = await supabase.from("team_members").select("*").order("sort_order");
    if (error) { toast.error("Failed to load team"); return; }
    setMembers((data as unknown as TeamMember[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const departments = ["all", ...Array.from(new Set(members.map(m => m.department)))];
  const filtered = deptFilter === "all" ? members : members.filter(m => m.department === deptFilter);
  const heads = filtered.filter(m => m.is_head);
  const others = filtered.filter(m => !m.is_head);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    if (editingId) {
      const { error } = await supabase.from("team_members").update(form as any).eq("id", editingId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("team_members").insert(form as any);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Added");
    }
    setShowForm(false); setEditingId(null); setForm(defaultForm); fetch_();
  };

  const del = async (id: string) => {
    await supabase.from("team_members").delete().eq("id", id);
    toast.success("Deleted"); fetch_();
  };

  const startEdit = (m: TeamMember) => {
    const { id, ...rest } = m;
    setForm(rest); setEditingId(id); setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Manage all team members centrally. Assign departments to websites.</p>
        <Button variant="pearl" size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}>
          <Plus className="w-3 h-3 mr-1" /> Add Member
        </Button>
      </div>

      {departments.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {departments.map(d => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${deptFilter === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {d}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="pearl-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit" : "Add"} Team Member</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Role / Title</label>
              <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g. Head of Content Writing" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Department</label>
              <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g. seo, content-writing, link-building" /></div>
            <ImagePickerField label="Image URL" value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} />
            <div><label className="text-xs text-muted-foreground mb-1 block">LinkedIn URL</label>
              <input value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Bio</label>
              <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px]" /></div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.is_head} onChange={e => setForm({ ...form, is_head: e.target.checked })} className="rounded" /> Department Head (shows larger card)</label>
          </div>
          <div className="flex gap-2">
            <Button variant="pearl" size="sm" onClick={save}><Save className="w-3 h-3 mr-1" /> Save</Button>
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? <p className="text-sm text-muted-foreground text-center py-8">Loading...</p> : (
        <>
          {/* Heads - large cards */}
          {heads.length > 0 && (
            <div className="space-y-4">
              {heads.map(m => (
                <div key={m.id} className="pearl-card p-5 flex flex-col md:flex-row gap-5">
                  {m.image_url && (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary flex-shrink-0 mx-auto md:mx-0">
                      <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-foreground">{m.name}</h4>
                      <Star className="w-4 h-4 text-primary fill-primary" />
                    </div>
                    <p className="text-sm font-medium text-primary">{m.role}</p>
                    <p className="text-xs text-muted-foreground capitalize">Department: {m.department}</p>
                    {m.bio && <p className="text-sm text-muted-foreground leading-relaxed mt-2">{m.bio}</p>}
                    <div className="flex gap-1 mt-3">
                      {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">LinkedIn</a>}
                      <Button variant="ghost" size="sm" className="text-xs h-7 ml-auto" onClick={() => startEdit(m)}><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-destructive" onClick={() => del(m.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Regular members - grid */}
          {others.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {others.map(m => (
                <div key={m.id} className="pearl-card p-4 text-center space-y-2">
                  {m.image_url && (
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary mx-auto">
                      <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h4 className="text-sm font-semibold text-foreground">{m.name}</h4>
                  <p className="text-xs text-primary">{m.role}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{m.department}</p>
                  <div className="flex gap-1 justify-center">
                    {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">in</a>}
                  </div>
                  <div className="flex gap-1 justify-center pt-1">
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => startEdit(m)}><Edit2 className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" className="text-xs h-6 text-muted-foreground hover:text-destructive" onClick={() => del(m.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-12"><Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No team members yet.</p></div>
          )}
        </>
      )}
    </div>
  );
};

export default TeamManager;

