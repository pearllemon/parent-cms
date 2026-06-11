// Universal page editor context.
// Holds the currently-selected node path and exposes patch helpers.
// AdminPageEditor owns the tree state and re-renders the page on patch.
import { createContext, useContext, useCallback, ReactNode } from "react";

export type Path = string[];

export type EditorCtx = {
  selected: Path | null;
  hovered: Path | null;
  select: (p: Path | null) => void;
  setHover: (p: Path | null) => void;
  patchAt: (path: Path, updater: (settings: any) => any) => void;
  getNodeAt: (path: Path) => any | null;
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

export function EditorProvider({
  children,
  selected,
  hovered,
  select,
  setHover,
  patchAt,
  getNodeAt,
}: EditorCtx & { children: ReactNode }) {
  // Stable memo not needed; AdminPageEditor passes stable callbacks.
  const value: EditorCtx = { selected, hovered, select, setHover, patchAt, getNodeAt };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Helpers for the panel layer
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
