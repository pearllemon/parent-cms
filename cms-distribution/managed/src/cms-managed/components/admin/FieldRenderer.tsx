// Renders a form input for a single custom field.

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { CustomField, FieldType } from "@/lib/cpt";
import { defaultValueFor } from "@/lib/cpt";

type Props = { field: CustomField; value: any; onChange: (v: any) => void };

export default function FieldRenderer({ field, value, onChange }: Props) {
  const t = field.field_type;
  const opts: { label: string; value: string }[] = field.settings?.options || [];

  const wrap = (input: React.ReactNode) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{field.label}{field.required && <span className="text-red-500"> *</span>}</Label>
      {input}
      {field.settings?.help && <p className="text-xs text-muted-foreground">{field.settings.help}</p>}
    </div>
  );

  if (t === "text" || t === "url" || t === "email" || t === "image" || t === "color") {
    return wrap(<Input type={t === "color" ? "color" : "text"} value={value || ""} onChange={(e) => onChange(e.target.value)} />);
  }
  if (t === "number") {
    return wrap(<Input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />);
  }
  if (t === "date" || t === "datetime") {
    return wrap(<Input type={t === "date" ? "date" : "datetime-local"} value={value || ""} onChange={(e) => onChange(e.target.value)} />);
  }
  if (t === "textarea") {
    return wrap(<Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={4} />);
  }
  if (t === "richtext") {
    return wrap(<Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={10} className="font-mono text-xs" />);
  }
  if (t === "boolean") {
    return (
      <div className="flex items-center justify-between border rounded p-3">
        <Label className="text-sm">{field.label}</Label>
        <Switch checked={!!value} onCheckedChange={onChange} />
      </div>
    );
  }
  if (t === "select") {
    return wrap(
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent>
          {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (t === "multiselect") {
    const arr: string[] = Array.isArray(value) ? value : [];
    return wrap(
      <div className="border rounded p-2 space-y-1">
        {opts.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={arr.includes(o.value)}
              onChange={(e) => onChange(e.target.checked ? [...arr, o.value] : arr.filter((v) => v !== o.value))}
            />
            {o.label}
          </label>
        ))}
      </div>
    );
  }
  if (t === "json") {
    let text = "";
    try { text = typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2); } catch { text = ""; }
    return wrap(
      <Textarea
        value={text}
        onChange={(e) => {
          try { onChange(JSON.parse(e.target.value)); } catch { onChange(e.target.value); }
        }}
        rows={6}
        className="font-mono text-xs"
      />
    );
  }
  if (t === "relationship") {
    return wrap(<Input placeholder="Entry id or slug" value={value || ""} onChange={(e) => onChange(e.target.value)} />);
  }
  if (t === "repeater") {
    const items: any[] = Array.isArray(value) ? value : [];
    const sub: CustomField[] = field.settings?.fields || [];
    return (
      <div className="space-y-2">
        <Label className="text-xs">{field.label}</Label>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="border rounded p-3 space-y-2 relative">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Item {idx + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => onChange(items.filter((_, i) => i !== idx))}><Trash2 className="w-3 h-3" /></Button>
              </div>
              {sub.length === 0 ? (
                <Input value={typeof item === "string" ? item : ""} onChange={(e) => {
                  const next = [...items]; next[idx] = e.target.value; onChange(next);
                }} />
              ) : (
                sub.map((sf) => (
                  <FieldRenderer
                    key={sf.field_key}
                    field={sf}
                    value={item?.[sf.field_key]}
                    onChange={(v) => {
                      const next = [...items];
                      next[idx] = { ...(next[idx] || {}), [sf.field_key]: v };
                      onChange(next);
                    }}
                  />
                ))
              )}
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => {
            const blank = sub.length === 0 ? "" : sub.reduce((a, s) => ({ ...a, [s.field_key]: defaultValueFor(s.field_type as FieldType) }), {});
            onChange([...items, blank]);
          }}><Plus className="w-3 h-3 mr-1" /> Add item</Button>
        </div>
      </div>
    );
  }
  return wrap(<Input value={value || ""} onChange={(e) => onChange(e.target.value)} />);
}
