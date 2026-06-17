// Visual canvas: click-to-select block editor with inspector panel.
// - JSON block tree (section / container / heading / text / image / button).
// - Click to select; right-side inspector with Layout / Style / Image / Text tabs.
// - Drag-and-drop reordering within any parent (dnd-kit).
// - Inline contenteditable for heading / text / button text when the block is selected.
// - Device toggle (Desktop / Tablet / Mobile) constrains canvas width.
// - Variants switcher in the left rail.
// - Media Library popup for image blocks.

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import MediaPicker from "@/components/admin/MediaPicker";
import SectionLibraryDialog from "@/components/admin/SectionLibraryDialog";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Monitor, Tablet, Smartphone, Trash2, ArrowUp, ArrowDown, Plus,
  Copy, Image as ImageIcon, Type, Square, Heading1, MousePointerClick, Layers, GripVertical, Code2, LibraryBig, Upload,
} from "lucide-react";
import { saveLocalSection, submitSectionToParent, type SectionTemplate } from "@/lib/sectionLibrary";
import { toast as sonner } from "sonner";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type BlockType = "section" | "container" | "heading" | "text" | "image" | "button" | "html";
export type Block = {
  id: string;
  type: BlockType;
  props: Record<string, any>;
  children?: Block[];
};

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 768, mobile: 375 };

// Resolve per-device overrides: props.responsive?.tablet|mobile are shallow-merged
// over the base props. Desktop reads base props as-is.
function effProps(block: Block, device: Device): Record<string, any> {
  const base = block.props || {};
  if (device === "desktop") return base;
  const overrides = (base.responsive && base.responsive[device]) || {};
  return { ...base, ...overrides };
}

// Should the block be hidden at the current preview device? Reads
// effective visibility (which may be overridden per device).
function isHidden(block: Block, device: Device): boolean {
  const v = effProps(block, device).visibility;
  if (!v || v === "all") return false;
  if (v === "hidden") return true;
  if (v === "desktop-only") return device !== "desktop";
  if (v === "tablet-only")  return device !== "tablet";
  if (v === "mobile-only")  return device !== "mobile";
  return false;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const newBlock = (type: BlockType): Block => {
  const base: Record<BlockType, Block> = {
    section:   { id: uid(), type, props: { padding: "64px 24px", background: "#ffffff" }, children: [] },
    container: { id: uid(), type, props: { maxWidth: "1100px", padding: "0", display: "flex", gap: "24px", direction: "column" }, children: [] },
    heading:   { id: uid(), type, props: { text: "Headline", level: 2, fontSize: 40, color: "#0f172a", align: "left", fontWeight: 700 } },
    text:      { id: uid(), type, props: { text: "Paragraph text goes here.", fontSize: 16, color: "#475569", align: "left", lineHeight: 1.6 } },
    image:     { id: uid(), type, props: { src: "", alt: "", width: "100%", height: "auto", fit: "cover", radius: 8 } },
    button:    { id: uid(), type, props: { text: "Click me", href: "#", bg: "#0f172a", color: "#ffffff", radius: 6, padding: "12px 24px" } },
    html:      { id: uid(), type, props: { code: "<div>Custom HTML here</div>" } },
  };
  return base[type];
};

// --------- Tree utilities ---------
function findBlock(tree: Block[], id: string): { block: Block; parent: Block[]; index: number } | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) return { block: tree[i], parent: tree, index: i };
    if (tree[i].children) {
      const r = findBlock(tree[i].children!, id);
      if (r) return r;
    }
  }
  return null;
}
function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

// =================== Component ===================
type Props = {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  variants?: { id: string; name: string; blocks: Block[] }[];
  activeVariantId?: string | null;
  onVariantChange?: (id: string | null) => void;
  onSaveVariant?: () => void;
};

