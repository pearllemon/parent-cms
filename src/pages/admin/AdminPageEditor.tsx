// Universal inline page editor.
// Loads an imported_post by id, renders it (Elementor-aware), lets the user
// click any element to edit it in the right-side panel, then saves back to
// the same row in the database. Works for Elementor pages (elementor_data)
// and plain HTML pages (body).
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { ArrowLeft, ExternalLink, Save, LayoutTemplate, Sparkles, Copy, Check, Terminal, Undo2, Redo2, Upload, Monitor, Tablet, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type ImportedPost = {
  id: string;
  title: string;
  slug: string | null;
  type: string | null;
  body: string | null;
  elementor_data: any[] | null;
  render_mode: string | null;
  template?: string | null;
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
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const forcedMode = searchParams.get("mode");
  const [editorMode, setEditorMode] = useState<"elementor" | "html">(forcedMode === "html" ? "html" : "elementor");

  // History stacks
  const [pastTrees, setPastTrees] = useState<any[][]>([]);
  const [futureTrees, setFutureTrees] = useState<any[][]>([]);
  const [pastBodies, setPastBodies] = useState<string[]>([]);
  const [futureBodies, setFutureBodies] = useState<string[]>([]);
  const ignoreHistory = useRef(false);

  // Homepage status settings
  const [isHomepage, setIsHomepage] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>(null);

  // Fetch site settings to check if this page is set as the homepage
  useEffect(() => {
    if (!post?.id || !source?.client) return;
    void (async () => {
      const client = source.client as any;
      const { data } = await client
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (data) {
        setSiteSettings(data);
        const extras = data.extras || {};
        setIsHomepage(extras.homepage_page_id === post.id);
      }
    })();
  }, [post?.id, source?.client]);

  // Set forced mode if query param is present
  useEffect(() => {
    if (forcedMode === "elementor") setEditorMode("elementor");
    else if (forcedMode === "html") setEditorMode("html");
  }, [forcedMode]);

  // Debounced history for HTML body
  useEffect(() => {
    if (editorMode !== "html") return;
    if (ignoreHistory.current) {
      ignoreHistory.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPastBodies((p) => {
        const last = p[p.length - 1];
        if (last !== body) {
          const next = [...p, body];
          if (next.length > 50) next.shift();
          return next;
        }
        return p;
      });
      setFutureBodies([]);
    }, 1000);
    return () => clearTimeout(timer);
  }, [body, editorMode]);

  const undo = () => {
    if (editorMode === "elementor") {
      if (pastTrees.length === 0) return;
      const prev = pastTrees[pastTrees.length - 1];
      setFutureTrees(f => [JSON.parse(JSON.stringify(tree)), ...f]);
      setTree(prev);
      setPastTrees(p => p.slice(0, -1));
    } else {
      if (pastBodies.length <= 1) return;
      ignoreHistory.current = true;
      const current = body;
      const previous = pastBodies[pastBodies.length - 2];
      setBody(previous);
      setFutureBodies(f => [current, ...f]);
      setPastBodies(p => p.slice(0, -1));
    }
    setDirty(true);
  };

  const redo = () => {
    if (editorMode === "elementor") {
      if (futureTrees.length === 0) return;
      const next = futureTrees[0];
      setPastTrees(p => [...p, JSON.parse(JSON.stringify(tree))]);
      setTree(next);
      setFutureTrees(f => f.slice(1));
    } else {
      if (futureBodies.length === 0) return;
      ignoreHistory.current = true;
      const next = futureBodies[0];
      setBody(next);
      setPastBodies(p => [...p, next]);
      setFutureBodies(f => f.slice(1));
    }
    setDirty(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const raw = JSON.parse(evt.target?.result as string);
        let importedTree = null;
        
        if (Array.isArray(raw)) {
          if (raw[0] && typeof raw[0] === "object" && raw[0].content) {
            importedTree = raw[0].content;
          } else {
            importedTree = raw;
          }
        } else if (raw && typeof raw === "object") {
          importedTree = raw.content || raw.elements || (raw.page && raw.page.content) || (raw.data && raw.data.content);
          if (!importedTree && raw.elType) {
            importedTree = [raw];
          }
        }

        if (!Array.isArray(importedTree)) {
          throw new Error("Could not find a valid Elementor element list in this JSON.");
        }

        setPastTrees((p) => [...p, JSON.parse(JSON.stringify(tree))]);
        setFutureTrees([]);
        setTree(importedTree);
        setDirty(true);
        toast.success("Elementor JSON imported successfully");
      } catch (err: any) {
        toast.error("Invalid Elementor JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const htmlToElementorTree = (html: string): any[] => {
    if (!html) return [];
    return [
      {
        id: "sec_" + Math.random().toString(36).substr(2, 9),
        elType: "section",
        settings: {
          layout: "full-width",
          padding: "0px",
        },
        elements: [
          {
            id: "col_" + Math.random().toString(36).substr(2, 9),
            elType: "column",
            settings: {
              _column_size: 100,
            },
            elements: [
              {
                id: "wg_" + Math.random().toString(36).substr(2, 9),
                elType: "widget",
                widgetType: "html",
                settings: {
                  html: html,
                },
              }
            ]
          }
        ]
      }
    ];
  };

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
          .select("id,title,slug,type,body,template")
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
            template: baseData.template || "default",
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
          let parsedTree = Array.isArray(loadedPost.elementor_data) ? (loadedPost.elementor_data as any[]) : [];
          if (parsedTree.length === 0 && loadedPost.body) {
            parsedTree = htmlToElementorTree(loadedPost.body);
          }
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
              template: "default",
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
            let parsedTree = Array.isArray(loadedPost.elementor_data) ? (loadedPost.elementor_data as any[]) : [];
            if (parsedTree.length === 0 && loadedPost.body) {
              parsedTree = htmlToElementorTree(loadedPost.body);
            }
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
      setPastTrees((p) => [...p, JSON.parse(JSON.stringify(t))]);
      setFutureTrees([]);
      const next = patchTree(t, path, updater);
      return next;
    });
    setDirty(true);
  }, []);

  const getNodeAt = useCallback((p: Path) => findNode(tree, p), [tree]);

  const structural = useCallback((path: Path, op: StructuralOp) => {
    setTree((t) => {
      setPastTrees((p) => [...p, JSON.parse(JSON.stringify(t))]);
      setFutureTrees([]);
      return applyStructural(t, path, op);
    });
    setDirty(true);
    setSelected(null);
  }, []);

  const insertNode = useCallback((node: any, parentPath?: Path) => {
    setTree((t) => {
      setPastTrees((p) => [...p, JSON.parse(JSON.stringify(t))]);
      setFutureTrees([]);
      return applyInsert(t, node, parentPath);
    });
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
        
        if (source.table === "posts") {
          payload.template = post.template || "default";
        }
      }
      const client = source.client as any;
      const res = await client.from(source.table).update(payload).eq("id", post.id);
      error = res.error;
    }

    if (!error && siteSettings && source?.client) {
      const client = source.client as any;
      const nextExtras = { ...(siteSettings.extras || {}) };
      if (isHomepage) {
        nextExtras.homepage_page_id = post.id;
      } else if (nextExtras.homepage_page_id === post.id) {
        nextExtras.homepage_page_id = null;
      }
      const { error: settingsError } = await client
        .from("site_settings")
        .update({ extras: nextExtras })
        .eq("id", siteSettings.id);
      if (settingsError) {
        console.error("Failed to update homepage setting:", settingsError);
      } else {
        setSiteSettings((prev: any) => prev ? { ...prev, extras: nextExtras } : prev);
      }
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

        <div className="flex gap-0.5 border rounded p-0.5 bg-muted/40">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={undo} disabled={editorMode === "elementor" ? pastTrees.length === 0 : pastBodies.length <= 1} title="Undo (Ctrl+Z)">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={redo} disabled={editorMode === "elementor" ? futureTrees.length === 0 : futureBodies.length === 0} title="Redo (Ctrl+Y)">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {editorMode === "elementor" && (
          <div className="flex bg-muted p-0.5 rounded-md h-8 border">
            <Button
              variant={device === "desktop" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setDevice("desktop")}
              title="Desktop View"
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={device === "tablet" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setDevice("tablet")}
              title="Tablet View"
            >
              <Tablet className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={device === "mobile" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setDevice("mobile")}
              title="Mobile View"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {source?.table !== "elementor_templates" && (
          <div className="flex items-center gap-4 border-l border-r px-3 h-9">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Hide Header & Footer</span>
              <Switch
                checked={post.template === "canvas"}
                onCheckedChange={(checked) => {
                  setPost((prev) => ({ ...prev, template: checked ? "canvas" : "default" }));
                  setDirty(true);
                }}
              />
            </div>
            <div className="flex items-center gap-2 border-l pl-3">
              <span className="text-xs font-medium text-muted-foreground">Make Homepage</span>
              <Switch
                checked={isHomepage}
                onCheckedChange={(checked) => {
                  setIsHomepage(checked);
                  setDirty(true);
                }}
              />
            </div>
          </div>
        )}

        {editorMode === "elementor" && (
          <div className="relative">
            <input
              type="file"
              accept=".json"
              id="elementor-json-import"
              className="hidden"
              onChange={handleImportJson}
            />
            <Button size="sm" variant="outline" asChild>
              <label htmlFor="elementor-json-import" className="cursor-pointer flex items-center">
                <Upload className="h-4 w-4 mr-1" /> Import JSON
              </label>
            </Button>
          </div>
        )}
        
        <AiCopilotDialog
          tree={tree}
          body={body}
          editorMode={editorMode}
          title={post.title}
          onApply={(newTree, newBody) => {
            if (editorMode === "elementor") {
              setPastTrees((p) => [...p, JSON.parse(JSON.stringify(tree))]);
              setFutureTrees([]);
              setTree(newTree);
            } else {
              setPastBodies((p) => [...p, body]);
              setFutureBodies([]);
              setBody(newBody);
            }
            setDirty(true);
          }}
        />

        <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
      </header>

      {/* Body: canvas + side panel */}
      <div className="flex-1 flex min-h-0 bg-muted/30">
        <main className="flex-1 overflow-auto flex justify-center p-4">
          <div 
            className="bg-background min-h-full shadow-lg transition-all duration-300 w-full"
            style={{
              width: device === "mobile" ? "375px" : device === "tablet" ? "768px" : "100%",
              maxWidth: "100%",
            }}
          >
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

// ========= AI Design Copilot Helpers & Components =========

function convertToMarkdown(tree: any[], htmlBody: string, mode: "elementor" | "html"): string {
  if (mode === "html") {
    let md = htmlBody || "";
    md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
    md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<br\s*\/?>/gi, '\n');
    md = md.replace(/<[^>]+>/g, ''); 
    return md.trim();
  }

  const lines: string[] = [];
  const traverse = (nodes: any[]) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (node.type === "heading") {
        const level = node.props?.level || 2;
        const hash = "#".repeat(level);
        lines.push(`${hash} ${node.props?.text || ""}\n`);
      } else if (node.type === "text") {
        lines.push(`${node.props?.text || ""}\n`);
      } else if (node.type === "button") {
        lines.push(`[${node.props?.text || ""}](${node.props?.href || "#"})\n`);
      } else if (node.type === "image") {
        lines.push(`![${node.props?.alt || ""}](${node.props?.src || ""})\n`);
      } else if (node.type === "accordion") {
        lines.push(`## FAQs\n`);
        const items = node.props?.items || [];
        for (const item of items) {
          lines.push(`**Q: ${item.title || ""}**\n\n${item.content || ""}\n\n---\n`);
        }
      } else if (node.type === "contact-section") {
        lines.push(`## ${node.props?.title || "Get in Touch"}\n\n${node.props?.subtitle || ""}\n\n`);
        if (node.props?.address) lines.push(`- Address: ${node.props.address}\n`);
        if (node.props?.phone) lines.push(`- Phone: ${node.props.phone}\n`);
        if (node.props?.email) lines.push(`- Email: ${node.props.email}\n`);
        if (node.props?.hours) lines.push(`- Hours: ${node.props.hours}\n`);
        lines.push(`\n📋 **Contact Form**\n`);
      } else if (node.type === "blog-section") {
        lines.push(`## ${node.props?.title || "Latest News"}\n\n${node.props?.subtitle || ""}\n\n- [Dynamic Blog Posts Grid]\n`);
      }
      if (node.children) traverse(node.children);
    }
  };
  traverse(tree);
  return lines.join("\n");
}

