// Users — admin team & role management.
// Sources accounts from cloud `admin_users` table. Lets you invite (record
// an email + role), edit role/display name, link to a parent CMS user_id,
// and remove. Authentication itself remains in parent CMS — this is a
// directory and role registry only.

import { useEffect, useState } from "react";
import { supabase as cloud } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import MediaPicker from "@/components/admin/MediaPicker";

/* eslint-disable @typescript-eslint/no-explicit-any */
const T = (t: string) => (cloud.from(t as any) as any);

type User = {
  id: string;
  site_id: string | null;
  user_id: string | null;
  email: string;
  display_name: string | null;
  role: "owner" | "admin" | "editor" | "author" | "viewer";
  avatar_url: string | null;
  last_seen_at: string | null;
};

const ROLES = [
  { value: "owner", label: "Owner — full control" },
  { value: "admin", label: "Admin — manage everything" },
  { value: "editor", label: "Editor — publish & manage posts" },
  { value: "author", label: "Author — write own posts" },
  { value: "viewer", label: "Viewer — read only" },
];

export default function AdminUsers() {
  const { config } = useSiteConfig();
  const siteId = config?.site?.id;
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<User> | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    let qb = T("admin_users").select("*").order("created_at", { ascending: false });
    if (siteId) qb = qb.eq("site_id", siteId);
    const { data } = await qb;
    setList((data as User[]) || []);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [siteId]);

  const save = async () => {
    if (!editing?.email?.trim()) return toast.error("Email required");
    const payload = { ...editing, site_id: siteId };
    if ((editing as User).id) {
      const { error } = await T("admin_users").update(payload).eq("id", (editing as User).id);
      if (error) return toast.error(error.message);
      toast.success("User updated");
    } else {
      const { error } = await T("admin_users").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("User invited");
    }
    setEditing(null);
    await load();
  };

  const del = async (u: User) => {
    if (!confirm(`Remove ${u.email}?`)) return;
    await T("admin_users").delete().eq("id", u.id);
    setList((ls) => ls.filter((x) => x.id !== u.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl">Users</h1>
          <p className="text-sm text-muted-foreground">Team members and access roles for this site.</p>
        </div>
        <Button onClick={() => setEditing({ email: "", role: "editor", display_name: "", avatar_url: "" })}>
          <Plus className="w-4 h-4 mr-2" /> Add user
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : list.length === 0 ? (
        <div className="border rounded-xl p-8 text-center text-sm text-muted-foreground">
          No team members yet. Add one to assign access.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((u) => (
            <Card key={u.id} className="p-4 flex gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={u.avatar_url || undefined} />
                <AvatarFallback>{(u.display_name || u.email).slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{u.display_name || u.email}</div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</div>
                <div className="text-xs mt-1 flex items-center gap-1"><Shield className="w-3 h-3 text-primary" /> {u.role}</div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(u)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-600 ml-auto" onClick={() => del(u)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent>
            <DialogHeader><DialogTitle>{(editing as User).id ? "Edit user" : "Add user"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={editing.avatar_url || undefined} />
                  <AvatarFallback>{(editing.display_name || editing.email || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>Pick avatar from media</Button>
                {editing.avatar_url && <Button size="sm" variant="ghost" onClick={() => setEditing({ ...editing, avatar_url: "" })}>Remove</Button>}
              </div>
              <div><Label>Email</Label><Input type="email" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div><Label>Display name</Label><Input value={editing.display_name || ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} /></div>
              <div><Label>Role</Label>
                <Select value={editing.role || "editor"} onValueChange={(v) => setEditing({ ...editing, role: v as User["role"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Parent user ID (optional)</Label><Input value={editing.user_id || ""} onChange={(e) => setEditing({ ...editing, user_id: e.target.value })} placeholder="UUID from parent CMS auth" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}><Save className="w-4 h-4 mr-1" /> Save</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(it) => setEditing((e) => e ? { ...e, avatar_url: it.url } : e)}
      />
    </div>
  );
}
