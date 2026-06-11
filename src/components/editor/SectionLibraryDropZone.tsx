// "Add section from library" drop zone shown at the bottom of the canvas in
// edit mode. Loads reusable sections from elementor_templates and inserts
// them into the page tree on click (with fresh ids).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEditor } from "./EditorContext";
import { Plus, Library, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Template = {
  id: string;
  title: string | null;
  template_type: string | null;
  data: any;
};

export default function SectionLibraryDropZone() {
  const ed = useEditor();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open || templates.length) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("elementor_templates")
        .select("id,title,template_type,data")
        .limit(500);
      setLoading(false);
      if (error) return;
      setTemplates((data || []) as Template[]);
    })();
  }, [open, templates.length]);

  if (!ed) return null;

  const filtered = templates.filter((t) =>
    !q || (t.title || "").toLowerCase().includes(q.toLowerCase())
  );

  const insertTemplate = (t: Template) => {
    const rootNodes = Array.isArray(t.data) ? t.data : [];
    for (const node of rootNodes) ed.insertNode(node);
    setOpen(false);
  };

  return (
    <>
      <div className="container py-10 flex justify-center">
        <Button variant="outline" onClick={() => setOpen(true)} className="border-dashed">
          <Plus className="w-4 h-4 mr-2" /> Add section from library
        </Button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center gap-3">
              <Library className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Section library</p>
                <p className="text-xs text-muted-foreground">
                  {templates.length} reusable {templates.length === 1 ? "template" : "templates"} from your Elementor import
                </p>
              </div>
              <Input
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-48"
              />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}
              {!loading && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No templates found. Import an Elementor kit first.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => insertTemplate(t)}
                    className="text-left border rounded-md p-3 hover:border-blue-500 hover:bg-muted/50 transition"
                  >
                    <p className="font-medium truncate">{t.title || "(untitled)"}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {t.template_type || "section"} · {Array.isArray(t.data) ? t.data.length : 0} root nodes
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
