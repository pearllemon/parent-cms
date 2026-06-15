// Floating toolbar that hovers near the selected node and exposes structural
// ops (move up/down, duplicate, delete). Rendered as a child of EditableShell
// when selected; positions itself relative to the wrapper.
import { ArrowUp, ArrowDown, Copy, Trash2 } from "lucide-react";
import { useEditor, type Path } from "./EditorContext";

export default function NodeToolbar({ path }: { path: Path }) {
  const ed = useEditor();
  if (!ed) return null;

  const run = (op: "moveUp" | "moveDown" | "duplicate" | "delete") => (e: React.MouseEvent) => {
    e.stopPropagation();
    ed.structural(path, op);
    if (op === "delete") ed.select(null);
  };

  const btn = "inline-flex items-center justify-center w-7 h-7 hover:bg-blue-600 transition";

  return (
    <div
      className="absolute -top-7 right-0 z-30 flex bg-blue-500 text-white rounded-sm shadow-md text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <button className={btn} title="Move up" onClick={run("moveUp")}>
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
      <button className={btn} title="Move down" onClick={run("moveDown")}>
        <ArrowDown className="w-3.5 h-3.5" />
      </button>
      <button className={btn} title="Duplicate" onClick={run("duplicate")}>
        <Copy className="w-3.5 h-3.5" />
      </button>
      <button className={btn + " hover:bg-red-600"} title="Delete" onClick={run("delete")}>
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
