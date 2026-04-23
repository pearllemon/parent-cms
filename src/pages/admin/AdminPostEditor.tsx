import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const AdminPostEditor = () => {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const { config } = useSiteConfig();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    status: "draft",
    featured_image_url: "",
  });

  useEffect(() => {
    if (isNew) return;
    supabase
      .from("posts")
      .select("*")
      .eq("id", id!)
      .single()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else if (data)
          setForm({
            title: data.title || "",
            slug: data.slug || "",
            excerpt: data.excerpt || "",
            body: data.body || "",
            status: data.status || "draft",
            featured_image_url: data.featured_image_url || "",
          });
        setLoading(false);
      });
  }, [id, isNew]);

  const save = async (publish = false) => {
    if (!config?.site?.id) return toast.error("Site not loaded");
    if (!form.title.trim()) return toast.error("Title required");
    setSaving(true);
    const payload = {
      ...form,
      slug: form.slug || slugify(form.title),
      status: publish ? "published" : form.status,
      publish_date: publish ? new Date().toISOString() : null,
      site_id: config.site.id,
    };
    try {
      if (isNew) {
        const { data, error } = await supabase.from("posts").insert(payload).select("id").single();
        if (error) throw error;
        toast.success("Post created");
        nav(`/admin/posts/${data.id}`, { replace: true });
      } else {
        const { error } = await supabase.from("posts").update(payload).eq("id", id!);
        if (error) throw error;
        toast.success("Saved");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (file: File) => {
    if (!config?.site?.id) return;
    const path = `posts/${config.site.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setForm((f) => ({ ...f, featured_image_url: data.publicUrl }));
    toast.success("Image uploaded");
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl">{isNew ? "New post" : "Edit post"}</h1>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving} onClick={() => save(false)}>
            Save draft
          </Button>
          <Button disabled={saving} onClick={() => save(true)}>
            Publish
          </Button>
        </div>
      </header>

      <div className="space-y-3 bg-background border rounded-2xl p-5">
        <Input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="text-xl"
        />
        <Input
          placeholder="slug-here (auto from title)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
        <Textarea
          rows={2}
          placeholder="Excerpt / summary"
          value={form.excerpt}
          onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
        />
        <Textarea
          rows={16}
          placeholder="Body (markdown or HTML)"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="font-mono text-sm"
        />

        <div className="flex items-center gap-3 pt-2">
          <label className="text-sm">
            <span className="text-muted-foreground">Featured image:</span>
            <input
              type="file"
              accept="image/*"
              className="ml-2"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
          </label>
          {form.featured_image_url && (
            <img src={form.featured_image_url} alt="" className="h-12 rounded" />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPostEditor;
