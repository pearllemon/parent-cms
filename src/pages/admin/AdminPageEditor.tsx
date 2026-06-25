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
import { ArrowLeft, ExternalLink, Save, LayoutTemplate } from "lucide-react";

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

const createSectionNode = (columnsCount = 1) => {
  const sectionId = Math.random().toString(36).slice(2, 9);
  const elements = [];
  for (let i = 0; i < columnsCount; i++) {
    elements.push({
      id: Math.random().toString(36).slice(2, 9),
      elType: "column",
      settings: { _column_size: 100 / columnsCount },
      elements: [],
    });
  }
  return {
    id: sectionId,
    elType: "section",
    settings: {},
    elements,
  };
};

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
  const [editorMode, setEditorMode] = useState<"elementor" | "html">("elementor");

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
        // Fetch guaranteed core columns first to prevent schema errors from breaking load
        const { data: baseData, error: baseError } = await (parent.from("posts") as any)
          .select("id,title,slug,type,body")
          .eq("id", id)
          .maybeSingle();

        if (baseData) {
          const loadedPost: ImportedPost = {
            id: baseData.id,
            title: baseData.title || "",
            slug: baseData.slug || null,
            type: baseData.type || null,
            body: baseData.body || "",
            elementor_data: null,
            render_mode: null,
          };

          // Separately try to load elementor_data and render_mode
          try {
            const { data: extraData } = await (parent.from("posts") as any)
              .select("elementor_data,render_mode")
              .eq("id", id)
              .maybeSingle();
            if (extraData) {
              loadedPost.elementor_data = extraData.elementor_data;
              loadedPost.render_mode = extraData.render_mode;
            }
          } catch {
            // parent posts table doesn't have these columns yet, which is fine
          }

          setPost(loadedPost);
          const parsedTree = Array.isArray(loadedPost.elementor_data) ? (loadedPost.elementor_data as any[]) : [];
          setTree(parsedTree);
          setBody(loadedPost.body || "");
          setSource({ table: "posts", client: parent });
          const isElementor = loadedPost.render_mode === "elementor" || (parsedTree.length > 0 && loadedPost.render_mode !== "template");
          setEditorMode(isElementor ? "elementor" : "html");
          loaded = true;
        }
      } catch (e) {
        console.warn("Parent post load attempt failed:", e);
      }

      // 2) imported_posts
      if (!loaded) {
        try {
          const { data: baseData } = await supabase
            .from("imported_posts")
            .select("id,title,slug,type,body")
            .eq("id", id)
            .maybeSingle();

          if (baseData) {
            const loadedPost: ImportedPost = {
              id: baseData.id,
              title: baseData.title || "",
              slug: baseData.slug || null,
              type: baseData.type || null,
              body: baseData.body || "",
              elementor_data: null,
              render_mode: null,
            };

            // Separately try to load elementor_data and render_mode
            try {
              const { data: extraData } = await supabase
                .from("imported_posts")
                .select("elementor_data,render_mode")
                .eq("id", id)
                .maybeSingle();
              if (extraData) {
                loadedPost.elementor_data = extraData.elementor_data;
                loadedPost.render_mode = extraData.render_mode;
              }
            } catch {
              // columns don't exist
            }

            setPost(loadedPost);
            const parsedTree = Array.isArray(loadedPost.elementor_data) ? (loadedPost.elementor_data as any[]) : [];
            setTree(parsedTree);
            setBody(loadedPost.body || "");
            setSource({ table: "imported_posts", client: supabase });
            const isElementor = loadedPost.render_mode === "elementor" || (parsedTree.length > 0 && loadedPost.render_mode !== "template");
            setEditorMode(isElementor ? "elementor" : "html");
            loaded = true;
          }
        } catch (e) {
          console.warn("Imported post load attempt failed:", e);
        }
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
            const loadedPost: ImportedPost = {
              id: data.id,
              title: data.title || "",
              slug: data.slug || null,
              type: data.cpt_slug || null,
              body: typeof d.body === "string" ? d.body : "",
              elementor_data: Array.isArray(d.elementor_data) ? d.elementor_data : null,
              render_mode: d.render_mode || null,
            };
            setPost(loadedPost);
            const parsedTree = Array.isArray(d.elementor_data) ? d.elementor_data : [];
            setTree(parsedTree);
            setBody(typeof d.body === "string" ? d.body : "");
            setSource({ table: "cpt_entries", client: supabase });
            const isElementor = loadedPost.render_mode === "elementor" || (parsedTree.length > 0 && loadedPost.render_mode !== "template");
            setEditorMode(isElementor ? "elementor" : "html");
            loaded = true;
          }
        } catch (e) {
          console.warn("CPT load attempt failed:", e);
        }
      }

      // 4) elementor_templates
      if (!loaded) {
        try {
          const { data: tplData } = await supabase
            .from("elementor_templates")
            .select("id,title,slug,data,kind")
            .eq("id", id)
            .maybeSingle();

          if (tplData) {
            const loadedPost: ImportedPost = {
              id: tplData.id,
              title: tplData.title || tplData.kind || "Template",
              slug: tplData.slug || null,
              type: tplData.kind || null,
              body: "",
              elementor_data: Array.isArray(tplData.data) ? (tplData.data as any[]) : null,
              render_mode: "elementor",
            };

            setPost(loadedPost);
            const parsedTree = Array.isArray(loadedPost.elementor_data) ? (loadedPost.elementor_data as any[]) : [];
            setTree(parsedTree);
            setBody("");
            setSource({ table: "elementor_templates", client: supabase });
            setEditorMode("elementor"); // Templates are always Elementor
            loaded = true;
          }
        } catch (e) {
          console.warn("Elementor template load attempt failed:", e);
        }
      }

      if (!loaded) {
        toast.error("Page not found");
      }
      setLoading(false);
    })();
  }, [id, nav]);

  const hasElementor = editorMode === "elementor";

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
      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (source.table === "elementor_templates") {
        payload.data = tree;
      } else {
        if (hasElementor) payload.elementor_data = tree;
        else payload.body = body;
      }
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

  const viewHref = post.slug === "" || post.slug === "home" 
    ? "/" 
    : (post.type === "post" ? `/blog/${post.slug}` : `/p/${post.slug}`);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-14 shrink-0 border-b flex items-center justify-between gap-3 px-4 bg-background select-none">
        <Button variant="ghost" size="sm" onClick={() => nav(source?.table === "elementor_templates" ? "/admin/theme-designer" : "/admin/posts?type=page")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {source?.table === "elementor_templates" ? "Theme Designer" : "Pages"}
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{post.title || "(untitled)"}</p>
          <p className="text-xs text-muted-foreground truncate">
            {editorMode === "elementor" ? "Elementor Mode" : "HTML Mode"} · /{post.slug || ""}
          </p>
        </div>

        {/* Editor Mode Selector */}
        <div className="flex items-center bg-muted p-1 rounded-md h-9 border">
          <button
            onClick={() => setEditorMode("elementor")}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              editorMode === "elementor"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Visual Editor
          </button>
          <button
            onClick={() => setEditorMode("html")}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              editorMode === "html"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            HTML Editor
          </button>
        </div>

        {viewHref && (
          <Button asChild variant="ghost" size="sm">
            <a href={viewHref}>
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
                {tree.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg m-8 bg-muted/20">
                    <LayoutTemplate className="w-12 h-12 text-blue-500 mb-4" />
                    <p className="font-medium text-lg text-foreground">Your Elementor Canvas is Empty</p>
                    <p className="text-sm text-muted-foreground text-center max-w-sm mt-1 mb-6">
                      Select a widget from the sidebar library to add it, or click one of the buttons below to quickly insert a layout.
                    </p>
                    <div className="flex gap-3">
                      <Button onClick={() => insertNode(createSectionNode(1))} size="sm">
                        Add 1-Column Section
                      </Button>
                      <Button onClick={() => insertNode(createSectionNode(2))} variant="outline" size="sm">
                        Add 2-Column Section
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ElementorRenderer data={tree} />
                )}
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
