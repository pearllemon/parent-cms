// Universal inline page editor.
// Loads an imported_post by id, renders it (Elementor-aware), lets the user
// click any element to edit it in the right-side panel, then saves back to
// the same row in the database. Works for Elementor pages (elementor_data)
// and plain HTML pages (body).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import ElementorRenderer from "@/components/elementor/ElementorRenderer";
import {
  EditorProvider,
  findNode,
  patchTree,
  applyStructural,
  applyInsert,
  type Path,
  type StructuralOp,
} from "@/components/editor/EditorContext";
import EditorPanel from "@/components/editor/EditorPanel";
import EditableHtml from "@/components/editor/EditableHtml";
import SectionLibraryDropZone from "@/components/editor/SectionLibraryDropZone";
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

type Source =
  | { table: "posts"; client: typeof parent }
  | { table: "imported_posts"; client: typeof supabase }
  | { table: "cpt_entries"; client: typeof supabase };

export default function AdminPageEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [post, setPost] = useState<ImportedPost | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [tree, setTree] = useState<any[]>([]);
  const [body, setBody] = useState<string>("");
  const [selected, setSelected] = useState<Path | null>(null);
  const [hovered, setHovered] = useState<Path | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  useEffect(() => {
    if (!id) return;
    // Guard: visual editor only works on a saved post. If id is "new" or
    // not a uuid, bounce back to the post editor so the user can save first.
    if (!UUID_RE.test(id)) {
      toast.message("Save the post first, then click Edit Visually.");
      nav("/admin/posts/new", { replace: true });
      return;
    }
    (async () => {
      setLoading(true);
      // Try parent `posts` first (default scope), then cloud `imported_posts`,
      // then `cpt_entries` (stores body inside JSON `data`). The first hit wins
      // and is also where Save writes back to.
      let loaded = false;

      // 1) parent posts
      try {
        const { data } = await (parent.from("posts") as any)
          .select("id,title,slug,type,body,elementor_data,render_mode")
          .eq("id", id)
          .maybeSingle();
        if (data) {
          setPost(data as ImportedPost);
          setTree(Array.isArray(data.elementor_data) ? (data.elementor_data as any[]) : []);
          setBody(data.body || "");
          setSource({ table: "posts", client: parent });
          loaded = true;
        }
      } catch { /* ignore */ }

      // 2) imported_posts
      if (!loaded) {
        try {
          const { data } = await supabase
            .from("imported_posts")
            .select("id,title,slug,type,body,elementor_data,render_mode")
            .eq("id", id)
            .maybeSingle();
          if (data) {
            setPost(data as ImportedPost);
            setTree(Array.isArray(data.elementor_data) ? (data.elementor_data as any[]) : []);
            setBody(data.body || "");
            setSource({ table: "imported_posts", client: supabase });
            loaded = true;
          }
        } catch { /* ignore */ }
      }

      // 3) cpt_entries (no elementor; body stored in data.body)
      if (!loaded) {
        try {
          const { data } = await (supabase.from("cpt_entries") as any)
            .select("id,title,slug,cpt_slug,data")
            .eq("id", id)
            .maybeSingle();
          if (data) {
            const d = (data.data || {}) as any;
            setPost({
              id: data.id,
              title: data.title || "",
              slug: data.slug || null,
              type: data.cpt_slug || null,
              body: typeof d.body === "string" ? d.body : "",
              elementor_data: Array.isArray(d.elementor_data) ? d.elementor_data : null,
              render_mode: d.render_mode || null,
            });
            setTree(Array.isArray(d.elementor_data) ? d.elementor_data : []);
            setBody(typeof d.body === "string" ? d.body : "");
            setSource({ table: "cpt_entries", client: supabase });
            loaded = true;
          }
        } catch { /* ignore */ }
      }

      if (!loaded) {
        toast.error("Page not found");
      }
      setLoading(false);
    })();
  }, [id, nav]);

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

  const structural = useCallback((path: Path, op: StructuralOp) => {
    setTree((t) => applyStructural(t, path, op));
    setDirty(true);
    setSelected(null);
  }, []);

  const insertNode = useCallback((node: any, parentPath?: Path) => {
    setTree((t) => applyInsert(t, node, parentPath));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (!post || !source) return;
    setSaving(true);
    let error: any = null;
    if (source.table === "cpt_entries") {
      // Read current data jsonb, merge, write back
      const { data: row } = await (supabase.from("cpt_entries") as any)
        .select("data").eq("id", post.id).maybeSingle();
      const merged = { ...(row?.data || {}) };
      if (hasElementor) merged.elementor_data = tree;
      else merged.body = body;
      const res = await (supabase.from("cpt_entries") as any)
        .update({ data: merged, updated_at: new Date().toISOString() })
        .eq("id", post.id);
      error = res.error;
    } else {
      const payload: { updated_at: string; elementor_data?: any; body?: string } = {
        updated_at: new Date().toISOString(),
      };
      if (hasElementor) payload.elementor_data = tree;
      else payload.body = body;
      const client = source.client as any;
      const res = await client.from(source.table).update(payload).eq("id", post.id);
      error = res.error;
    }
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
                structural={structural}
                insertNode={insertNode}
              >
                <ElementorRenderer data={tree} />
                <SectionLibraryDropZone />
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
              structural={structural}
              insertNode={insertNode}
            >
              <EditorPanel />
            </EditorProvider>
          </aside>
        )}
      </div>
    </div>
  );
}
