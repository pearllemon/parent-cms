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
import { ArrowLeft, ExternalLink, Save, LayoutTemplate, Sparkles, Copy, Check, Terminal } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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
        
        <AiCopilotDialog
          tree={tree}
          body={body}
          editorMode={editorMode}
          title={post.title}
          onApply={(newTree, newBody) => {
            if (editorMode === "elementor") {
              setTree(newTree);
            } else {
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