interface AiCopilotProps {
  tree: any[];
  body: string;
  editorMode: "elementor" | "html";
  title: string;
  onApply: (newTree: any[], newBody: string) => void;
}

function AiCopilotDialog({ tree, body, editorMode, title, onApply }: AiCopilotProps) {
  const [open, setOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [importText, setImportText] = useState("");

  const getMarkdown = () => {
    return convertToMarkdown(tree, body, editorMode);
  };

  const getDesign = () => {
    if (editorMode === "elementor") {
      return JSON.stringify(tree, null, 2);
    }
    return JSON.stringify({ html: body }, null, 2);
  };

  const getSchema = () => {
    const data = {
      currentPage: {
        title,
        editorMode,
        blocks: editorMode === "elementor" ? tree : [{ type: "html", props: { code: body } }]
      },
      availableWidgets: [
        {
          type: "section",
          description: "Top-level layout section wrapper.",
          properties: {
            padding: "string (e.g. '64px 24px')",
            background: "string (color hex or url)"
          }
        },
        {
          type: "container",
          description: "Flex container for grouping elements inside a section.",
          properties: {
            maxWidth: "string (e.g. '1100px')",
            direction: "row | column",
            gap: "string (e.g. '24px')",
            alignItems: "string",
            justifyContent: "string"
          }
        },
        {
          type: "heading",
          description: "Heading text.",
          properties: {
            text: "string",
            level: "number (1-6)",
            fontSize: "number (px)",
            color: "string",
            align: "left | center | right | justify"
          }
        },
        {
          type: "text",
          description: "Rich text paragraph.",
          properties: {
            text: "string",
            fontSize: "number (px)",
            color: "string",
            align: "left | center | right | justify"
          }
        },
        {
          type: "image",
          description: "Image element.",
          properties: {
            src: "string (url)",
            alt: "string",
            width: "string (e.g. '100%')"
          }
        },
        {
          type: "button",
          description: "Interactive button link.",
          properties: {
            text: "string",
            href: "string",
            bg: "string (color)",
            color: "string (color)"
          }
        },
        {
          type: "html",
          description: "Custom raw HTML block.",
          properties: {
            code: "string"
          }
        },
        {
          type: "form",
          description: "Lead form block.",
          properties: {
            formSlug: "string (e.g. 'contact')"
          }
        }
      ]
    };
    return JSON.stringify(data, null, 2);
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleApply = () => {
    try {
      const parsed = JSON.parse(importText);
      if (editorMode === "elementor") {
        let newTree: any[] = [];
        if (Array.isArray(parsed)) {
          newTree = parsed;
        } else if (parsed && Array.isArray(parsed.blocks)) {
          newTree = parsed.blocks;
        } else if (parsed && parsed.currentPage && Array.isArray(parsed.currentPage.blocks)) {
          newTree = parsed.currentPage.blocks;
        } else {
          throw new Error("Could not find a valid blocks array in the pasted JSON.");
        }
        onApply(newTree, "");
      } else {
        let newHtml = "";
        if (typeof parsed === "string") {
          newHtml = parsed;
        } else if (parsed && typeof parsed.html === "string") {
          newHtml = parsed.html;
        } else if (parsed && parsed.currentPage && typeof parsed.currentPage.body === "string") {
          newHtml = parsed.currentPage.body;
        } else {
          throw new Error("Could not find html content in the pasted JSON.");
        }
        onApply([], newHtml);
      }
      toast.success("Design applied successfully!");
      setOpen(false);
    } catch (e: any) {
      toast.error("Failed to parse and apply: " + e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 border-orange-200 hover:border-orange-300 hover:bg-orange-50/50">
          <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
          AI Copilot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            AI Design Copilot
          </DialogTitle>
          <DialogDescription>
            Copy your page content or layout, paste it into ChatGPT/Claude to design it, and paste it back here to apply instantly.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="copy" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="copy">1. Copy to AI</TabsTrigger>
            <TabsTrigger value="apply">2. Paste from AI</TabsTrigger>
          </TabsList>

          <TabsContent value="copy" className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold text-sm">Copy Page Text</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Copy only the headings and text paragraphs as clean Markdown. Best for rewriting content.
                  </p>
                </div>
                <Button size="sm" className="w-full" onClick={() => handleCopy(getMarkdown(), "md")}>
                  {copiedType === "md" ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copiedType === "md" ? "Copied" : "Copy Markdown"}
                </Button>
              </div>

              <div className="border rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold text-sm">Copy Design + Text</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Copy the current layout blocks and content as JSON. Best for AI to reorganize sections.
                  </p>
                </div>
                <Button size="sm" className="w-full" onClick={() => handleCopy(getDesign(), "design")}>
                  {copiedType === "design" ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copiedType === "design" ? "Copied" : "Copy Design JSON"}
                </Button>
              </div>

              <div className="border rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold text-sm">Copy Design + Widgets</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Copy layout, text, and the schema of all available widgets. Best for AI to generate new sections.
                  </p>
                </div>
                <Button size="sm" className="w-full" onClick={() => handleCopy(getSchema(), "schema")}>
                  {copiedType === "schema" ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copiedType === "schema" ? "Copied" : "Copy Full Package"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="apply" className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-orange-500" />
                Paste redesigned JSON from AI:
              </label>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={
                  editorMode === "elementor" 
                    ? "Paste the redesigned blocks array or full package JSON here..." 
                    : "Paste the raw HTML or JSON with html property here..."
                }
                className="font-mono text-xs h-60 bg-slate-950 text-slate-200 placeholder:text-slate-600"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleApply} disabled={!importText.trim()} className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold">
                Apply Design
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
