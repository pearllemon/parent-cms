// Public renderer for a Form Builder definition.
// Use as <FormRenderer slug="contact" /> or <FormRenderer id="..."/>.
import { useEffect, useMemo, useState } from "react";
import { getForm, submitForm, type FormDefinition, type FormField } from "@/lib/forms";
import { supabase } from "@/integrations/supabase/client";

type Props = { id?: string; slug?: string; className?: string; branding?: any };

const defaultContactForm = {
  id: "default-contact",
  name: "Contact Form",
  fields: [
    { id: "f1", key: "name", label: "Full Name", type: "text", required: true, placeholder: "Enter your full name", layout: { width: "half" } },
    { id: "f2", key: "email", label: "Email Address", type: "email", required: true, placeholder: "Enter your email address", layout: { width: "half" } },
    { id: "f3", key: "phone", label: "Phone Number", type: "phone", required: true, placeholder: "+44 7123 456789", layout: { width: "half" } },
    { id: "f4", key: "subject", label: "Subject", type: "text", placeholder: "What is this regarding?", layout: { width: "half" } },
    { id: "f5", key: "keyword", label: "What Keyword Did You Use To Find Us?", type: "text", placeholder: "e.g. BREEAM Assessor London", layout: { width: "full" } },
    { id: "f6", key: "message", label: "Message", type: "textarea", required: true, placeholder: "Write what you need help with...", layout: { width: "full" } },
  ] as FormField[],
  settings: { submit_label: "Submit", success_message: "Thanks! We've received your request and will contact you shortly." }
};

function widthClass(w?: string) {
  if (w === "half") return "md:col-span-6";
  if (w === "third") return "md:col-span-4";
  return "md:col-span-12";
}

export default function FormRenderer({ id, slug, className, branding }: Props) {
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">("idle");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const f = await getForm({ id, slug });
        if (alive) {
          if (f) {
            setForm(f);
          } else if (slug === "contact" || slug === "contact-us") {
            setForm(defaultContactForm as FormDefinition);
          }
        }
      } catch {
        if (alive && (slug === "contact" || slug === "contact-us")) {
          setForm(defaultContactForm as FormDefinition);
        }
      }
    })();
    return () => { alive = false; };
  }, [id, slug]);

  const fields = useMemo(
    () => (form?.fields || []).slice().sort((a, b) => (a.layout?.order ?? 0) - (b.layout?.order ?? 0)),
    [form],
  );

  if (!form) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-slate-100 rounded-xl"></div>
          <div className="h-10 bg-slate-100 rounded-xl"></div>
        </div>
        <div className="h-32 bg-slate-100 rounded-xl"></div>
        <div className="h-10 bg-slate-200 rounded-xl w-32"></div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrors({});

    // Client-side validation
    const newErrors: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.required && !values[f.key]) {
        newErrors[f.key] = `${f.label} is required`;
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setStatus("error");
      return;
    }
    
    if (form?.id === "default-contact") {
      const { name, email, phone, message, keyword, subject } = values as any;
      const { error } = await supabase.from("leads").insert({
        name: name || "Website lead",
        email: email,
        phone: phone || null,
        message: `${subject ? `[Subject: ${subject}] ` : ""}${message || ""}${keyword ? ` [Keyword: ${keyword}]` : ""}`,
        source: "contact-form-fallback",
      });
      if (error) {
        setStatus("error");
      } else {
        setStatus("ok");
        setValues({});
      }
      return;
    }

    const res = await submitForm({ form_id: form!.id, values });
    if (res.ok) {
      setStatus("ok");
      setValues({});
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor={f.id}>
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
            className: "w-full rounded-xl border border-slate-250 bg-slate-50/40 px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all outline-none",
            style: branding?.primary ? ({ "--tw-ring-color": branding.primary } as any) : undefined,
          };
          let control: React.ReactNode = null;
          switch (f.type) {
            case "textarea":
              control = <textarea {...common} rows={4} className={`${common.className} resize-none`} />;
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
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!v}
                    onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.checked }))}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
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
              {err && <p className="text-xs text-rose-550 mt-1 font-medium">{err}</p>}
            </div>
          );
        })}
      </div>
      <div className="pt-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-xl text-white px-6 py-3.5 text-sm font-bold shadow-md active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: branding?.primary || "#000" }}
        >
          {status === "submitting" ? "Sending…" : (form.settings?.submit_label as string) || "Submit"}
        </button>
      </div>
      {status === "ok" && (
        <p className="text-sm text-emerald-600 mt-2 font-semibold">{(form.settings?.success_message as string) || "Thanks — we'll be in touch."}</p>
      )}
      {status === "error" && Object.keys(errors).length === 0 && (
        <p className="text-sm text-rose-600 mt-2 font-semibold">Failed to send message. Please try again.</p>
      )}
    </form>
  );
}
