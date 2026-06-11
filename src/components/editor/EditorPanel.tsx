// Right-side editor panel.
// Renders different forms based on the selected Elementor node type.
// All edits go through usePatchSelected() which mutates the live tree.
import { useState } from "react";
import { useEditor, useSelectedNode, usePatchSelected } from "./EditorContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

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
        className="h-9 w-12 rounded border bg-background cursor-pointer"
      />
      <Input
        value={value ?? ""}
        placeholder="#000000 or transparent"
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <Button size="icon" variant="ghost" onClick={() => onChange("")} title="Clear">
          <X className="h-4 w-4" />
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
        className="w-24"
      />
      <select
        value={v.unit || units[0]}
        onChange={(e) => onChange({ size: v.size ?? 0, unit: e.target.value })}
        className="h-9 rounded-md border bg-background px-2 text-sm"
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
        <img src={value.url} alt={value.alt || ""} className="max-h-32 rounded border" />
      )}
      <Input
        value={value?.url ?? ""}
        placeholder="Image URL"
        onChange={(e) => onChange({ ...(value || {}), url: e.target.value })}
      />
      <Input
        value={value?.alt ?? ""}
        placeholder="Alt text"
        onChange={(e) => onChange({ ...(value || {}), url: value?.url || "", alt: e.target.value })}
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
        <span className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border cursor-pointer hover:bg-muted ${busy ? "opacity-50 pointer-events-none" : ""}`}>
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
        />
      </Field>
      <Field label="Tag">
        <select
          value={s.header_size || "h2"}
          onChange={(e) => patch((p) => ({ ...p, header_size: e.target.value }))}
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        >
          {["h1","h2","h3","h4","h5","h6","p","div"].map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Color">
        <ColorInput value={s.title_color} onChange={(v) => patch((p) => ({ ...p, title_color: v }))} />
      </Field>
      <Field label="Font size">
        <NumberWithUnit value={s.typography_font_size} onChange={(v) => patch((p) => ({ ...p, typography_font_size: v }))} />
      </Field>
      <Field label="Link URL">
        <TextInput value={s.link?.url} onChange={(v) => patch((p) => ({ ...p, link: { ...(p.link || {}), url: v } }))} />
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
      />
    </Field>
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
        <TextInput value={s.link?.url} onChange={(v) => patch((p) => ({ ...p, link: { ...(p.link || {}), url: v } }))} />
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
        <TextInput value={s.link?.url} onChange={(v) => patch((p) => ({ ...p, link: { ...(p.link || {}), url: v } }))} />
      </Field>
      <Field label="Background color">
        <ColorInput value={s.button_background_color} onChange={(v) => patch((p) => ({ ...p, button_background_color: v }))} />
      </Field>
      <Field label="Text color">
        <ColorInput value={s.button_text_color} onChange={(v) => patch((p) => ({ ...p, button_text_color: v }))} />
      </Field>
    </>
  );
}

function IconBoxFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Title">
        <TextInput value={s.title_text} onChange={(v) => patch((p) => ({ ...p, title_text: v }))} />
      </Field>
      <Field label="Description (HTML)">
        <Textarea
          value={s.description_text ?? ""}
          rows={4}
          onChange={(e) => patch((p) => ({ ...p, description_text: e.target.value }))}
        />
      </Field>
    </>
  );
}

function GenericTextFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  // Fallback for unknown widget — let user edit raw JSON for power-users.
  const text = JSON.stringify(s, null, 2);
  return (
    <Field label="Raw settings (JSON)">
      <Textarea
        value={text}
        rows={14}
        className="font-mono text-xs"
        onChange={(e) => {
          try {
            const next = JSON.parse(e.target.value);
            patch(() => next);
          } catch {
            // ignore until valid JSON
          }
        }}
      />
    </Field>
  );
}

function ContainerFields({ s, patch }: { s: any; patch: (u: (s: any) => any) => void }) {
  return (
    <>
      <Field label="Background color">
        <ColorInput value={s.background_color} onChange={(v) => patch((p) => ({ ...p, background_color: v }))} />
      </Field>
      <Field label="Background image URL">
        <TextInput
          value={s.background_image?.url}
          onChange={(v) => patch((p) => ({ ...p, background_image: { ...(p.background_image || {}), url: v } }))}
        />
      </Field>
      <Field label="Text color">
        <ColorInput value={s.color} onChange={(v) => patch((p) => ({ ...p, color: v }))} />
      </Field>
      <Field label="Padding (top, right, bottom, left)">
        <div className="grid grid-cols-4 gap-2">
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <Input
              key={side}
              type="number"
              value={s.padding?.[side] ?? ""}
              placeholder={side}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  padding: { ...(p.padding || { unit: "px" }), [side]: e.target.value === "" ? null : Number(e.target.value) },
                }))
              }
            />
          ))}
        </div>
      </Field>
    </>
  );
}

// ----- Dispatcher --------------------------------------------------------

function FieldsForWidget({ widgetType, s, patch }: { widgetType: string; s: any; patch: (u: (s: any) => any) => void }) {
  switch (widgetType) {
    case "heading": return <HeadingFields s={s} patch={patch} />;
    case "text-editor": return <TextEditorFields s={s} patch={patch} />;
    case "image": return <ImageFields s={s} patch={patch} />;
    case "button": return <ButtonFields s={s} patch={patch} />;
    case "icon-box":
    case "image-box":
    case "testimonial":
    case "blockquote":
      return <IconBoxFields s={s} patch={patch} />;
    default: return <GenericTextFields s={s} patch={patch} />;
  }
}

export default function EditorPanel() {
  const ed = useEditor();
  const { node } = useSelectedNode();
  const patch = usePatchSelected();
  if (!ed) return null;

  if (!node) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">Inline editor</p>
        <p>Click any element on the page to edit it. Changes save back to this page only.</p>
      </div>
    );
  }

  const isContainer = node.elType === "section" || node.elType === "column" || node.elType === "container";
  const title = isContainer ? node.elType : (node.widgetType || "widget");

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Editing</p>
          <p className="font-medium capitalize">{title}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => ed.select(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Tabs defaultValue="content">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="space-y-4 pt-4">
            {isContainer
              ? <ContainerFields s={node.settings || {}} patch={patch} />
              : <FieldsForWidget widgetType={node.widgetType || ""} s={node.settings || {}} patch={patch} />}
          </TabsContent>
          <TabsContent value="style" className="space-y-4 pt-4">
            <ContainerFields s={node.settings || {}} patch={patch} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