export default function VisualCanvas({ blocks, onChange, variants = [], activeVariantId = null, onVariantChange, onSaveVariant }: Props) {
  const [device, setDevice] = useState<Device>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const selected = useMemo(() => (selectedId ? findBlock(blocks, selectedId) : null), [blocks, selectedId]);

  const update = (mut: (tree: Block[]) => void) => {
    const next = clone(blocks);
    mut(next);
    onChange(next);
  };

  const addBlock = (type: BlockType) => {
    update((tree) => {
      const b = newBlock(type);
      const sel = selectedId ? findBlock(tree, selectedId) : null;
      if (sel) {
        if (sel.block.type === "section" || sel.block.type === "container") {
          sel.block.children = sel.block.children || [];
          sel.block.children.push(b);
        } else {
          sel.parent.splice(sel.index + 1, 0, b);
        }
      } else tree.push(b);
      setSelectedId(b.id);
    });
  };

  const removeSelected = () => {
    if (!selected) return;
    update((tree) => {
      const r = findBlock(tree, selected.block.id);
      if (r) r.parent.splice(r.index, 1);
    });
    setSelectedId(null);
  };

  const move = (dir: -1 | 1) => {
    if (!selected) return;
    update((tree) => {
      const r = findBlock(tree, selected.block.id);
      if (!r) return;
      const ni = r.index + dir;
      if (ni < 0 || ni >= r.parent.length) return;
      const [item] = r.parent.splice(r.index, 1);
      r.parent.splice(ni, 0, item);
    });
  };

  const duplicate = () => {
    if (!selected) return;
    update((tree) => {
      const r = findBlock(tree, selected.block.id);
      if (!r) return;
      const copy = clone(r.block);
      const reId = (b: Block) => { b.id = uid(); b.children?.forEach(reId); };
      reId(copy);
      r.parent.splice(r.index + 1, 0, copy);
    });
  };

  // Insert a library section's blocks at the root (or after selected top-level block).
  const insertSection = (sectionBlocks: any[]) => {
    update((tree) => {
      const reId = (b: Block) => { b.id = uid(); b.children?.forEach(reId); };
      const cloned: Block[] = clone(sectionBlocks || []);
      cloned.forEach(reId);
      tree.push(...cloned);
    });
    setLibraryOpen(false);
  };

  // Save the currently selected section (or whole tree) as a local template.
  const saveAsSection = async () => {
    const tree: Block[] = selected
      ? (selected.block.type === "section" ? [selected.block] : [selected.block])
      : blocks;
    if (!tree.length) return sonner.error("Nothing to save");
    const name = window.prompt("Section name", "Untitled section");
    if (!name) return;
    const category = window.prompt("Category (hero, testimonials, cta, faq, pricing, gallery, footer, general)", "general") || "general";
    try {
      const saved = await saveLocalSection({ name, category, blocks: tree });
      sonner.success("Saved to local library");
      if (window.confirm("Submit this section to the Parent library for approval?")) {
        await submitSectionToParent(saved!);
        sonner.success("Submitted — pending parent approval");
      }
    } catch (e: any) {
      sonner.error(e?.message || "Save failed");
    }
  };

  const updateSelected = (patch: Record<string, any>) => {
    if (!selected) return;
    update((tree) => {
      const r = findBlock(tree, selected.block.id);
      if (!r) return;
      if (device === "desktop") {
        r.block.props = { ...r.block.props, ...patch };
      } else {
        const responsive = { ...(r.block.props.responsive || {}) };
        responsive[device] = { ...(responsive[device] || {}), ...patch };
        r.block.props = { ...r.block.props, responsive };
      }
    });
  };

  // Inline text edit commit
  const commitText = (id: string, text: string) => {
    update((tree) => {
      const r = findBlock(tree, id);
      if (r) r.block.props = { ...r.block.props, text };
    });
  };

  // Drag-and-drop reorder. Only allows reordering when both items share the same parent list.
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    update((tree) => {
      const a = findBlock(tree, String(active.id));
      const b = findBlock(tree, String(over.id));
      if (!a || !b) return;
      if (a.parent !== b.parent) return;
      const reordered = arrayMove(a.parent, a.index, b.index);
      a.parent.length = 0;
      reordered.forEach((x) => a.parent.push(x));
    });
  };

  return (
    <div className="flex h-[78vh] gap-3 border rounded-lg overflow-hidden bg-background">
      {/* Left rail */}
      <div className="w-44 border-r bg-muted/40 p-2 space-y-3 overflow-y-auto">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pb-1">Add block</p>
          <div className="grid grid-cols-2 gap-1">
            <InsertBtn label="Section" Icon={Square} onClick={() => addBlock("section")} />
            <InsertBtn label="Group" Icon={Layers} onClick={() => addBlock("container")} />
            <InsertBtn label="Heading" Icon={Heading1} onClick={() => addBlock("heading")} />
            <InsertBtn label="Text" Icon={Type} onClick={() => addBlock("text")} />
            <InsertBtn label="Image" Icon={ImageIcon} onClick={() => addBlock("image")} />
            <InsertBtn label="Button" Icon={MousePointerClick} onClick={() => addBlock("button")} />
            <InsertBtn label="HTML" Icon={Code2} onClick={() => addBlock("html")} />
          </div>
          <Button size="sm" variant="outline" className="w-full mt-2 h-8 text-xs" onClick={() => setLibraryOpen(true)}>
            <LibraryBig className="w-3.5 h-3.5 mr-1" /> Section library
          </Button>
        </div>

        {(variants.length > 0 || onSaveVariant) && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pb-1">Variants</p>
            <div className="space-y-1">
              <button onClick={() => onVariantChange?.(null)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded ${activeVariantId === null ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                Default
              </button>
              {variants.map((v) => (
                <button key={v.id} onClick={() => onVariantChange?.(v.id)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded ${activeVariantId === v.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  {v.name}
                </button>
              ))}
              {onSaveVariant && (
                <Button size="sm" variant="outline" className="w-full mt-1 h-7 text-xs" onClick={onSaveVariant}>
                  <Plus className="w-3 h-3 mr-1" /> Save as variant
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground px-1 leading-relaxed">
          Tip: drag the grip handle to reorder. Double-click text to edit inline.
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
          <div className="flex gap-1 bg-background rounded border p-0.5">
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
              const I = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
              return (
                <button key={d} onClick={() => setDevice(d)} title={d}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${device === d ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <I className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
          <span className="text-xs text-muted-foreground">{DEVICE_WIDTH[device]}px</span>
          <div className="flex-1" />
          {selected && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(-1)} title="Move up"><ArrowUp className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => move(1)} title="Move down"><ArrowDown className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={duplicate} title="Duplicate"><Copy className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={saveAsSection} title="Save as section"><Upload className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={removeSelected} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-muted/20 p-6 flex justify-center">
          <div
            className="bg-white shadow-sm border transition-all"
            style={{ width: DEVICE_WIDTH[device], maxWidth: "100%", minHeight: 400 }}
            onClick={() => setSelectedId(null)}
          >
            {blocks.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Button size="sm" variant="outline" onClick={() => addBlock("section")}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add first section
                </Button>
              </div>
            ) : (
              <>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableList
                    items={blocks}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onCommitText={commitText}
                  device={device}
                  />
                </DndContext>
                <div className="flex items-center justify-center py-3 group">
                  <button
                    onClick={(e) => { e.stopPropagation(); addBlock("section"); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground border border-dashed border-muted-foreground/30 rounded-full px-3 py-1 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                    title="Add new section"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add section
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Inspector */}
      <div className="w-72 border-l bg-muted/40 overflow-y-auto">
        {!selected ? (
          <div className="p-4 text-sm text-muted-foreground">Click a block to edit.</div>
        ) : (
          <Inspector block={selected.block} device={device} onChange={updateSelected} />
        )}
      </div>

      <SectionLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onInsert={insertSection}
      />
    </div>
  );
}

function InsertBtn({ label, Icon, onClick }: { label: string; Icon: any; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1 py-2 px-1 rounded bg-background hover:bg-primary hover:text-primary-foreground text-[11px] border">
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

// ============== Sortable list (wraps children) ==============
type ListProps = {
  items: Block[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCommitText: (id: string, text: string) => void;
  device: Device;
};

function SortableList({ items, selectedId, onSelect, onCommitText, device }: ListProps) {
  return (
    <SortableContext items={items.map((b) => b.id)} strategy={verticalListSortingStrategy}>
      {items.map((b) => (
        <SortableBlock key={b.id} block={b} selectedId={selectedId} onSelect={onSelect} onCommitText={onCommitText} device={device} />
      ))}
    </SortableContext>
  );
}

function SortableBlock(props: { block: Block; selectedId: string | null; onSelect: (id: string) => void; onCommitText: (id: string, text: string) => void; device: Device }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.block.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
  };
  if (isHidden(props.block, props.device)) return null;
  return (
    <div ref={setNodeRef} style={style} className="group/blk">
      <button
        type="button"
        {...attributes} {...listeners}
        className="absolute -left-5 top-1 z-10 hidden group-hover/blk:flex items-center justify-center w-4 h-5 rounded bg-foreground/80 text-background cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        title="Drag to reorder"
      >
        <GripVertical className="w-3 h-3" />
      </button>
      <RenderBlock {...props} />
    </div>
  );
}

// ============== Render ==============
function RenderBlock({ block, selectedId, onSelect, onCommitText, device }: { block: Block; selectedId: string | null; onSelect: (id: string) => void; onCommitText: (id: string, text: string) => void; device: Device }) {
  const isSel = selectedId === block.id;
  const ring = isSel
    ? "outline outline-2 outline-primary outline-offset-[-2px]"
    : "outline outline-1 outline-transparent hover:outline-primary/40";
  const handleClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(block.id); };
  const p = effProps(block, device);

  if (block.type === "section") {
    return (
      <section onClick={handleClick} className={`relative ${ring}`} style={{ padding: p.padding, background: p.background }}>
        <SortableList items={block.children || []} selectedId={selectedId} onSelect={onSelect} onCommitText={onCommitText} device={device} />
      </section>
    );
  }
  if (block.type === "container") {
    return (
      <div onClick={handleClick} className={`mx-auto ${ring}`}
        style={{
          maxWidth: p.maxWidth, padding: p.padding,
          display: p.display || "flex", flexDirection: p.direction || "column",
          gap: p.gap, alignItems: p.align || "stretch", justifyContent: p.justify || "flex-start",
        }}>
        <SortableList items={block.children || []} selectedId={selectedId} onSelect={onSelect} onCommitText={onCommitText} device={device} />
      </div>
    );
  }
  if (block.type === "heading") {
    const Tag = (`h${p.level || 2}` as unknown) as keyof JSX.IntrinsicElements;
    return (
      <Tag onClick={handleClick} className={ring}
        style={{ fontSize: p.fontSize, color: p.color, textAlign: p.align, fontWeight: p.fontWeight, margin: p.margin || 0 }}>
        <InlineText id={block.id} value={p.text} isSelected={isSel} onCommit={onCommitText} />
      </Tag>
    );
  }
  if (block.type === "text") {
    return (
      <p onClick={handleClick} className={ring}
        style={{ fontSize: p.fontSize, color: p.color, textAlign: p.align, lineHeight: p.lineHeight, margin: p.margin || 0 }}>
        <InlineText id={block.id} value={p.text} isSelected={isSel} onCommit={onCommitText} multiline />
      </p>
    );
  }
  if (block.type === "image") {
    const wrapAlign = p.imgAlign === "center" ? "mx-auto block" : p.imgAlign === "right" ? "ml-auto block" : "";
    return p.src ? (
      <img onClick={handleClick} src={p.src} alt={p.alt || ""} title={p.title || undefined} className={`${ring} ${wrapAlign}`}
        style={{ width: p.width, height: p.height, aspectRatio: p.aspectRatio || undefined, objectFit: p.fit, borderRadius: p.radius, border: p.border, boxShadow: p.shadow, margin: p.margin }} />
    ) : (
      <div onClick={handleClick} className={`bg-muted/60 flex items-center justify-center text-xs text-muted-foreground ${ring} ${wrapAlign}`}
        style={{ width: p.width, height: p.height === "auto" ? 200 : p.height, aspectRatio: p.aspectRatio || undefined, borderRadius: p.radius }}>
        <ImageIcon className="w-4 h-4 mr-1" /> No image — click and pick one
      </div>
    );
  }
  if (block.type === "button") {
    return (
      <a href={p.href || "#"} onClick={handleClick} className={`inline-block ${ring}`}
        style={{ background: p.bg, color: p.color, padding: p.padding, borderRadius: p.radius, textDecoration: "none", boxShadow: p.shadow }}
        onMouseDown={(e) => e.preventDefault()}>
        <InlineText id={block.id} value={p.text} isSelected={isSel} onCommit={onCommitText} />
      </a>
    );
  }
  if (block.type === "html") {
    return (
      <div onClick={handleClick} className={ring}
        style={{ padding: p.padding, margin: p.margin }}
        dangerouslySetInnerHTML={{ __html: p.code || "" }} />
    );
  }
  return null;
}

// Inline contenteditable text. Becomes editable on double-click while selected.
function InlineText({ id, value, isSelected, onCommit, multiline }: { id: string; value: string; isSelected: boolean; onCommit: (id: string, text: string) => void; multiline?: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <span
      contentEditable={editing}
      suppressContentEditableWarning
      onDoubleClick={(e) => { if (!isSelected) return; e.stopPropagation(); setEditing(true); }}
      onBlur={(e) => {
        if (!editing) return;
        setEditing(false);
        const next = (e.currentTarget.textContent || "").trim();
        if (next !== value) onCommit(id, next);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") { e.preventDefault(); (e.target as HTMLElement).blur(); }
        if (e.key === "Escape") { (e.target as HTMLElement).blur(); }
      }}
      style={{ outline: editing ? "1px dashed currentColor" : "none", cursor: isSelected ? "text" : "inherit", minWidth: 12, display: "inline-block" }}
    >
      {value}
    </span>
  );
}

// ============== Inspector ==============
function Inspector({ block, device, onChange }: { block: Block; device: Device; onChange: (patch: Record<string, any>) => void }) {
  const p = effProps(block, device);
  const isImage = block.type === "image";
  const isText = block.type === "heading" || block.type === "text" || block.type === "button";
  const isHtml = block.type === "html";

  return (
    <div className="p-3 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
        <span>{block.type}</span>
        <span className="text-[10px] opacity-50">
          {device !== "desktop" && <span className="mr-2 px-1 rounded bg-primary/10 text-primary uppercase">{device}</span>}
          {block.id.slice(0, 6)}
        </span>
      </div>
      {device !== "desktop" && (
        <p className="text-[10px] text-muted-foreground -mt-1">
          Editing <strong>{device}</strong> overrides. Switch to Desktop to edit base values.
        </p>
      )}
      <Tabs defaultValue={isHtml ? "html" : isImage ? "image" : "layout"} className="space-y-2">
        <TabsList className="w-full h-8">
          <TabsTrigger value="layout" className="text-[11px] flex-1 h-7">Content</TabsTrigger>
          <TabsTrigger value="style" className="text-[11px] flex-1 h-7">Style</TabsTrigger>
          <TabsTrigger value="advanced" className="text-[11px] flex-1 h-7">Advanced</TabsTrigger>
          {isImage && <TabsTrigger value="image" className="text-[11px] flex-1 h-7">Image</TabsTrigger>}
          {isText && <TabsTrigger value="text" className="text-[11px] flex-1 h-7">Text</TabsTrigger>}
          {isHtml && <TabsTrigger value="html" className="text-[11px] flex-1 h-7">HTML</TabsTrigger>}
        </TabsList>

        <TabsContent value="layout" className="space-y-2">
          <CssField label="Padding" value={p.padding || ""} onChange={(v) => onChange({ padding: v })} placeholder="16px 24px" />
          <CssField label="Margin" value={p.margin || ""} onChange={(v) => onChange({ margin: v })} placeholder="0 0 16px 0" />
          {(block.type === "container" || block.type === "section") && (
            <>
              <CssField label="Gap" value={p.gap || ""} onChange={(v) => onChange({ gap: v })} placeholder="24px" />
              {block.type === "container" && (
                <>
                  <SelectField label="Direction" value={p.direction || "column"} options={["column", "row"]} onChange={(v) => onChange({ direction: v })} />
                  <SelectField label="Align" value={p.align || "stretch"} options={["stretch", "flex-start", "center", "flex-end"]} onChange={(v) => onChange({ align: v })} />
                  <SelectField label="Justify" value={p.justify || "flex-start"} options={["flex-start", "center", "flex-end", "space-between", "space-around"]} onChange={(v) => onChange({ justify: v })} />
                </>
              )}
              <CssField label="Max width" value={p.maxWidth || ""} onChange={(v) => onChange({ maxWidth: v })} placeholder="1100px" />
            </>
          )}
          {block.type === "image" && (
            <>
              <CssField label="Width" value={p.width || ""} onChange={(v) => onChange({ width: v })} placeholder="100%" />
              <CssField label="Height" value={p.height || ""} onChange={(v) => onChange({ height: v })} placeholder="auto" />
            </>
          )}
        </TabsContent>

        <TabsContent value="style" className="space-y-2">
          <ColorField label="Background" value={p.background || p.bg || ""} onChange={(v) => onChange(block.type === "button" ? { bg: v } : { background: v })} />
          <NumField label="Border radius" value={Number(p.radius) || 0} max={64} onChange={(v) => onChange({ radius: v })} />
          <CssField label="Border" value={p.border || ""} onChange={(v) => onChange({ border: v })} placeholder="1px solid #e2e8f0" />
          <CssField label="Shadow" value={p.shadow || ""} onChange={(v) => onChange({ shadow: v })} placeholder="0 4px 12px rgba(0,0,0,.1)" />
          <div className="grid grid-cols-3 gap-1 pt-1">
            {SHADOW_PRESETS.map((s) => (
              <button key={s.label} onClick={() => onChange({ shadow: s.value })}
                className="text-[10px] py-1 rounded border bg-background hover:bg-muted">{s.label}</button>
            ))}
          </div>
        </TabsContent>

        {isImage && (
          <TabsContent value="image" className="space-y-2">
            <ImageBlockEditor p={p} onChange={onChange} />
          </TabsContent>
        )}

        {isText && (
          <TabsContent value="text" className="space-y-2">
            <div>
              <Label className="text-[10px] uppercase">Text</Label>
              <Textarea value={p.text || ""} rows={3} onChange={(e) => onChange({ text: e.target.value })} />
            </div>
            {block.type === "heading" && (
              <SelectField label="Heading level" value={String(p.level || 2)} options={["1", "2", "3", "4", "5", "6"]} onChange={(v) => onChange({ level: Number(v) })} />
            )}
            {block.type === "button" && (
              <CssField label="Link (href)" value={p.href || ""} onChange={(v) => onChange({ href: v })} placeholder="https://…" />
            )}
            <NumField label="Font size" value={Number(p.fontSize) || 16} max={120} onChange={(v) => onChange({ fontSize: v })} />
            <NumField label="Font weight" value={Number(p.fontWeight) || 400} min={100} max={900} step={100} onChange={(v) => onChange({ fontWeight: v })} />
            <ColorField label="Color" value={p.color || "#000000"} onChange={(v) => onChange({ color: v })} />
            <SelectField label="Align" value={p.align || "left"} options={["left", "center", "right", "justify"]} onChange={(v) => onChange({ align: v })} />
          </TabsContent>
        )}

        {isHtml && (
          <TabsContent value="html" className="space-y-2">
            <div>
              <Label className="text-[10px] uppercase">HTML / Embed code</Label>
              <Textarea value={p.code || ""} rows={10} onChange={(e) => onChange({ code: e.target.value })}
                className="font-mono text-xs" placeholder="<div>Anything…</div>" />
              <p className="text-[10px] text-muted-foreground mt-1">Rendered live. Use trusted markup only.</p>
            </div>
          </TabsContent>
        )}

        <TabsContent value="advanced" className="space-y-2">
          <CssField label="CSS classes" value={p.className || ""} onChange={(v) => onChange({ className: v })} placeholder="my-section dark" />
          <CssField label="HTML id" value={p.htmlId || ""} onChange={(v) => onChange({ htmlId: v })} placeholder="hero" />
          <CssField label="Z-index" value={String(p.zIndex ?? "")} onChange={(v) => onChange({ zIndex: v })} placeholder="1" />
          <SelectField label="Visibility" value={p.visibility || "all"} options={["all", "desktop-only", "tablet-only", "mobile-only", "hidden"]} onChange={(v) => onChange({ visibility: v })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ImageBlockEditor({ p, onChange }: { p: Record<string, any>; onChange: (patch: Record<string, any>) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="space-y-2">
      <div className="aspect-video bg-muted rounded overflow-hidden flex items-center justify-center">
        {p.src ? <img src={p.src} alt={p.alt || ""} className="w-full h-full object-cover" /> :
          <span className="text-xs text-muted-foreground">No image</span>}
      </div>
      <div className="flex gap-1">
        <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => setPickerOpen(true)}>
          {p.src ? "Replace" : "Pick image"}
        </Button>
        {p.src && (
          <Button size="sm" variant="outline" className="h-8" onClick={() => {
            navigator.clipboard.writeText(p.src); toast.success("URL copied");
          }} title="Copy URL"><Copy className="w-3.5 h-3.5" /></Button>
        )}
      </div>
      <div>
        <Label className="text-[10px] uppercase">Alt text</Label>
        <Input value={p.alt || ""} onChange={(e) => onChange({ alt: e.target.value })} placeholder="Describe the image" />
      </div>
      <div>
        <Label className="text-[10px] uppercase">Image title (tooltip)</Label>
        <Input value={p.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
      </div>
      <SelectField label="Object fit" value={p.fit || "cover"} options={["cover", "contain", "fill", "none", "scale-down"]} onChange={(v) => onChange({ fit: v })} />
      <SelectField label="Aspect ratio" value={p.aspectRatio || "auto"} options={["auto", "1/1", "4/3", "3/2", "16/9", "21/9", "9/16"]} onChange={(v) => onChange({ aspectRatio: v === "auto" ? "" : v })} />
      <SelectField label="Align" value={p.imgAlign || "left"} options={["left", "center", "right"]} onChange={(v) => onChange({ imgAlign: v })} />
      <CssField label="Width" value={p.width || ""} onChange={(v) => onChange({ width: v })} placeholder="100%" />
      <CssField label="Height" value={p.height || ""} onChange={(v) => onChange({ height: v })} placeholder="auto" />
      <NumField label="Border radius" value={Number(p.radius) || 0} max={128} onChange={(v) => onChange({ radius: v })} />
      <CssField label="Source URL" value={p.src || ""} onChange={(v) => onChange({ src: v })} placeholder="https://…" />
      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(m) => { onChange({ src: m.url, alt: p.alt || m.name }); setPickerOpen(false); }}
      />
    </div>
  );
}

// ============== Field primitives ==============
function CssField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-[10px] uppercase">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-xs" />
    </div>
  );
}
function NumField({ label, value, onChange, min = 0, max = 100, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div>
      <div className="flex justify-between items-center">
        <Label className="text-[10px] uppercase">{label}</Label>
        <span className="text-[10px] text-muted-foreground">{value}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase">{label}</Label>
      <div className="flex gap-1">
        <input type="color" value={normalizeColor(value)} onChange={(e) => onChange(e.target.value)} className="w-9 h-8 rounded border" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs flex-1" />
      </div>
    </div>
  );
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
function normalizeColor(v: string): string {
  if (!v) return "#000000";
  if (v.startsWith("#")) return v.length === 7 ? v : "#000000";
  return "#000000";
}

const SHADOW_PRESETS = [
  { label: "None", value: "" },
  { label: "Sm", value: "0 1px 2px rgba(0,0,0,.06)" },
  { label: "Md", value: "0 4px 12px rgba(0,0,0,.1)" },
  { label: "Lg", value: "0 10px 30px rgba(0,0,0,.15)" },
  { label: "Xl", value: "0 20px 50px rgba(0,0,0,.2)" },
  { label: "Inner", value: "inset 0 2px 4px rgba(0,0,0,.06)" },
];
