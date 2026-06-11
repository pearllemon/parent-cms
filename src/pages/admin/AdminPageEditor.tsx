// Universal inline page editor.
// Loads an imported_post by id, renders it (Elementor-aware), lets the user
// click any element to edit it in the right-side panel, then saves back to
// the same row in the database. Works for Elementor pages (elementor_data)
// and plain HTML pages (body).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ElementorRenderer from "@/components/elementor/ElementorRenderer";
import {
  EditorProvider,
  findNode,
  patchTree,
  type Path,
} from "@/components/editor/EditorContext";
import EditorPanel from "@/components/editor/EditorPanel";
import EditableHtml from "@/components/editor/EditableHtml";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Save } from "lucide-react";

type ImportedPost = {
  id: string;
  title: string;
  slug: string | null;
  type: string | null;
  body: string | null;
  elementor_data: any[] | null;
  render_mode: string | null;
};

export default function AdminPageEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [post, setPost] = useState<ImportedPost | null>(null);
  const [tree, setTree] = useState<any[]>([]);
  const [body, setBody] = useState<string>("");
  const [selected, setSelected] = useState<Path | null>(null);
  const [hovered, setHovered] = useState<Path | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("imported_posts")
        .select("id,title,slug,type,body,elementor_data,render_mode")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        toast.error("Could not load page: " + error.message);
        setLoading(false);
        return;
      }
      if (!data) {
        toast.error("Page not found");
        setLoading(false);
        return;
      }
      setPost(data as ImportedPost);
      setTree(Array.isArray(data.elementor_data) ? (data.elementor_data as any[]) : []);
      setBody(data.body || "");
      setLoading(false);
    })();
  }, [id]);

  const hasElementor = useMemo(
    () => tree.length > 0 && post?.render_mode !== "template",
    [tree, post]
  );

  const patchAt = useCallback((path: Path, updater: (s: any) => any) => {
    setTree((t) => {
      const next = patchTree(t, path, updater);
      return next;
    });
    setDirty(true);
  }, []);

  const getNodeAt = useCallback((p: Path) => findNode(tree, p), [tree]);

  const handleSave = async () => {
    if (!post) return;
    setSaving(true);
    const payload: { updated_at: string; elementor_data?: any; body?: string } = {
      updated_at: new Date().toISOString(),
    };
    if (hasElementor) payload.elementor_data = tree;
    else payload.body = body;
    const { error } = await supabase.from("imported_posts").update(payload).eq("id", post.id);
    setSaving(false);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    setDirty(false);
    toast.success("Saved");
  };

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && !saving) void handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading editor…</div>;
  }
  if (!post) {
    return <div className="p-12 text-center text-muted-foreground">Page not found</div>;
  }

  const viewHref = post.slug ? `/p/${post.slug}` : null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-14 shrink-0 border-b flex items-center gap-3 px-4">
        <Button variant="ghost" size="sm" onClick={() => nav("/admin/posts?type=page")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Pages
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{post.title || "(untitled)"}</p>
          <p className="text-xs text-muted-foreground truncate">
            {hasElementor ? "Elementor page" : "HTML page"} · /{post.slug || ""}
          </p>
        </div>
        {viewHref && (
          <Button asChild variant="ghost" size="sm">
            <a href={viewHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> View
            </a>
          </Button>
        )}
        <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
      </header>

      {/* Body: canvas + side panel */}
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="bg-background min-h-full">
            {hasElementor ? (
              <EditorProvider
                selected={selected}
                hovered={hovered}
                select={setSelected}
                setHover={setHovered}
                patchAt={patchAt}
                getNodeAt={getNodeAt}
              >
                <ElementorRenderer data={tree} />
              </EditorProvider>
            ) : (
              <div className="container py-12 max-w-3xl">
                <h1 className="font-display text-4xl md:text-5xl mb-8">{post.title}</h1>
                <EditableHtml
                  html={body}
                  onChange={(next) => {
                    setBody(next);
                    setDirty(true);
                  }}
                />
              </div>
            )}
          </div>
        </main>

        {hasElementor && (
          <aside className="w-[340px] shrink-0 border-l bg-background overflow-hidden flex flex-col">
            <EditorProvider
              selected={selected}
              hovered={hovered}
              select={setSelected}
              setHover={setHovered}
              patchAt={patchAt}
              getNodeAt={getNodeAt}
            >
              <EditorPanel />
            </EditorProvider>
          </aside>
        )}
      </div>
    </div>
  );
}
