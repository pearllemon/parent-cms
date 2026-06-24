// Right-side editor panel.
// Renders different forms based on the selected Elementor node type.
// If no node is selected, renders a beautiful Elementor-style Widget Library and Layout Selector.
// All edits go through usePatchSelected() which mutates the live tree.
import { useState } from "react";
import { useEditor, useSelectedNode, usePatchSelected } from "./EditorContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  X,
  Search,
  Type,
  AlignLeft,
  Image as ImageIcon,
  Square,
  Minus,
  ChevronsUpDown,
  Play,
  Box,
  Layout,
  List,
  Code,
  Quote,
  MessageSquare,
  Share2,
  LayoutGrid
} from "lucide-react";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
    {children}
  </div>
);

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-xs"
    />
  );
}

function ColorInput({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 rounded border bg-background cursor-pointer shrink-0"
      />
      <Input
        value={value ?? ""}
        placeholder="#000000 or transparent"
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs"
      />
      {value && (
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onChange("")} title="Clear">
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function NumberWithUnit({
  value,
  onChange,
  units = ["px", "%", "em", "rem"],
}: {
  value: { size?: number; unit?: string } | undefined;
  onChange: (v: { size: number; unit: string }) => void;
  units?: string[];
}) {
  const v = value || { size: 0, unit: units[0] };
  return (
    <div className="flex gap-2">
      <Input
        type="number"
        value={v.size ?? ""}
        onChange={(e) => onChange({ size: Number(e.target.value), unit: v.unit || units[0] })}
        className="h-8 text-xs w-20"
      />
      <select
        value={v.unit || units[0]}
        onChange={(e) => onChange({ size: v.size ?? 0, unit: e.target.value })}
        className="h-8 rounded-md border bg-background px-1 text-xs"
      >
        {units.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  );
}

async function uploadImage(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "png";
  const slug = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) || "img";
  const key = `editor/${Date.now()}-${slug}.${ext}`;
  const { error } = await supabase.storage.from("post-images").upload(key, file, {
    contentType: file.type || undefined,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    toast.error("Upload failed: " + error.message);
    return null;
  }
  const { data } = supabase.storage.from("post-images").getPublicUrl(key);
  return data.publicUrl;
}

function ImagePicker({
  value,
  onChange,
}: {
  value: { url?: string; alt?: string; id?: string | number } | undefined;
  onChange: (v: { url: string; alt?: string; id?: string | number }) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      {value?.url && (
        <img src={value.url} alt={value.alt || ""} className="max-h-24 rounded border object-contain bg-muted/20" />
      )}
      <Input
        value={value?.url ?? ""}
        placeholder="Image URL"
        onChange={(e) => onChange({ ...(value || {}), url: e.target.value })}
        className="h-8 text-xs"
      />
      <Input
        value={value?.alt ?? ""}
        placeholder="Alt text"
        onChange={(e) => onChange({ ...(value || {}), url: value?.url || "", alt: e.target.value })}
        className="h-8 text-xs"
      />
      <label className="inline-flex">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            const url = await uploadImage(f);
            setBusy(false);
            if (url) onChange({ ...(value || {}), url, alt: value?.alt || f.name });
            e.target.value = "";
          }}
        />
        <span className={`inline-flex items-center gap-2 text-[10px] px-2.5 py-1.5 rounded-md border cursor-pointer hover:bg-muted ${busy ? "opacity-50 pointer-events-none" : ""}`}>
          <Upload className="h-3 w-3" /> {busy ? "Uploading…" : "Upload new"}
        </span>
      </label>
    </div>
  );
}

// ----- Field sets per widget type ----------------------------------------

function HeadingFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Heading text">
        <Textarea
          value={s.title ?? ""}
          rows={2}
          onChange={(e) => patch((p) => ({ ...p, title: e.target.value }))}
          className="text-xs"
        />
      </Field>
      <Field label="Tag">
        <select
          value={s.header_size || "h2"}
          onChange={(e) => patch((p) => ({ ...p, header_size: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["h1","h2","h3","h4","h5","h6","p","div"].map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Link URL">
        <TextInput value={s.link?.url} onChange={(v) => patch((p) => ({ ...p, link: { ...(p.link || {}), url: v } }))} placeholder="https://..." />
      </Field>
    </>
  );
}

function HeadingStyleFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Text alignment">
        <select
          value={s.align || s.text_align || ""}
          onChange={(e) => patch((p) => ({ ...p, align: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["", "left", "center", "right", "justify"].map((a) => <option key={a} value={a}>{a || "Default"}</option>)}
        </select>
      </Field>
      <Field label="Text color">
        <ColorInput value={s.title_color} onChange={(v) => patch((p) => ({ ...p, title_color: v }))} />
      </Field>
      <Field label="Font size">
        <NumberWithUnit value={s.typography_font_size} onChange={(v) => patch((p) => ({ ...p, typography_font_size: v }))} />
      </Field>
      <Field label="Font family">
        <TextInput
          value={s.typography_font_family}
          placeholder="e.g. Inter, Georgia, serif"
          onChange={(v) => patch((p) => ({ ...p, typography_font_family: v }))}
        />
      </Field>
      <Field label="Font weight">
        <select
          value={s.typography_font_weight || ""}
          onChange={(e) => patch((p) => ({ ...p, typography_font_weight: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          <option value="">Default</option>
          {["100","200","300","400","500","600","700","800","900","bold","normal"].map((w) => <option key={w}>{w}</option>)}
        </select>
      </Field>
      <Field label="Line height">
        <NumberWithUnit
          value={s.typography_line_height}
          onChange={(v) => patch((p) => ({ ...p, typography_line_height: v }))}
          units={["em", "px", "%"]}
        />
      </Field>
      <Field label="Letter spacing">
        <NumberWithUnit
          value={s.typography_letter_spacing}
          onChange={(v) => patch((p) => ({ ...p, typography_letter_spacing: v }))}
          units={["px", "em"]}
        />
      </Field>
      <Field label="Text transform">
        <select
          value={s.typography_text_transform || ""}
          onChange={(e) => patch((p) => ({ ...p, typography_text_transform: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["", "none", "uppercase", "lowercase", "capitalize"].map((v) => <option key={v} value={v}>{v || "Default"}</option>)}
        </select>
      </Field>
    </>
  );
}

function TextEditorFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <Field label="Rich text (HTML)">
      <Textarea
        value={s.editor ?? ""}
        rows={10}
        onChange={(e) => patch((p) => ({ ...p, editor: e.target.value }))}
        className="font-mono text-xs"
      />
    </Field>
  );
}

function TextEditorStyleFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Text alignment">
        <select
          value={s.align || s.text_align || ""}
          onChange={(e) => patch((p) => ({ ...p, align: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["", "left", "center", "right", "justify"].map((a) => <option key={a} value={a}>{a || "Default"}</option>)}
        </select>
      </Field>
      <Field label="Text color">
        <ColorInput value={s.color} onChange={(v) => patch((p) => ({ ...p, color: v }))} />
      </Field>
    </>
  );
}

function ImageFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Image">
        <ImagePicker value={s.image} onChange={(v) => patch((p) => ({ ...p, image: { ...(p.image || {}), ...v } }))} />
      </Field>
      <Field label="Caption">
        <TextInput value={s.caption} onChange={(v) => patch((p) => ({ ...p, caption: v }))} />
      </Field>
      <Field label="Link URL">
        <TextInput value={s.link?.url} onChange={(v) => patch((p) => ({ ...p, link: { ...(p.link || {}), url: v } }))} placeholder="https://..." />
      </Field>
    </>
  );
}

function ImageStyleFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Alignment">
        <select
          value={s.align || s.text_align || ""}
          onChange={(e) => patch((p) => ({ ...p, align: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["", "left", "center", "right"].map((a) => <option key={a} value={a}>{a || "Default"}</option>)}
        </select>
      </Field>
      <Field label="Width">
        <NumberWithUnit value={s.width} onChange={(v) => patch((p) => ({ ...p, width: v }))} />
      </Field>
      <Field label="Height">
        <NumberWithUnit value={s.height} onChange={(v) => patch((p) => ({ ...p, height: v }))} />
      </Field>
      <Field label="Object fit">
        <select
          value={s.object_fit || ""}
          onChange={(e) => patch((p) => ({ ...p, object_fit: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["", "fill", "cover", "contain", "scale-down"].map((o) => <option key={o} value={o}>{o || "Default"}</option>)}
        </select>
      </Field>
      <Field label="Border radius">
        <NumberWithUnit value={s.border_radius} onChange={(v) => patch((p) => ({ ...p, border_radius: v }))} />
      </Field>
    </>
  );
}

function ButtonFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Button text">
        <TextInput value={s.text} onChange={(v) => patch((p) => ({ ...p, text: v }))} />
      </Field>
      <Field label="Link URL">
        <TextInput value={s.link?.url} onChange={(v) => patch((p) => ({ ...p, link: { ...(p.link || {}), url: v } }))} placeholder="https://..." />
      </Field>
      <Field label="Open in new window">
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">External</span>
          <Switch
            checked={!!s.link?.is_external}
            onCheckedChange={(checked) => patch((p) => ({ ...p, link: { ...(p.link || {}), is_external: checked } }))}
          />
        </div>
      </Field>
    </>
  );
}

function ButtonStyleFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Alignment">
        <select
          value={s.align || s.text_align || ""}
          onChange={(e) => patch((p) => ({ ...p, align: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["", "left", "center", "right", "justify"].map((a) => <option key={a} value={a}>{a || "Default"}</option>)}
        </select>
      </Field>
      <Field label="Background color">
        <ColorInput value={s.button_background_color} onChange={(v) => patch((p) => ({ ...p, button_background_color: v }))} />
      </Field>
      <Field label="Text color">
        <ColorInput value={s.button_text_color} onChange={(v) => patch((p) => ({ ...p, button_text_color: v }))} />
      </Field>
      <Field label="Border radius">
        <NumberWithUnit value={s.border_radius} onChange={(v) => patch((p) => ({ ...p, border_radius: v }))} />
      </Field>
    </>
  );
}

function DividerFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Style">
        <select
          value={s.style || "solid"}
          onChange={(e) => patch((p) => ({ ...p, style: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["solid", "dashed", "dotted", "double"].map((st) => <option key={st}>{st}</option>)}
        </select>
      </Field>
      <Field label="Weight (thickness)">
        <NumberWithUnit value={s.weight} onChange={(v) => patch((p) => ({ ...p, weight: v }))} />
      </Field>
      <Field label="Color">
        <ColorInput value={s.color} onChange={(v) => patch((p) => ({ ...p, color: v }))} />
      </Field>
    </>
  );
}

function SpacerFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <Field label="Space height">
      <NumberWithUnit value={s.space} onChange={(v) => patch((p) => ({ ...p, space: v }))} />
    </Field>
  );
}

function IconBoxFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Icon image URL">
        <TextInput value={s.icon?.value?.url} onChange={(v) => patch((p) => ({ ...p, icon: { value: { url: v } } }))} placeholder="https://..." />
      </Field>
      <Field label="Title">
        <TextInput value={s.title_text} onChange={(v) => patch((p) => ({ ...p, title_text: v }))} />
      </Field>
      <Field label="Description (HTML)">
        <Textarea
          value={s.description_text ?? ""}
          rows={4}
          onChange={(e) => patch((p) => ({ ...p, description_text: e.target.value }))}
          className="text-xs"
        />
      </Field>
    </>
  );
}

function IconBoxStyleFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Alignment">
        <select
          value={s.align || s.text_align || ""}
          onChange={(e) => patch((p) => ({ ...p, align: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["", "left", "center", "right", "justify"].map((a) => <option key={a} value={a}>{a || "Default"}</option>)}
        </select>
      </Field>
      <Field label="Text color">
        <ColorInput value={s.color} onChange={(v) => patch((p) => ({ ...p, color: v }))} />
      </Field>
    </>
  );
}

function ImageBoxFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Image">
        <ImagePicker value={s.image} onChange={(v) => patch((p) => ({ ...p, image: { ...(p.image || {}), ...v } }))} />
      </Field>
      <Field label="Image width">
        <NumberWithUnit value={s.image_size} onChange={(v) => patch((p) => ({ ...p, image_size: v }))} />
      </Field>
      <Field label="Title">
        <TextInput value={s.title_text} onChange={(v) => patch((p) => ({ ...p, title_text: v }))} />
      </Field>
      <Field label="Description (HTML)">
        <Textarea
          value={s.description_text ?? ""}
          rows={4}
          onChange={(e) => patch((p) => ({ ...p, description_text: e.target.value }))}
          className="text-xs"
        />
      </Field>
    </>
  );
}

function IconListFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  // Let the user edit raw items or simple descriptions
  const text = JSON.stringify(s.icon_list || [], null, 2);
  return (
    <Field label="List items (JSON)">
      <Textarea
        value={text}
        rows={8}
        className="font-mono text-xs"
        onChange={(e) => {
          try {
            const list = JSON.parse(e.target.value);
            if (Array.isArray(list)) patch((p) => ({ ...p, icon_list: list }));
          } catch { /* ignore until valid JSON */ }
        }}
      />
    </Field>
  );
}

function VideoFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Video type">
        <select
          value={s.video_type || "youtube"}
          onChange={(e) => patch((p) => ({ ...p, video_type: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["youtube", "vimeo", "hosted"].map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      {s.video_type === "hosted" ? (
        <Field label="Hosted video URL">
          <TextInput value={s.hosted_url?.url} onChange={(v) => patch((p) => ({ ...p, hosted_url: { ...(p.hosted_url || {}), url: v } }))} placeholder="https://..." />
        </Field>
      ) : (
        <Field label="Video URL">
          <TextInput
            value={s.video_type === "vimeo" ? s.vimeo_url : s.youtube_url}
            onChange={(v) => patch((p) => ({ ...p, [s.video_type === "vimeo" ? "vimeo_url" : "youtube_url"]: v }))}
            placeholder="https://..."
          />
        </Field>
      )}
    </>
  );
}

function HtmlFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <Field label="Custom HTML code">
      <Textarea
        value={s.html ?? ""}
        rows={12}
        onChange={(e) => patch((p) => ({ ...p, html: e.target.value }))}
        className="font-mono text-xs"
      />
    </Field>
  );
}

// ----- Layout/Container Fields -------------------------------------------

function ContainerFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Content width">
        <NumberWithUnit
          value={s.content_width}
          onChange={(v) => patch((p) => ({ ...p, content_width: v }))}
          units={["px", "%", "rem", "em"]}
        />
      </Field>
      <Field label="Min height">
        <div className="space-y-2">
          <select
            value={s.height || ""}
            onChange={(e) => patch((p) => ({ ...p, height: e.target.value }))}
            className="h-8 w-full rounded-md border bg-background px-2 text-xs"
          >
            <option value="">Default</option>
            <option value="min-height">Min height</option>
          </select>
          {s.height === "min-height" && (
            <NumberWithUnit
              value={s.custom_height}
              onChange={(v) => patch((p) => ({ ...p, custom_height: v }))}
              units={["px", "vh", "em"]}
            />
          )}
        </div>
      </Field>
      <Field label="Flex direction">
        <select
          value={s.flex_direction || "column"}
          onChange={(e) => patch((p) => ({ ...p, flex_direction: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          <option value="column">Column (vertical)</option>
          <option value="row">Row (horizontal)</option>
          <option value="row-reverse">Row reverse</option>
          <option value="column-reverse">Column reverse</option>
        </select>
      </Field>
      <Field label="Gap spacing">
        <NumberWithUnit value={s.flex_gap} onChange={(v) => patch((p) => ({ ...p, flex_gap: v }))} />
      </Field>
      <Field label="Justify content">
        <select
          value={s.flex_justify_content || ""}
          onChange={(e) => patch((p) => ({ ...p, flex_justify_content: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["", "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"].map((j) => (
            <option key={j} value={j}>{j || "Default"}</option>
          ))}
        </select>
      </Field>
      <Field label="Align items">
        <select
          value={s.flex_align_items || ""}
          onChange={(e) => patch((p) => ({ ...p, flex_align_items: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {["", "flex-start", "center", "flex-end", "stretch", "baseline"].map((a) => (
            <option key={a} value={a}>{a || "Default"}</option>
          ))}
        </select>
      </Field>
    </>
  );
}

function ContainerStyleFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Background color">
        <ColorInput value={s.background_color} onChange={(v) => patch((p) => ({ ...p, background_color: v }))} />
      </Field>
      <Field label="Background image">
        <ImagePicker
          value={s.background_image}
          onChange={(v) => patch((p) => ({ ...p, background_image: { ...(p.background_image || {}), ...v } }))}
        />
      </Field>
      {s.background_image?.url && (
        <>
          <Field label="Background size">
            <select
              value={s.background_size || ""}
              onChange={(e) => patch((p) => ({ ...p, background_size: e.target.value }))}
              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
            >
              {["", "auto", "cover", "contain"].map((x) => <option key={x} value={x}>{x || "Default"}</option>)}
            </select>
          </Field>
          <Field label="Background position">
            <select
              value={s.background_position || ""}
              onChange={(e) => patch((p) => ({ ...p, background_position: e.target.value }))}
              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
            >
              {["", "center center", "center left", "center right", "top center", "top left", "top right", "bottom center", "bottom left", "bottom right"].map((x) => (
                <option key={x} value={x}>{x || "Default"}</option>
              ))}
            </select>
          </Field>
          <Field label="Background repeat">
            <select
              value={s.background_repeat || ""}
              onChange={(e) => patch((p) => ({ ...p, background_repeat: e.target.value }))}
              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
            >
              {["", "no-repeat", "repeat", "repeat-x", "repeat-y"].map((x) => <option key={x} value={x}>{x || "Default"}</option>)}
            </select>
          </Field>
        </>
      )}
      <Field label="Text color">
        <ColorInput value={s.color} onChange={(v) => patch((p) => ({ ...p, color: v }))} />
      </Field>
      <Field label="Border radius">
        <NumberWithUnit value={s.border_radius} onChange={(v) => patch((p) => ({ ...p, border_radius: v }))} />
      </Field>
    </>
  );
}

function ColumnFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <Field label="Column width (%)">
      <Input
        type="number"
        value={s._column_size ?? s._inline_size ?? 100}
        onChange={(e) => patch((p) => ({ ...p, _column_size: Number(e.target.value) }))}
        className="h-8 text-xs"
      />
    </Field>
  );
}

function GenericTextFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  const text = JSON.stringify(s, null, 2);
  return (
    <Field label="Raw settings (JSON)">
      <Textarea
        value={text}
        rows={14}
        className="font-mono text-[10px]"
        onChange={(e) => {
          try {
            const next = JSON.parse(e.target.value);
            patch(() => next);
          } catch { /* ignore until valid JSON */ }
        }}
      />
    </Field>
  );
}

// ----- Advanced Tab Fields (Shared) --------------------------------------

function AdvancedFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  const margin = s.margin || { top: null, right: null, bottom: null, left: null, unit: "px" };
  const padding = s.padding || { top: null, right: null, bottom: null, left: null, unit: "px" };

  const updateMargin = (side: "top" | "right" | "bottom" | "left", val: string) => {
    const num = val === "" ? null : Number(val);
    patch((p) => ({
      ...p,
      margin: {
        ...(p.margin || { unit: "px" }),
        [side]: num,
      },
    }));
  };

  const updateMarginUnit = (unit: string) => {
    patch((p) => ({
      ...p,
      margin: {
        ...(p.margin || {}),
        unit,
      },
    }));
  };

  const updatePadding = (side: "top" | "right" | "bottom" | "left", val: string) => {
    const num = val === "" ? null : Number(val);
    patch((p) => ({
      ...p,
      padding: {
        ...(p.padding || { unit: "px" }),
        [side]: num,
      },
    }));
  };

  const updatePaddingUnit = (unit: string) => {
    patch((p) => ({
      ...p,
      padding: {
        ...(p.padding || {}),
        unit,
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* Margin */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs font-medium text-muted-foreground">Margin</Label>
          <select
            value={margin.unit || "px"}
            onChange={(e) => updateMarginUnit(e.target.value)}
            className="h-6 rounded border bg-background px-1 text-[10px]"
          >
            {["px", "%", "em", "rem"].map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <div key={side} className="space-y-1 text-center">
              <Input
                type="number"
                value={margin[side] ?? ""}
                placeholder="0"
                onChange={(e) => updateMargin(side, e.target.value)}
                className="h-8 text-xs text-center px-1"
              />
              <span className="text-[9px] uppercase text-muted-foreground">{side}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Padding */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs font-medium text-muted-foreground">Padding</Label>
          <select
            value={padding.unit || "px"}
            onChange={(e) => updatePaddingUnit(e.target.value)}
            className="h-6 rounded border bg-background px-1 text-[10px]"
          >
            {["px", "%", "em", "rem"].map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <div key={side} className="space-y-1 text-center">
              <Input
                type="number"
                value={padding[side] ?? ""}
                placeholder="0"
                onChange={(e) => updatePadding(side, e.target.value)}
                className="h-8 text-xs text-center px-1"
              />
              <span className="text-[9px] uppercase text-muted-foreground">{side}</span>
            </div>
          ))}
        </div>
      </div>

      <hr className="my-2" />

      {/* Z-Index & Custom ID/Classes */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Z-Index</Label>
          <Input
            type="number"
            value={s.z_index ?? ""}
            placeholder="auto"
            onChange={(e) => patch((p) => ({ ...p, z_index: e.target.value === "" ? null : Number(e.target.value) }))}
            className="h-8 text-xs text-center px-1"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">CSS ID</Label>
          <Input
            value={s.css_id ?? ""}
            placeholder="my-id"
            onChange={(e) => patch((p) => ({ ...p, css_id: e.target.value }))}
            className="h-8 text-xs px-1.5"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">CSS Class</Label>
          <Input
            value={s.css_classes ?? ""}
            placeholder="class1"
            onChange={(e) => patch((p) => ({ ...p, css_classes: e.target.value }))}
            className="h-8 text-xs px-1.5"
          />
        </div>
      </div>

      <hr className="my-2" />

      {/* Entrance Animation */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Entrance Animation</Label>
        <select
          value={s.animation || ""}
          onChange={(e) => patch((p) => ({ ...p, animation: e.target.value }))}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          <option value="">None</option>
          <option value="fadeIn">Fade In</option>
          <option value="fadeInDown">Fade In Down</option>
          <option value="fadeInUp">Fade In Up</option>
          <option value="fadeInLeft">Fade In Left</option>
          <option value="fadeInRight">Fade In Right</option>
          <option value="bounceIn">Bounce In</option>
          <option value="zoomIn">Zoom In</option>
        </select>
      </div>

      {s.animation && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Animation Delay (ms)</Label>
          <Input
            type="number"
            value={s.animation_delay ?? ""}
            placeholder="0"
            onChange={(e) => patch((p) => ({ ...p, animation_delay: e.target.value === "" ? null : Number(e.target.value) }))}
            className="h-8 text-xs"
          />
        </div>
      )}

      <hr className="my-2" />

      {/* Responsive Visibility */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Responsive Visibility</Label>
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs">Hide on Desktop</span>
            <Switch
              checked={s.hide_desktop === "yes"}
              onCheckedChange={(checked) => patch((p) => ({ ...p, hide_desktop: checked ? "yes" : "" }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Hide on Tablet</span>
            <Switch
              checked={s.hide_tablet === "yes"}
              onCheckedChange={(checked) => patch((p) => ({ ...p, hide_tablet: checked ? "yes" : "" }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Hide on Mobile</span>
            <Switch
              checked={s.hide_mobile === "yes"}
              onCheckedChange={(checked) => patch((p) => ({ ...p, hide_mobile: checked ? "yes" : "" }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Dispatchers per widget type ---------------------------------------

function FieldsForWidget({ widgetType, s, patch }: { widgetType: string; s: any; patch: (u: (s: any) => any) => void }) {
  switch (widgetType) {
    case "heading": return <HeadingFields s={s} patch={patch} />;
    case "text-editor": return <TextEditorFields s={s} patch={patch} />;
    case "image": return <ImageFields s={s} patch={patch} />;
    case "button": return <ButtonFields s={s} patch={patch} />;
    case "divider": return <DividerFields s={s} patch={patch} />;
    case "spacer": return <SpacerFields s={s} patch={patch} />;
    case "icon-box":
    case "image-box":
    case "testimonial":
    case "blockquote":
      return <IconBoxFields s={s} patch={patch} />;
    case "image-box-full": return <ImageBoxFields s={s} patch={patch} />;
    case "icon-list": return <IconListFields s={s} patch={patch} />;
    case "video": return <VideoFields s={s} patch={patch} />;
    case "html": return <HtmlFields s={s} patch={patch} />;
    default: return <GenericTextFields s={s} patch={patch} />;
  }
}

function StyleFieldsForWidget({ widgetType, s, patch }: { widgetType: string; s: any; patch: (u: (s: any) => any) => void }) {
  switch (widgetType) {
    case "heading": return <HeadingStyleFields s={s} patch={patch} />;
    case "text-editor": return <TextEditorStyleFields s={s} patch={patch} />;
    case "image": return <ImageStyleFields s={s} patch={patch} />;
    case "button": return <ButtonStyleFields s={s} patch={patch} />;
    case "icon-box":
    case "image-box":
    case "testimonial":
    case "blockquote":
      return <IconBoxStyleFields s={s} patch={patch} />;
    default:
      return <div className="text-xs text-muted-foreground">No custom styles for this widget type.</div>;
  }
}

// ----- Widget Library Component ------------------------------------------

type WidgetDef = {
  type: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  category: "basic" | "general";
};

const WIDGETS_LIST: WidgetDef[] = [
  { type: "heading", name: "Heading", icon: Type, description: "Add eye-catching titles", category: "basic" },
  { type: "text-editor", name: "Text Editor", icon: AlignLeft, description: "Write rich text paragraphs", category: "basic" },
  { type: "image", name: "Image", icon: ImageIcon, description: "Upload or link an image", category: "basic" },
  { type: "button", name: "Button", icon: Square, description: "Call-to-action buttons", category: "basic" },
  { type: "divider", name: "Divider", icon: Minus, description: "Visual horizontal divider", category: "basic" },
  { type: "spacer", name: "Spacer", icon: ChevronsUpDown, description: "Empty vertical spacing", category: "basic" },
  { type: "video", name: "Video", icon: Play, description: "Embed YouTube or Vimeo videos", category: "basic" },
  { type: "icon-box", name: "Icon Box", icon: Box, description: "Icon + Title + Description text", category: "general" },
  { type: "image-box", name: "Image Box", icon: Layout, description: "Image + Title + Description text", category: "general" },
  { type: "icon-list", name: "Icon List", icon: List, description: "A list with bullet icons", category: "general" },
  { type: "html", name: "HTML", icon: Code, description: "Embed custom HTML scripts", category: "general" },
  { type: "blockquote", name: "Blockquote", icon: Quote, description: "Render quotes stylishly", category: "general" },
  { type: "testimonial", name: "Testimonial", icon: MessageSquare, description: "Customer feedback box", category: "general" },
  { type: "social-icons", name: "Social Icons", icon: Share2, description: "Links to social networks", category: "general" },
];

const createWidgetNode = (type: string) => {
  const base: any = {
    id: Math.random().toString(36).slice(2, 9),
    elType: "widget",
    widgetType: type,
    settings: {},
  };

  switch (type) {
    case "heading":
      base.settings = { title: "Enter your heading here", header_size: "h2" };
      break;
    case "text-editor":
      base.settings = { editor: "<p>Start writing your rich text content here...</p>" };
      break;
    case "image":
      base.settings = { image: { url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80", alt: "Placeholder image" } };
      break;
    case "button":
      base.settings = { text: "Click Me", link: { url: "#" } };
      break;
    case "divider":
      base.settings = { weight: 2, style: "solid", color: "#cccccc" };
      break;
    case "spacer":
      base.settings = { space: 30 };
      break;
    case "icon-box":
      base.settings = { title_text: "Feature Title", description_text: "This is a feature description text." };
      break;
    case "image-box":
      base.settings = { title_text: "Feature Title", description_text: "This is a feature description text.", image: { url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=150&q=80" } };
      break;
    case "icon-list":
      base.settings = { icon_list: [{ text: "List Item 1" }, { text: "List Item 2" }] };
      break;
    case "video":
      base.settings = { youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };
      break;
    case "html":
      base.settings = { html: "<div><p>Custom HTML goes here</p></div>" };
      break;
    case "blockquote":
      base.settings = { blockquote_content: "This is an inspiring quote.", author_name: "Author Name" };
      break;
    case "testimonial":
      base.settings = { testimonial_content: "Great service and amazing experience!", testimonial_name: "John Doe", testimonial_job: "CEO" };
      break;
    case "social-icons":
      base.settings = { social_icon_list: [
        { social_icon: { value: "facebook" }, link: { url: "#" } },
        { social_icon: { value: "twitter" }, link: { url: "#" } }
      ] };
      break;
  }
  return base;
};

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

function WidgetLibrary() {
  const ed = useEditor();
  const [q, setQ] = useState("");

  if (!ed) return null;

  const filtered = WIDGETS_LIST.filter(
    (w) =>
      w.name.toLowerCase().includes(q.toLowerCase()) ||
      w.description.toLowerCase().includes(q.toLowerCase())
  );

  const handleAddWidget = (type: string) => {
    const newWidget = createWidgetNode(type);
    const isColumnSelected = ed.selected && ed.getNodeAt(ed.selected)?.elType === "column";

    if (isColumnSelected) {
      ed.insertNode(newWidget, ed.selected);
      toast.success(`Inserted ${newWidget.widgetType} in selected column`);
    } else {
      // Create a section with a single column, containing this widget, and append to root
      const section = {
        id: Math.random().toString(36).slice(2, 9),
        elType: "section",
        settings: {},
        elements: [
          {
            id: Math.random().toString(36).slice(2, 9),
            elType: "column",
            settings: { _column_size: 100 },
            elements: [newWidget],
          },
        ],
      };
      ed.insertNode(section);
      toast.success(`Added new section with ${newWidget.widgetType}`);
    }
  };

  const handleAddLayout = (cols: number) => {
    const section = createSectionNode(cols);
    ed.insertNode(section);
    toast.success(`Added ${cols}-column section layout`);
  };

  return (
    <div className="flex flex-col h-full bg-background select-none">
      <div className="p-3 border-b space-y-2 shrink-0">
        <p className="font-semibold text-xs text-foreground uppercase tracking-wider">Widget Library</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search widgets..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Layout structures */}
        {!q && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Layout Section</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((cols) => (
                <Button
                  key={cols}
                  variant="outline"
                  onClick={() => handleAddLayout(cols)}
                  className="h-12 flex flex-col gap-1 text-[9px] font-normal border-dashed p-1"
                >
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  <span>{cols} Col</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Widgets Grid */}
        <div className="space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Widgets</p>
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No widgets match your search.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((w) => {
                const Icon = w.icon;
                return (
                  <button
                    key={w.type}
                    onClick={() => handleAddWidget(w.type)}
                    className="flex flex-col items-center justify-center p-2 rounded border bg-card hover:border-blue-500 hover:bg-muted/30 transition text-center aspect-square gap-1.5"
                    title={w.description}
                  >
                    <Icon className="h-4 w-4 text-blue-500" />
                    <span className="text-[9px] font-medium truncate w-full px-0.5 text-card-foreground">{w.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t bg-muted/25 text-[9px] text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-0.5">💡 Tip:</p>
        Select a column on the canvas to insert widgets directly inside it, or click a widget to append as a new section.
      </div>
    </div>
  );
}

// ----- Main Editor Panel Component ---------------------------------------

export default function EditorPanel() {
  const ed = useEditor();
  const { node } = useSelectedNode();
  const patch = usePatchSelected();
  if (!ed) return null;

  // Render Widget Library when nothing is selected
  if (!node) {
    return <WidgetLibrary />;
  }

  const isContainer = node.elType === "section" || node.elType === "column" || node.elType === "container";
  const title = isContainer ? node.elType : (node.widgetType || "widget");

  return (
    <div className="flex flex-col h-full bg-background border-l">
      <div className="p-3 border-b flex items-center justify-between shrink-0 bg-muted/10">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Editing Element</p>
          <p className="font-semibold text-sm capitalize text-foreground">{title}</p>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => ed.select(null)} title="Back to Library">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <Tabs defaultValue="content" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 shrink-0 mb-3 bg-muted/45 p-1 h-9">
            <TabsTrigger value="content" className="text-xs h-7 py-0.5">Content</TabsTrigger>
            <TabsTrigger value="style" className="text-xs h-7 py-0.5">Style</TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs h-7 py-0.5">Advanced</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-1">
            {/* CONTENT TAB */}
            <TabsContent value="content" className="space-y-4 pt-1 outline-none">
              {isContainer ? (
                node.elType === "column" ? (
                  <ColumnFields s={node.settings || {}} patch={patch} />
                ) : (
                  <ContainerFields s={node.settings || {}} patch={patch} />
                )
              ) : (
                <FieldsForWidget widgetType={node.widgetType || ""} s={node.settings || {}} patch={patch} />
              )}
            </TabsContent>

            {/* STYLE TAB */}
            <TabsContent value="style" className="space-y-4 pt-1 outline-none">
              {isContainer ? (
                <ContainerStyleFields s={node.settings || {}} patch={patch} />
              ) : (
                <StyleFieldsForWidget widgetType={node.widgetType || ""} s={node.settings || {}} patch={patch} />
              )}
            </TabsContent>

            {/* ADVANCED TAB */}
            <TabsContent value="advanced" className="space-y-4 pt-1 outline-none">
              <AdvancedFields s={node.settings || {}} patch={patch} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
