// Public renderer for a Form Builder definition.
// Use as <FormRenderer slug="contact" /> or <FormRenderer id="..."/>.
import { useEffect, useMemo, useState } from "react";
import { getForm, submitForm, type FormDefinition, type FormField } from "@/lib/forms";

type Props = { id?: string; slug?: string; className?: string };

function widthClass(w?: string) {
  if (w === "half") return "md:col-span-6";
  if (w === "third") return "md:col-span-4";
  return "md:col-span-12";
}

export default function FormRenderer({ id, slug, className }: Props) {
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">("idle");

  useEffect(() => {
    let alive = true;
    (async () => {
      const f = await getForm({ id, slug });
      if (alive) setForm(f);
    })();
    return () => { alive = false; };
  }, [id, slug]);

  const fields = useMemo(
    () => (form?.fields || []).slice().sort((a, b) => (a.layout?.order ?? 0) - (b.layout?.order ?? 0)),
    [form],
  );

  if (!form) return <div className="text-sm text-muted-foreground">Loading form…</div>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrors({});
    const res = await submitForm({ form_id: form!.id, values });
    if (res.ok) {
      setStatus("ok");
      if (res.redirect_url) window.location.href = res.redirect_url;
    } else {
      setErrors(res.fields || {});
      setStatus("error");
    }
  }

  const showLabel = (f: FormField) =>
    (f.style?.showLabel ?? true) && f.style?.labelPosition !== "hidden";

  return (
    <form onSubmit={handleSubmit} className={className ?? "space-y-4"} noValidate>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {fields.map((f) => {
          const v = values[f.key];
          const err = errors[f.key];
          const label = showLabel(f) ? (
            <label className="block text-sm font-medium mb-1" htmlFor={f.id}>
              {f.label}{f.required ? " *" : ""}
            </label>
          ) : null;
          const common = {
            id: f.id,
            name: f.key,
            placeholder: f.placeholder,
            required: !!f.required,
            value: (v as string) ?? "",
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
              setValues((p) => ({ ...p, [f.key]: e.target.value })),
            className: "w-full rounded-md border bg-background px-3 py-2 text-sm",
          };
          let control: React.ReactNode = null;
          switch (f.type) {
            case "textarea":
              control = <textarea {...common} rows={4} />;
              break;
            case "select":
              control = (
                <select {...common}>
                  <option value="">{f.placeholder || "Select…"}</option>
                  {(f.options || []).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              );
              break;
            case "checkbox":
            case "consent":
              control = (
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!v}
                    onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.checked }))}
                  />
                  {f.label}
                </label>
              );
              break;
            case "hidden":
              control = <input type="hidden" {...common} />;
              break;
            default:
              control = <input type={f.type === "phone" ? "tel" : f.type} {...common} />;
          }
          return (
            <div key={f.id} className={widthClass(f.layout?.width)}>
              {f.type !== "checkbox" && f.type !== "consent" && f.type !== "hidden" && label}
              {control}
              {f.help && <p className="text-xs text-muted-foreground mt-1">{f.help}</p>}
              {err && <p className="text-xs text-destructive mt-1">{err}</p>}
            </div>
          );
        })}
      </div>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : (form.settings?.submit_label as string) || "Submit"}
      </button>
      {status === "ok" && (
        <p className="text-sm text-green-600">{(form.settings?.success_message as string) || "Thanks — we'll be in touch."}</p>
      )}
    </form>
  );
}
