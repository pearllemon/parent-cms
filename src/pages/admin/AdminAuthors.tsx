// Authors management — CRUD over the child-side `authors` table.
// Profile image, name, slug, job title, bio, social links, SEO,
// archive toggle. Used by the post editor's Author selector and to
// power /author/[slug] archive pages.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save, ArrowLeft, ExternalLink, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import MediaPicker from "@/components/admin/MediaPicker";

type Author = {
  id: string;
  slug: string;
  name: string;
  job_title: string | null;
  bio: string | null;
  profile_image_url: string | null;
  email: string | null;
  social: Record<string, string>;
  seo: Record<string, any>;
  schema_json: any[];
  archive_enabled: boolean;
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const emptyAuthor = (): Partial<Author> => ({
  slug: "", name: "", job_title: "", bio: "", profile_image_url: "",
  email: "", social: {}, seo: {}, schema_json: [], archive_enabled: true,
});

export default function AdminAuthors() {
  const [list, setList] = useState<Author[]>([]);
  const [editing, setEditing] = useState<Partial<Author> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("authors" as any) as any).select("*").order("name");
    setList((data || []) as Author[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!editing?.name?.trim()) return toast.error("Name is required");
    const slug = editing.slug || slugify(editing.name);
    const payload = { ...editing, slug };
    if ((editing as Author).id) {
      const { error } = await (supabase.from("authors" as any) as any).update(payload).eq("id", (editing as Author).id);
      if (error) return toast.error(error.message);
      toast.success("Author updated");
    } else {
      const { error } = await (supabase.from("authors" as any) as any).insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Author created");
    }
    setEditing(null);
    await load();
  };

  const del = async (a: Author) => {
    if (!confirm(`Delete ${a.name}?`)) return;
    const { error } = await (supabase.from("authors" as any) as any).delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    setList((ls) => ls.filter((x) => x.id !== a.id));
  };

  if (editing) {
    const e = editing as any;
    const setF = (k: string, v: any) => setEditing({ ...editing, [k]: v });
    const setSocial = (k: string, v: string) => setEditing({ ...editing, social: { ...(editing.social || {}), [k]: v } });
    return (
      <div className="space-y-4 max-w-3xl">
        <Button variant="ghost" onClick={() => setEditing(null)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={e.profile_image_url} />
            <AvatarFallback>{(e.name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-display text-2xl">{e.id ? "Edit" : "New"} Author</h1>
            <p className="text-sm text-muted-foreground">Profile, bio, social, SEO and archive settings.</p>
          </div>
          <Button onClick={save}><Save className="w-4 h-4 mr-2" /> Save</Button>
        </div>

        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={e.name || ""} onChange={(ev) => setF("name", ev.target.value)} /></div>
            <div><Label>Slug</Label><Input value={e.slug || ""} onChange={(ev) => setF("slug", slugify(ev.target.value))} placeholder={slugify(e.name || "")} /></div>
            <div><Label>Job Title</Label><Input value={e.job_title || ""} onChange={(ev) => setF("job_title", ev.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={e.email || ""} onChange={(ev) => setF("email", ev.target.value)} /></div>
            <div className="col-span-2"><Label>Profile Image</Label>
              <div className="flex items-center gap-2">
                {e.profile_image_url ? <img src={e.profile_image_url} alt="" className="w-12 h-12 rounded border object-cover" /> : <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>}
                <Input className="flex-1" value={e.profile_image_url || ""} onChange={(ev) => setF("profile_image_url", ev.target.value)} placeholder="https://… or pick from library" />
                <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}>Browse media</Button>
                {e.profile_image_url && <Button type="button" size="sm" variant="ghost" onClick={() => setF("profile_image_url", "")}>Clear</Button>}
              </div>
            </div>
            <div className="col-span-2"><Label>Bio</Label>
              <Textarea rows={4} value={e.bio || ""} onChange={(ev) => setF("bio", ev.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-medium">Social Links</h3>
          <div className="grid grid-cols-2 gap-3">
            {["twitter", "linkedin", "facebook", "instagram", "youtube", "website"].map((k) => (
              <div key={k}><Label className="capitalize">{k}</Label>
                <Input value={(e.social || {})[k] || ""} onChange={(ev) => setSocial(k, ev.target.value)} placeholder={`https://${k}.com/…`} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-medium">SEO & Archive</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Meta title</Label><Input value={e.seo?.title || ""} onChange={(ev) => setF("seo", { ...(e.seo || {}), title: ev.target.value })} /></div>
            <div><Label>Meta description</Label><Input value={e.seo?.description || ""} onChange={(ev) => setF("seo", { ...(e.seo || {}), description: ev.target.value })} /></div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={!!e.archive_enabled} onCheckedChange={(v) => setF("archive_enabled", v)} />
              <Label>Enable /author/{e.slug || "slug"} archive page</Label>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl">Authors</h1>
          <p className="text-sm text-muted-foreground">Manage author profiles. Bound to posts via the editor's Author field.</p>
        </div>
        <Button onClick={() => setEditing(emptyAuthor())}><Plus className="w-4 h-4 mr-2" /> New author</Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : list.length === 0 ? (
        <div className="border rounded-xl p-8 text-center text-sm text-muted-foreground">No authors yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((a) => (
            <Card key={a.id} className="p-4 flex gap-3">
              <Avatar className="w-14 h-14">
                <AvatarImage src={a.profile_image_url || undefined} />
                <AvatarFallback>{a.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{a.name}</div>
                <div className="text-xs text-muted-foreground truncate">{a.job_title || "—"}</div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(a)}>Edit</Button>
                  <Button size="sm" variant="ghost" asChild><a href={`/author/${a.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(a)} className="text-red-600 ml-auto"><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
