// Universal page editor context.
// Holds the currently-selected node path and exposes patch + structural
// helpers (duplicate, delete, move, insert). AdminPageEditor owns the tree
// state; this module just describes the shape and provides pure helpers.
import { createContext, useContext, useCallback, ReactNode } from "react";

export type Path = string[];

export type StructuralOp = "duplicate" | "delete" | "moveUp" | "moveDown";

export type EditorCtx = {
  selected: Path | null;
  hovered: Path | null;
  select: (p: Path | null) => void;
  setHover: (p: Path | null) => void;
  patchAt: (path: Path, updater: (settings: any) => any) => void;
  getNodeAt: (path: Path) => any | null;
  // Structural ops — path points at the node being affected.
  structural: (path: Path, op: StructuralOp) => void;
  // Append a complete node (already shaped like an Elementor node) at the
  // root of the tree, or as the last child of `parentPath` if provided.
  insertNode: (node: any, parentPath?: Path) => void;
};

const Ctx = createContext<EditorCtx | null>(null);
export const useEditor = (): EditorCtx | null => useContext(Ctx);

export function findNode(tree: any[], path: Path): any | null {
  let nodes = tree;
  let node: any = null;
  for (const id of path) {
    node = (nodes || []).find((n: any) => n?.id === id);
    if (!node) return null;
    nodes = node.elements || [];
  }
  return node;
}

export function patchTree(
  tree: any[],
  path: Path,
  updater: (settings: any) => any
): any[] {
  if (!path.length) return tree;
  const [head, ...rest] = path;
  return tree.map((n) => {
    if (n?.id !== head) return n;
    if (rest.length === 0) {
      return { ...n, settings: updater(n.settings || {}) };
    }
    return { ...n, elements: patchTree(n.elements || [], rest, updater) };
  });
}

// -------- Structural helpers (pure) ---------------------------------------

function shortId(): string {
  // Elementor uses 7-char hex-ish ids; close enough.
  return Math.random().toString(36).slice(2, 9);
}

// Deep-clone a node and replace every nested `id` with a fresh one so React
// keys stay unique and future patches don't accidentally hit the original.
export function cloneWithNewIds(node: any): any {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(cloneWithNewIds);
  const out: any = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === "id") out.id = shortId();
    else if (k === "elements" && Array.isArray(v)) out.elements = v.map(cloneWithNewIds);
    else if (v && typeof v === "object") out[k] = cloneWithNewIds(v);
    else out[k] = v;
  }
  if (!out.id) out.id = shortId();
  return out;
}

// Apply a structural op to the tree at `path`.
// Returns the new tree.
export function applyStructural(
  tree: any[],
  path: Path,
  op: StructuralOp
): any[] {
  if (!path.length) return tree;
  const parentPath = path.slice(0, -1);
  const targetId = path[path.length - 1];

  const mutateSiblings = (siblings: any[]): any[] => {
    const idx = siblings.findIndex((n) => n?.id === targetId);
    if (idx === -1) return siblings;
    const next = siblings.slice();
    if (op === "delete") {
      next.splice(idx, 1);
    } else if (op === "duplicate") {
      const copy = cloneWithNewIds(next[idx]);
      next.splice(idx + 1, 0, copy);
    } else if (op === "moveUp" && idx > 0) {
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    } else if (op === "moveDown" && idx < next.length - 1) {
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    }
    return next;
  };

  if (parentPath.length === 0) return mutateSiblings(tree);

  // Walk down to parent and rewrite its `elements`
  const walk = (nodes: any[], depth: number): any[] => {
    const id = parentPath[depth];
    return nodes.map((n) => {
      if (n?.id !== id) return n;
      const children = n.elements || [];
      if (depth === parentPath.length - 1) {
        return { ...n, elements: mutateSiblings(children) };
      }
      return { ...n, elements: walk(children, depth + 1) };
    });
  };
  return walk(tree, 0);
}

// Insert a fully-formed node into the tree (root or specified parent).
export function applyInsert(
  tree: any[],
  node: any,
  parentPath?: Path
): any[] {
  const fresh = cloneWithNewIds(node);
  if (!parentPath || parentPath.length === 0) return [...tree, fresh];
  const walk = (nodes: any[], depth: number): any[] => {
    const id = parentPath[depth];
    return nodes.map((n) => {
      if (n?.id !== id) return n;
      const children = n.elements || [];
      if (depth === parentPath.length - 1) {
        return { ...n, elements: [...children, fresh] };
      }
      return { ...n, elements: walk(children, depth + 1) };
    });
  };
  return walk(tree, 0);
}

// -------- Provider --------------------------------------------------------

export function EditorProvider({
  children,
  selected,
  hovered,
  select,
  setHover,
  patchAt,
  getNodeAt,
  structural,
  insertNode,
}: EditorCtx & { children: ReactNode }) {
  const value: EditorCtx = {
    selected, hovered, select, setHover, patchAt, getNodeAt, structural, insertNode,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// -------- Hooks -----------------------------------------------------------

export function useSelectedNode(): { path: Path | null; node: any | null } {
  const ed = useEditor();
  if (!ed?.selected) return { path: null, node: null };
  return { path: ed.selected, node: ed.getNodeAt(ed.selected) };
}

export function usePatchSelected() {
  const ed = useEditor();
  return useCallback(
    (updater: (s: any) => any) => {
      if (!ed?.selected) return;
      ed.patchAt(ed.selected, updater);
    },
    [ed]
  );
}
