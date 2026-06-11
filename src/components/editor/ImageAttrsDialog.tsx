// Image attributes dialog used by the TipTap editor.
// Lets the user set src/alt/title, choose a width preset
// (25/50/75/100% or custom px) and an alignment.

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlignLeft, AlignCenter, AlignRight, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ImageAttrs = { src: string; alt?: string; title?: string; width?: string; align?: "left" | "center" | "right" };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<ImageAttrs>;
  onApply: (attrs: ImageAttrs) => void;
  onPickFromLibrary?: () => Promise<string | null>;
};

const WIDTHS = ["25%", "50%", "75%", "100%"];

export default function ImageAttrsDialog({ open, onOpenChange, initial, onApply, onPickFromLibrary }: Props) {
  const [src, setSrc] = useState(initial?.src || "");
  const [alt, setAlt] = useState(initial?.alt || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [width, setWidth] = useState(initial?.width || "100%");
  const [align, setAlign] = useState<ImageAttrs["align"]>(initial?.align || "center");

  useEffect(() => {
    if (!open) return;
    setSrc(initial?.src || ""); setAlt(initial?.alt || ""); setTitle(initial?.title || "");
    setWidth(initial?.width || "100%"); setAlign((initial?.align as any) || "center");
  }, [open, initial]);

  const pick = async () => { if (onPickFromLibrary) { const u = await onPickFromLibrary(); if (u) setSrc(u); } };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Image settings</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Image URL</Label>
            <div className="flex gap-2">
              <Input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="https://…" />
              {onPickFromLibrary && <Button type="button" variant="outline" onClick={pick}>Media…</Button>}
            </div>
          </div>

          {src && (
            <div className={cn("border rounded p-2 bg-muted/30 flex", align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center")}>
              <img src={src} alt={alt} title={title} style={{ width, maxWidth: "100%", height: "auto", borderRadius: 6 }} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Alt text</Label>
              <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image" />
            </div>
            <div>
              <Label className="text-xs">Title (tooltip)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Width</Label>
              <div className="flex gap-1 mt-1">
                {WIDTHS.map((w) => (
                  <Button key={w} type="button" size="sm" variant={width === w ? "default" : "outline"} onClick={() => setWidth(w)}>{w}</Button>
                ))}
              </div>
              <Input className="mt-2" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="e.g. 480px or 80%" />
            </div>
            <div>
              <Label className="text-xs">Alignment</Label>
              <div className="flex gap-1 mt-1">
                <Button type="button" size="sm" variant={align === "left" ? "default" : "outline"} onClick={() => setAlign("left")}><AlignLeft className="w-4 h-4" /></Button>
                <Button type="button" size="sm" variant={align === "center" ? "default" : "outline"} onClick={() => setAlign("center")}><AlignCenter className="w-4 h-4" /></Button>
                <Button type="button" size="sm" variant={align === "right" ? "default" : "outline"} onClick={() => setAlign("right")}><AlignRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={() => { if (!src.trim()) return; onApply({ src: src.trim(), alt, title, width, align }); onOpenChange(false); }} disabled={!src.trim()}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
