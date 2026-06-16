// Inline Custom Fields editor for the post editor / CPT entry editor.
//
// Loads:
//   - Globally-defined fields (cpt_slug = '__global__')
//   - Type-scoped fields (cpt_slug = 'post' / 'page' / actual CPT slug)
//   - Per-entry attached fields (cpt_slug = '__entry__' filtered by entity_id)
//
// Lets the user:
//   - Fill values (rendered via FieldRenderer)
//   - Add a new field (Quick-add) scoped to: this entry only / this type / globally
//   - Delete a per-entry field
//
// Values auto-save via the parent on change; field schema changes go to
// `custom_fields` and reload immediately.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Settings as SettingsIcon, Trash2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { toast } from "sonner";
import FieldRenderer from "@/components/admin/FieldRenderer";
import {
  loadFieldsFor, loadPerEntryFields, createField, deleteField, updateField,
} from "@/lib/customFields";
import type { CustomField, FieldType } from "@/lib/cpt";
import { FIELD_TYPES, slugify } from "@/lib/cpt";

type Props = {
  entityType: string;          // 'post' | 'page' | 'cpt:<slug>'
  entityId: string | null;     // null when entity not saved yet
  values: Record<string, unknown>;
  onValuesChange: (v: Record<string, unknown>) => void;
};

export default function CustomFieldsPanel({ entityType, entityId, values, onValuesChange }: Props) {
  const [shared, setShared] = useState<CustomField[]>([]);
  const [perEntry, setPerEntry] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [s, e] = await Promise.all([
      loadFieldsFor(entityType),
      entityId ? loadPerEntryFields(entityType, entityId) : Promise.resolve([]),
    ]);
    setShared(s);
    setPerEntry(e);
    setLoading(false);
  };
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, [entityType, entityId]);

  const all = [...shared, ...perEntry];
  const setValue = (key: string, v: unknown) => onValuesChange({ ...values, [key]: v });

  return (
    <Collapsible defaultOpen className="bg-background border rounded-2xl">
      <div className="flex items-center justify-between p-3 border-b">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
          <SettingsIcon className="w-4 h-4" /> Custom Fields ({all.length})
          <ChevronDown className="w-4 h-4 transition-transform [&[data-state=open]>svg]:rotate-180" />
        </CollapsibleTrigger>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="w-3 h-3 mr-1" /> Add field
        </Button>
      </div>

      <CollapsibleContent className="p-4 space-y-4">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && all.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No custom fields. Click <b>Add field</b> to attach one to this entry, this content type, or globally.
          </p>
        )}

        {all.map((f) => (
          <div key={f.id} className="group relative">
            <FieldRenderer field={f} value={values[f.field_key]} onChange={(v) => setValue(f.field_key, v)} />
            <button
              onClick={async () => {
                if (!confirm(`Remove field "${f.label}"? This deletes the field definition.`)) return;
                await deleteField(f.id);
                toast.success("Field removed");
                await reload();
              }}
              className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition text-red-600 bg-background border rounded p-0.5"
              title="Delete field"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <div className="text-[10px] text-muted-foreground mt-1">
              {f.cpt_slug === "__global__" ? "Global" : f.cpt_slug === "__entry__" ? "This entry only" : `Type: ${f.cpt_slug}`}
              {" · "}{f.field_key}
            </div>
          </div>
        ))}
      </CollapsibleContent>

      <AddFieldDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        entityType={entityType}
        entityId={entityId}
        onCreated={reload}
      />
    </Collapsible>
  );
}

function AddFieldDialog({
  open, onOpenChange, entityType, entityId, onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  entityType: string;
  entityId: string | null;
  onCreated: () => void;
}) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [required, setRequired] = useState(false);
  const [scope, setScope] = useState<"entry" | "type" | "global">("entry");

  useEffect(() => { if (open) { setLabel(""); setKey(""); setType("text"); setRequired(false); setScope(entityId ? "entry" : "type"); } }, [open, entityId]);

  const typeSlug = entityType.startsWith("cpt:") ? entityType.slice(4) : entityType;

  const submit = async () => {
    if (!label.trim()) return toast.error("Label required");
    const finalKey = (key || slugify(label)).replace(/-/g, "_");
    try {
      const cpt_slug =
        scope === "global" ? "__global__" :
        scope === "entry"  ? "__entry__"  :
        typeSlug;
      const settings: Record<string, unknown> = {};
      if (scope === "entry" && entityId) {
        settings.entity_type = entityType;
        settings.entity_id = entityId;
      }
      await createField({
        cpt_slug, field_key: finalKey, label, field_type: type, required, settings,
      });
      toast.success("Field added");
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Custom Field</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Label</Label>
            <Input value={label} onChange={(e) => { setLabel(e.target.value); if (!key) setKey(slugify(e.target.value).replace(/-/g, "_")); }} placeholder="e.g. Reading time" />
          </div>
          <div><Label className="text-xs">Field key</Label>
            <Input value={key} onChange={(e) => setKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))} placeholder="reading_time" />
          </div>
          <div><Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Apply to</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as "entry" | "type" | "global")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entry" disabled={!entityId}>Only this entry{!entityId && " (save first)"}</SelectItem>
                <SelectItem value="type">All {typeSlug}s (entire content type)</SelectItem>
                <SelectItem value="global">Global (every content type)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded border p-2">
            <Label className="text-xs">Required</Label>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add field</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// re-export for convenience
export { updateField };
