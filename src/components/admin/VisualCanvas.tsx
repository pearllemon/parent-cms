// Visual canvas: click-to-select block editor with inspector panel.
// - JSON block tree (section / container / heading / text / image / button).
// - Click to select; right-side inspector with Layout / Style / Image / Text tabs.
// - Drag-and-drop reordering within any parent (dnd-kit).
// - Inline contenteditable for heading / text / button text when the block is selected.
// - Device toggle (Desktop / Tablet / Mobile) constrains canvas width.
// - Variants switcher in the left rail.
// - Media Library popup for image blocks.

import React, { useMemo, useState } from "react";
import DOMPurify from "dompurify";
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
import { useSiteConfig } from "@/providers/SiteProvider";
import { supabase as cloud } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
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
  HelpCircle, Mail, BookOpen, ChevronDown, Calendar, ArrowRight, MapPin, Phone, Clock,
  Undo2, Redo2, Search, Settings, History
} from "lucide-react";
import { saveLocalSection, submitSectionToParent, type SectionTemplate } from "@/lib/sectionLibrary";
import { toast as sonner } from "sonner";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type BlockType = "section" | "container" | "heading" | "text" | "image" | "button" | "html" | "form" | "accordion" | "contact-section" | "blog-section";
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
    form:      { id: uid(), type, props: { formSlug: "contact", formId: "" } },
    accordion: {
      id: uid(),
      type,
      props: {
        items: [
          { title: "What is a BREEAM assessment?", content: "A BREEAM assessment is a sustainability evaluation for buildings, measuring environmental performance across energy efficiency, water usage, waste management, and indoor environmental quality." },
          { title: "How does the certification process work?", content: "BREEAM evaluates buildings at each stage of their lifecycle—from design to operation. Points are awarded across multiple sustainability categories, and the total score determines the certification level, ranging from Pass to Outstanding." }
        ]
      }
    },
    "contact-section": {
      id: uid(),
      type,
      props: {
        title: "Get in Touch",
        subtitle: "Reach out to us today for expert BREEAM assessment services tailored to your project's needs. Fill out the form below, and our team will get back to you shortly.",
        address: "2nd Floor, 123 Victoria St, London SW1E 6DE",
        phone: "+44 20 7946 0958",
        email: "info@breeamassessment.co.uk",
        hours: "Monday to Friday (9-5)",
        formSlug: "contact"
      }
    },
    "blog-section": {
      id: uid(),
      type,
      props: {
        title: "News & Updates",
        subtitle: "Stay up to date with the latest sustainability insights, BREEAM guidance, and project case studies.",
        limit: 3
      }
    }
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

  // History stacks for Undo / Redo
  const [past, setPast] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);
  const ignoreChange = useRef(false);

  useEffect(() => {
    if (ignoreChange.current) {
      ignoreChange.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPast((p) => {
        const last = p[p.length - 1];
        if (!last || JSON.stringify(last) !== JSON.stringify(blocks)) {
          const next = [...p, JSON.parse(JSON.stringify(blocks))];
          if (next.length > 50) next.shift();
          return next;
        }
        return p;
      });
      setFuture([]);
    }, 500);
    return () => clearTimeout(timer);
  }, [blocks]);

  const undo = () => {
    if (past.length <= 1) return;
    ignoreChange.current = true;
    const current = JSON.parse(JSON.stringify(blocks));
    const previous = past[past.length - 2];
    onChange(previous);
    setFuture((f) => [current, ...f]);
    setPast((p) => p.slice(0, -1));
  };

  const redo = () => {
    if (future.length === 0) return;
    ignoreChange.current = true;
    const next = future[0];
    onChange(next);
    setPast((p) => [...p, JSON.parse(JSON.stringify(next))]);
    setFuture((f) => f.slice(1));
  };

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

  const [searchTerm, setSearchTerm] = useState("");

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
      {/* Left rail (Elementor Style Sidebar) */}
      <div className="w-60 flex flex-col bg-[#2d3135] text-[#d5dadf] select-none h-full border-r border-[#1a1c1e] shrink-0 font-sans">
        {/* Sidebar Header */}
        <div className="p-3 border-b border-[#1a1c1e] bg-[#232629] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-[#92003b] rounded flex items-center justify-center text-[9px] font-black text-white">E</div>
              <span className="text-[10px] font-bold tracking-wider text-white uppercase">ELEMENTOR</span>
            </div>
            {proActive && (
              <Badge className="bg-gradient-to-r from-red-600 to-pink-600 text-white border-0 text-[8px] py-0.5 px-1 font-bold scale-90 origin-right">
                PRO ACTIVE
              </Badge>
            )}
          </div>
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2.5 text-[#818a91]" />
            <input 
              type="text" 
              placeholder="Search Widget..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs bg-[#1a1c1e] border border-[#404346] rounded text-white placeholder-[#6d7278] focus:outline-none focus:border-[#92003b] focus:ring-0"
            />
          </div>
        </div>

        {/* Sidebar Content / Widgets Accordion */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1a1c1e] custom-scrollbar">
          {/* BASIC CATEGORY */}
          {(!searchTerm || "basic".includes(searchTerm.toLowerCase()) || 
            ["inner section", "container", "heading", "text editor", "image", "button", "html"].some(label => label.includes(searchTerm.toLowerCase()))) && (
            <div>
              <div className="bg-[#232629] px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase text-[#818a91] flex items-center justify-between">
                <span>Basic</span>
                <ChevronDown className="w-3 h-3 text-[#818a91]" />
              </div>
              <div className="grid grid-cols-3 gap-[1px] bg-[#1a1c1e] p-[1px]">
                {[
                  { label: "Inner Section", Icon: Square, type: "section" },
                  { label: "Container", Icon: Layers, type: "container" },
                  { label: "Heading", Icon: Heading1, type: "heading" },
                  { label: "Text Editor", Icon: Type, type: "text" },
                  { label: "Image", Icon: ImageIcon, type: "image" },
                  { label: "Button", Icon: MousePointerClick, type: "button" },
                  { label: "HTML", Icon: Code2, type: "html" },
                ].filter(w => !searchTerm || w.label.toLowerCase().includes(searchTerm.toLowerCase())).map(w => (
                  <button 
                    key={w.label} 
                    onClick={() => addBlock(w.type as any)}
                    className="flex flex-col items-center justify-center gap-1.5 aspect-square p-1.5 bg-[#2d3135] hover:bg-[#353a3f] hover:text-white transition-colors group"
                  >
                    <w.Icon className="w-4 h-4 text-[#818a91] group-hover:text-[#92003b] transition-colors" />
                    <span className="text-[9px] text-[#a4afb7] text-center leading-tight">{w.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PRO CATEGORY */}
          {(!searchTerm || "pro".includes(searchTerm.toLowerCase()) || 
            ["form", "accordion", "contact form", "posts / blog"].some(label => label.includes(searchTerm.toLowerCase()))) && (
            <div>
              <div className="bg-[#232629] px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase text-[#818a91] flex items-center justify-between">
                <span>Pro</span>
                <ChevronDown className="w-3 h-3 text-[#818a91]" />
              </div>
              <div className="grid grid-cols-3 gap-[1px] bg-[#1a1c1e] p-[1px]">
                {[
                  { label: "Form", Icon: Layers, type: "form" },
                  { label: "Accordion", Icon: HelpCircle, type: "accordion" },
                  { label: "Contact Form", Icon: Mail, type: "contact-section" },
                  { label: "Posts / Blog", Icon: BookOpen, type: "blog-section" },
                ].filter(w => !searchTerm || w.label.toLowerCase().includes(searchTerm.toLowerCase())).map(w => (
                  <button 
                    key={w.label} 
                    onClick={() => addBlock(w.type as any)}
                    className="flex flex-col items-center justify-center gap-1.5 aspect-square p-1.5 bg-[#2d3135] hover:bg-[#353a3f] hover:text-white transition-colors group relative"
                  >
                    {!proActive && (
                      <span className="absolute top-1 right-1 bg-[#92003b] text-white text-[6px] px-1 py-0.2 rounded font-black scale-75">PRO</span>
                    )}
                    <w.Icon className="w-4 h-4 text-[#818a91] group-hover:text-[#92003b] transition-colors" />
                    <span className="text-[9px] text-[#a4afb7] text-center leading-tight">{w.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECTION LIBRARY & VARIANTS */}
          <div className="p-3 space-y-2">
            <Button size="sm" variant="ghost" className="w-full h-8 text-xs bg-[#3c4044] hover:bg-[#4c5156] hover:text-white text-white border-0" onClick={() => setLibraryOpen(true)}>
              <LibraryBig className="w-3.5 h-3.5 mr-1 text-[#818a91]" /> Section library
            </Button>

            {(variants.length > 0 || onSaveVariant) && (
              <div className="space-y-1.5 pt-2 border-t border-[#3c4044]">
                <p className="text-[9px] uppercase tracking-wider text-[#818a91] font-bold">Variants</p>
                <div className="space-y-1">
                  <button onClick={() => onVariantChange?.(null)}
                    className={`w-full text-left text-xs px-2 py-1 rounded ${activeVariantId === null ? "bg-[#92003b] text-white" : "hover:bg-[#3c4044]"}`}>
                    Default
                  </button>
                  {variants.map((v) => (
                    <button key={v.id} onClick={() => onVariantChange?.(v.id)}
                      className={`w-full text-left text-xs px-2 py-1 rounded ${activeVariantId === v.id ? "bg-[#92003b] text-white" : "hover:bg-[#3c4044]"}`}>
                      {v.name}
                    </button>
                  ))}
                  {onSaveVariant && (
                    <Button size="sm" variant="outline" className="w-full mt-1 h-7 text-xs border-[#404346] text-[#d5dadf] hover:bg-[#3c4044] hover:text-white" onClick={onSaveVariant}>
                      <Plus className="w-3 h-3 mr-1" /> Save as variant
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer / Elementor Bottom Bar */}
        <div className="h-10 bg-[#232629] border-t border-[#1a1c1e] px-2.5 flex items-center justify-between shrink-0 text-[#818a91]">
          <div className="flex items-center gap-3.5">
            <button className="hover:text-white transition-colors" title="Settings"><Settings className="w-3.5 h-3.5" /></button>
            <button className="hover:text-white transition-colors" title="Navigator"><Layers className="w-3.5 h-3.5" /></button>
            <button className="hover:text-white transition-colors" title="History" onClick={undo} disabled={past.length <= 1}><History className="w-3.5 h-3.5" /></button>
            <button className="hover:text-white transition-colors" title="Responsive Mode" onClick={() => setDevice(device === "desktop" ? "mobile" : device === "mobile" ? "tablet" : "desktop")}><Monitor className="w-3.5 h-3.5" /></button>
          </div>
          <button 
            onClick={() => {
              toast.success("Page updated successfully!");
            }}
            className="bg-[#5cbb23] hover:bg-[#6bd22b] text-white font-bold text-[10px] px-3.5 py-1.5 rounded transition-colors uppercase tracking-wider"
          >
            Update
          </button>
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
          
          <div className="flex gap-0.5 bg-background rounded border p-0.5 ml-2">
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={undo} disabled={past.length <= 1} title="Undo (Ctrl+Z)">
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)">
              <Redo2 className="w-3.5 h-3.5" />
            </Button>
          </div>

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

  const getWidgetElement = () => {
    if (block.type === "section") {
      const isFullWidth = p.layout === "full-width";
      const isFullHeight = p.height === "fit-screen" || p.height === "viewport";
      return (
        <section 
          onClick={handleClick} 
          className={`relative w-full ${isFullWidth ? "px-0" : "px-4"} ${ring}`} 
          style={{ 
            padding: isFullWidth ? "0" : p.padding, 
            background: p.background,
            minHeight: isFullHeight ? "70vh" : (p.height === "min-height" ? p.minHeight : undefined),
            display: isFullHeight || p.height === "min-height" ? "flex" : undefined,
            flexDirection: isFullHeight || p.height === "min-height" ? "column" : undefined,
            justifyContent: isFullHeight || p.height === "min-height" ? "center" : undefined,
          }}
        >
          <div className="w-full mx-auto" style={{ maxWidth: isFullWidth ? "100%" : p.maxWidth || "1200px" }}>
            <SortableList items={block.children || []} selectedId={selectedId} onSelect={onSelect} onCommitText={onCommitText} device={device} />
          </div>
        </section>
      );
    }
    if (block.type === "container") {
      const isFullWidth = p.layout === "full-width";
      const isFullHeight = p.height === "fit-screen" || p.height === "viewport";
      return (
        <div onClick={handleClick} className={`mx-auto ${ring}`}
          style={{
            maxWidth: isFullWidth ? "100%" : p.maxWidth,
            padding: p.padding,
            display: p.display || "flex",
            gap: p.gap,
            flexDirection: (p.direction || "column") as any,
            alignItems: p.align as any,
            justifyContent: p.justify as any,
            background: p.background,
            minHeight: isFullHeight ? "70vh" : (p.height === "min-height" ? p.minHeight : undefined),
          }}
        >
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
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(p.code || "", { USE_PROFILES: { html: true } }) }} />
      );
    }
    if (block.type === "form") {
      return (
        <div onClick={handleClick} className={`p-4 border border-dashed border-primary/40 rounded-xl bg-muted/10 ${ring}`}>
          <div className="text-center py-6">
            <Layers className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-sm font-semibold text-foreground">Form: {p.formSlug || "Unconfigured"}</p>
            <p className="text-xs text-muted-foreground mt-1">Connected to Forms Ecosystem</p>
          </div>
        </div>
      );
    }
    if (block.type === "accordion") {
      const items = p.items || [];
      return (
        <div onClick={handleClick} className={`w-full p-4 my-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl ${ring}`}>
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-400 uppercase font-semibold">
            <HelpCircle className="w-4 h-4" />
            <span>FAQ Accordion Widget</span>
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No items. Open the content inspector to add some.</p>
          ) : (
            <div className="space-y-2">
              {items.map((it: any, idx: number) => (
                <div key={idx} className="bg-white border rounded-xl p-3.5 flex justify-between items-center text-sm font-bold text-slate-800 shadow-sm">
                  <span>{it.title || `FAQ Item ${idx + 1}`}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (block.type === "contact-section") {
      return (
        <div onClick={handleClick} className={`w-full p-6 my-4 bg-slate-50/80 border border-dashed border-slate-200 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start ${ring}`}>
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-semibold">
              <Mail className="w-4 h-4" />
              <span>Contact Section Widget</span>
            </div>
            <h3 className="text-xl font-black text-slate-950">{p.title || "Get in Touch"}</h3>
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{p.subtitle}</p>
            <div className="space-y-2 pt-2 text-xs text-slate-600">
              {p.address && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-primary" /> {p.address}</p>}
              {p.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-primary" /> {p.phone}</p>}
              {p.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-primary" /> {p.email}</p>}
              {p.hours && <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary" /> {p.hours}</p>}
            </div>
          </div>
          <div className="bg-white p-4 border rounded-2xl shadow-sm text-center py-6">
            <Layers className="w-6 h-6 mx-auto text-primary mb-2 opacity-60" />
            <p className="text-xs font-semibold text-slate-700">Form: {p.formSlug || "contact"}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Mock Form Card</p>
          </div>
        </div>
      );
    }
    if (block.type === "blog-section") {
      const limit = Number(p.limit) || 3;
      const mockPosts = Array.from({ length: limit }).map((_, i) => ({
        title: `Example Blog Article ${i + 1}`,
        excerpt: "This is a brief preview of the article content. It automatically adapts to your branding settings.",
        date: "29 Jun 2026"
      }));
      return (
        <div onClick={handleClick} className={`w-full p-6 my-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl space-y-6 ${ring}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-semibold">
              <BookOpen className="w-4 h-4" />
              <span>Latest Blog Posts Grid</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">Dynamic</span>
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-xl font-black text-slate-900">{p.title || "News & Updates"}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{p.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockPosts.map((post, idx) => (
              <div key={idx} className="bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col h-full text-left">
                <div className="aspect-video bg-slate-100 w-full flex items-center justify-center text-slate-300 text-xs">
                  Featured Image
                </div>
                <div className="p-4 space-y-2 flex-grow flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-semibold text-slate-400 block">{post.date}</span>
                    <h4 className="font-bold text-xs text-slate-900 line-clamp-2">{post.title}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-2">{post.excerpt}</p>
                  </div>
                  <div className="text-[10px] font-bold text-primary pt-2 flex items-center gap-0.5">
                    Read Article <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const element = getWidgetElement();
  if (!element) return null;

  const style: React.CSSProperties = {};
  if (p.fullWidth === "yes" && block.type !== "section" && block.type !== "container") {
    style.width = "100vw";
    style.position = "relative";
    style.left = "50%";
    style.right = "50%";
    style.marginLeft = "-50vw";
    style.marginRight = "-50vw";
    style.maxWidth = "100vw";
  }
  if (p.height === "fit-screen" && block.type !== "section" && block.type !== "container") {
    style.minHeight = "70vh";
    style.display = "flex";
    style.flexDirection = "column";
    style.justifyContent = "center";
  } else if (p.height === "min-height" && p.minHeight && block.type !== "section" && block.type !== "container") {
    style.minHeight = p.minHeight;
    style.display = "flex";
    style.flexDirection = "column";
    style.justifyContent = "center";
  }

  const hasAdvancedStyles = Object.keys(style).length > 0;
  if (hasAdvancedStyles) {
    return (
      <div style={style}>
        {element}
      </div>
    );
  }
  return element;
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
  const isForm = block.type === "form";
  const isAccordion = block.type === "accordion";
  const isContact = block.type === "contact-section";
  const isBlog = block.type === "blog-section";

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
      <Tabs defaultValue={isHtml ? "html" : isImage ? "image" : isAccordion ? "accordion" : isContact ? "contact" : isBlog ? "blog" : "layout"} className="space-y-2">
        <TabsList className="w-full h-8">
          <TabsTrigger value="layout" className="text-[11px] flex-1 h-7">Content</TabsTrigger>
          <TabsTrigger value="style" className="text-[11px] flex-1 h-7">Style</TabsTrigger>
          <TabsTrigger value="advanced" className="text-[11px] flex-1 h-7">Advanced</TabsTrigger>
          {isImage && <TabsTrigger value="image" className="text-[11px] flex-1 h-7">Image</TabsTrigger>}
          {isText && <TabsTrigger value="text" className="text-[11px] flex-1 h-7">Text</TabsTrigger>}
          {isHtml && <TabsTrigger value="html" className="text-[11px] flex-1 h-7">HTML</TabsTrigger>}
          {isForm && <TabsTrigger value="form" className="text-[11px] flex-1 h-7">Form</TabsTrigger>}
          {isAccordion && <TabsTrigger value="accordion" className="text-[11px] flex-1 h-7">FAQ</TabsTrigger>}
          {isContact && <TabsTrigger value="contact" className="text-[11px] flex-1 h-7">Contact</TabsTrigger>}
          {isBlog && <TabsTrigger value="blog" className="text-[11px] flex-1 h-7">Blog</TabsTrigger>}
        </TabsList>

        <TabsContent value="layout" className="space-y-2">
          <CssField label="Padding" value={p.padding || ""} onChange={(v) => onChange({ padding: v })} placeholder="16px 24px" />
          <CssField label="Margin" value={p.margin || ""} onChange={(v) => onChange({ margin: v })} placeholder="0 0 16px 0" />
          {(block.type === "container" || block.type === "section") && (
            <>
              <SelectField label="Content Width" value={p.layout || "boxed"} options={["boxed", "full-width"]} onChange={(v) => onChange({ layout: v })} />
              <SelectField label="Height" value={p.height || "default"} options={["default", "fit-screen", "min-height"]} onChange={(v) => onChange({ height: v })} />
              {p.height === "min-height" && (
                <CssField label="Min Height" value={p.minHeight || ""} onChange={(v) => onChange({ minHeight: v })} placeholder="400px" />
              )}
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

        {isForm && (
          <TabsContent value="form" className="space-y-2">
            <FormSelector value={p.formSlug || ""} onChange={(slug) => onChange({ formSlug: slug })} />
            <p className="text-[10px] text-muted-foreground mt-1">
              Select a form from your Forms database to render in this block.
            </p>
          </TabsContent>
        )}

        {isAccordion && (
          <TabsContent value="accordion" className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] uppercase">Accordion FAQ Items</Label>
              <Button size="sm" variant="outline" className="h-7 text-[10px]"
                onClick={() => {
                  const items = [...(p.items || [])];
                  items.push({ title: "New Question?", content: "Provide an answer here." });
                  onChange({ items });
                }}>
                + Add Item
              </Button>
            </div>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {(p.items || []).map((it: any, idx: number) => (
                <div key={idx} className="border p-2 rounded-xl bg-muted/20 space-y-2 relative">
                  <button type="button" className="absolute top-2 right-2 text-destructive hover:opacity-80"
                    onClick={() => {
                      const items = [...(p.items || [])];
                      items.splice(idx, 1);
                      onChange({ items });
                    }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="pr-6">
                    <Label className="text-[9px] uppercase">Question {idx + 1}</Label>
                    <Input value={it.title || ""} onChange={(e) => {
                      const items = [...(p.items || [])];
                      items[idx].title = e.target.value;
                      onChange({ items });
                    }} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[9px] uppercase">Answer</Label>
                    <Textarea value={it.content || ""} rows={2} onChange={(e) => {
                      const items = [...(p.items || [])];
                      items[idx].content = e.target.value;
                      onChange({ items });
                    }} className="text-xs p-1 h-16 resize-none" />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {isContact && (
          <TabsContent value="contact" className="space-y-3">
            <div>
              <Label className="text-[10px] uppercase">Widget Title</Label>
              <Input value={p.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Subtitle</Label>
              <Textarea value={p.subtitle || ""} rows={2} onChange={(e) => onChange({ subtitle: e.target.value })} className="text-xs resize-none" />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Address</Label>
              <Input value={p.address || ""} onChange={(e) => onChange({ address: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Phone</Label>
              <Input value={p.phone || ""} onChange={(e) => onChange({ phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Email</Label>
              <Input value={p.email || ""} onChange={(e) => onChange({ email: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Working Hours</Label>
              <Input value={p.hours || ""} onChange={(e) => onChange({ hours: e.target.value })} />
            </div>
            <FormSelector value={p.formSlug || ""} onChange={(slug) => onChange({ formSlug: slug })} />
          </TabsContent>
        )}

        {isBlog && (
          <TabsContent value="blog" className="space-y-3">
            <div>
              <Label className="text-[10px] uppercase">Widget Title</Label>
              <Input value={p.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Subtitle</Label>
              <Textarea value={p.subtitle || ""} rows={2} onChange={(e) => onChange({ subtitle: e.target.value })} className="text-xs resize-none" />
            </div>
            <NumField label="Posts Limit" value={Number(p.limit) || 3} min={1} max={9} onChange={(v) => onChange({ limit: v })} />
          </TabsContent>
        )}

        <TabsContent value="advanced" className="space-y-2">
          <SelectField label="Full Width" value={p.fullWidth || "no"} options={["no", "yes"]} onChange={(v) => onChange({ fullWidth: v })} />
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

function FormSelector({ value, onChange }: { value: string; onChange: (slug: string) => void }) {
  const [forms, setForms] = useState<any[]>([]);
  useEffect(() => {
    import("@/lib/forms").then((m) => {
      m.listForms().then((list) => {
        setForms(list || []);
      });
    });
  }, []);

  return (
    <div>
      <Label className="text-[10px] uppercase">Select Form</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-xs text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/40 outline-none transition-all"
      >
        <option value="">Select a form...</option>
        {forms.map((f) => (
          <option key={f.id} value={f.slug}>{f.name} ({f.slug})</option>
        ))}
      </select>
    </div>
  );
}
