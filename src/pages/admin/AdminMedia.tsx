import { useEffect, useState } from "react";
import { supabase } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Item = { id: string; file_url: string; file_name: string; file_size?: number };

const AdminMedia = () => {
  const { config } = useSiteConfig();
  const [items, setItems] = useState<Item[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!config?.site?.id) return;
    const { data } = await supabase
      .from("media_library")
      .select("id,file_url,file_name,file_size")
      .eq("site_id", config.site.id)
      .order("created_at", { ascending: false })
      .limit(60);
    setItems((data as Item[]) || []);
  };

  useEffect(() => {
    load();
  }, [config?.site?.id]);

  const upload = async (file: File) => {
    if (!config?.site?.id) return;
    setUploading(true);
    try {
      const path = `library/${config.site.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("media").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      await supabase.from("media_library").insert({
        site_id: config.site.id,
        file_url: data.publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });
      toast.success("Uploaded");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Media</h1>
        <label>
          <input
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button asChild>
            <span>{uploading ? "Uploading…" : "Upload"}</span>
          </Button>
        </label>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((it) => (
          <a
            key={it.id}
            href={it.file_url}
            target="_blank"
            rel="noreferrer"
            className="block bg-background border rounded-xl overflow-hidden hover:shadow"
          >
            <img src={it.file_url} alt={it.file_name} className="w-full h-32 object-cover" loading="lazy" />
            <div className="p-2 text-xs truncate">{it.file_name}</div>
          </a>
        ))}
        {items.length === 0 && (
          <p className="col-span-full text-muted-foreground text-sm">No media yet.</p>
        )}
      </div>
    </div>
  );
};

export default AdminMedia;
