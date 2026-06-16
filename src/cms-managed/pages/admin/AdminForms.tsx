// Form Builder — list, create, and edit form definitions.
// Live preview uses the same FormRenderer the public site ships.
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, GripVertical, Save, Eye } from "lucide-react";
import { listForms, saveForm, type FormDefinition, type FormField } from "@/lib/forms";
import { toast } from "sonner";
import FormRenderer from "@/components/site/FormRenderer";

const FIELD_TYPES: FormField["type"][] = [
  "text", "email", "phone", "number", "textarea", "select",
  "checkbox", "radio", "date", "time", "file", "hidden", "consent",
];

const blankField = (): FormField => ({
  id: crypto.randomUUID(),
  key: `field_${Math.random().toString(36).slice(2, 7)}`,
  label: "New field",
  type: "text",
  layout: { width: "full", order: 0 },
  style: { showLabel: true, labelPosition: "top" },
});

const blankForm = (): Partial<FormDefinition> => ({
  name: "Untitled form",
  slug: `form-${Math.random().toString(36).slice(2, 7)}`,
  fields: [
    { ...blankField(), key: "name", label: "Name", required: true, layout: { width: "half", order: 0 } },
    { ...blankField(), key: "email", label: "Email", type: "email", required: true, layout: { width: "half", order: 1 } },
    { ...blankField(), key: "message", label: "Message", type: "textarea", layout: { width: "full", order: 2 } },
  ],
  settings: { submit_label: "Send", success_message: "Thanks — we'll be in touch." },
  submit_action: "lead",
  version: 0,
});

export default function AdminForms() {
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [editing, setEditing] = useState<Partial<FormDefinition> | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => setForms(await listForms());
  useEffect(() => { void refresh(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const saved = await saveForm(editing);
      toast.success("Form saved");
      setEditing(saved);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    if (!editing?.fields) return;
    const arr = editing.fields.slice();
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    arr.forEach((f, i) => (f.layout = { ...f.layout, order: i }));
    setEditing({ ...editing, fields: arr });
  };

  const updateField = (idx: number, patch: Partial<FormField>) => {
    if (!editing?.fields) return;
    const arr = editing.fields.slice();
    arr[idx] = { ...arr[idx], ...patch };
    setEditing({ ...editing, fields: arr });
  };

  const removeField = (idx: number) => {
    if (!editing?.fields) return;
    setEditing({ ...editing, fields: editing.fields.filter((_, i) => i !== idx) });
  };

  const addField = () => {
    if (!editing) return;
    const f = blankField();
    f.layout!.order = editing.fields?.length ?? 0;
    setEditing({ ...editing, fields: [...(editing.fields || []), f] });
  };

  const previewForm = useMemo(() => editing as FormDefinition | null, [editing]);

  if (!editing) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Forms</h1>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm"
            onClick={() => setEditing(blankForm())}
          >
            <Plus className="h-4 w-4" /> New form
          </button>
        </div>
        <div className="border rounded-md divide-y">
          {forms.length === 0 && <p className="p-4 text-sm text-muted-foreground">No forms yet.</p>}
          {forms.map((f) => (
            <button
              key={f.id}
              className="w-full p-3 text-left hover:bg-muted/40 flex items-center justify-between"
              onClick={() => setEditing(f)}
            >
              <span>
                <span className="font-medium">{f.name}</span>{" "}
                <code className="text-xs text-muted-foreground">/{f.slug}</code>
              </span>
              <span className="text-xs text-muted-foreground">{f.fields?.length ?? 0} fields · v{f.version}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button className="text-sm text-muted-foreground hover:underline" onClick={() => setEditing(null)}>
            ← Back
          </button>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Name
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editing.name ?? ""}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Slug
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editing.slug ?? ""}
              onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Redirect URL (optional)
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editing.redirect_url ?? ""}
              onChange={(e) => setEditing({ ...editing, redirect_url: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Email recipient (optional)
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editing.email_to ?? ""}
              onChange={(e) => setEditing({ ...editing, email_to: e.target.value })}
            />
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Fields</h2>
            <button
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              onClick={addField}
            >
              <Plus className="h-3 w-3" /> Add field
            </button>
          </div>
          {(editing.fields || []).map((f, i) => (
            <div key={f.id} className="border rounded-md p-3 space-y-2 bg-card">
              <div className="flex items-center gap-2">
                <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-4 w-4" />
                </button>
                <input
                  className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                  value={f.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  placeholder="Label"
                />
                <input
                  className="w-32 rounded-md border bg-background px-2 py-1 text-xs font-mono"
                  value={f.key}
                  onChange={(e) => updateField(i, { key: e.target.value })}
                  placeholder="key"
                />
                <select
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  value={f.type}
                  onChange={(e) => updateField(i, { type: e.target.value as FormField["type"] })}
                >
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                  value={f.layout?.width || "full"}
                  onChange={(e) => updateField(i, { layout: { ...f.layout, width: e.target.value as "full" | "half" | "third" } })}
                >
                  <option value="full">Full</option>
                  <option value="half">Half</option>
                  <option value="third">Third</option>
                </select>
                <label className="inline-flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={!!f.required}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                  />
                  Req
                </label>
                <label className="inline-flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={f.style?.showLabel ?? true}
                    onChange={(e) =>
                      updateField(i, { style: { ...f.style, showLabel: e.target.checked, labelPosition: e.target.checked ? "top" : "hidden" } })
                    }
                  />
                  Show label
                </label>
                <button onClick={() => removeField(i)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {(f.type === "select" || f.type === "radio" || f.type === "multiselect") && (
                <textarea
                  className="w-full rounded-md border bg-background px-2 py-1 text-xs font-mono"
                  placeholder="One option per line: value|label"
                  rows={3}
                  value={(f.options || []).map((o) => `${o.value}|${o.label}`).join("\n")}
                  onChange={(e) =>
                    updateField(i, {
                      options: e.target.value.split("\n").filter(Boolean).map((l) => {
                        const [v, lab] = l.split("|");
                        return { value: v.trim(), label: (lab ?? v).trim() };
                      }),
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 self-start border rounded-md p-4 bg-card">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <Eye className="h-4 w-4" /> Live preview
        </div>
        {previewForm?.id ? (
          <FormRenderer id={previewForm.id} />
        ) : (
          <p className="text-xs text-muted-foreground">Save the form once to enable the live preview.</p>
        )}
      </aside>
    </div>
  );
}
