// Form Builder helpers — wraps the cms-forms edge function and the local
// form_definitions table. Used by the admin builder and the public renderer.
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "./parent";

const FN = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/cms-forms`;

export type FormField = {
  id: string;
  key: string;
  label: string;
  type:
    | "text" | "email" | "phone" | "number" | "textarea"
    | "select" | "multiselect" | "radio" | "checkbox"
    | "date" | "time" | "file" | "hidden" | "consent"
    | "rating" | "signature" | "address" | "payment" | "captcha";
  placeholder?: string;
  help?: string;
  required?: boolean;
  validation?: { pattern?: string; min?: number; max?: number; message?: string };
  options?: { value: string; label: string }[];
  layout?: { width?: "full" | "half" | "third"; order?: number };
  style?: {
    showLabel?: boolean;
    labelPosition?: "top" | "left" | "inside" | "hidden";
    color?: string;
    border?: string;
    radius?: string;
    padding?: string;
  };
  conditional?: { key: string; op: "eq" | "neq" | "in"; value: unknown };
};

export type FormDefinition = {
  id: string;
  site_id: string | null;
  name: string;
  slug: string;
  fields: FormField[];
  settings: Record<string, unknown>;
  submit_action: "lead" | "email" | "webhook";
  redirect_url: string | null;
  email_to: string | null;
  version: number;
  created_at?: string;
  updated_at?: string;
};

async function call(action: string, init?: RequestInit) {
  const sess = await supabase.auth.getSession();
  const token = sess.data.session?.access_token;
  const res = await fetch(`${FN}?action=${action}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export async function listForms(): Promise<FormDefinition[]> {
  try {
    const r = await call("forms", { method: "GET" });
    return r.forms || [];
  } catch {
    // Direct table fallback when the edge function is still warming up.
    const { data } = await supabase.from("form_definitions" as never).select("*").order("updated_at", { ascending: false });
    return (data as unknown as FormDefinition[]) || [];
  }
}

export async function getForm(opts: { id?: string; slug?: string }): Promise<FormDefinition | null> {
  const qs = new URLSearchParams();
  if (opts.id) qs.set("id", opts.id);
  if (opts.slug) qs.set("slug", opts.slug);
  const res = await fetch(`${FN}?action=form&${qs.toString()}`);
  if (!res.ok) return null;
  const { form } = await res.json();
  return form;
}

export async function saveForm(f: Partial<FormDefinition>): Promise<FormDefinition> {
  const r = await call("form_save", { method: "POST", body: JSON.stringify(f) });
  return r.form;
}

export async function submitForm(input: {
  form_id?: string;
  form_slug?: string;
  values: Record<string, unknown>;
}): Promise<{ ok: boolean; redirect_url?: string | null; error?: string; fields?: Record<string, string> }> {
  const res = await fetch(`${FN}?action=form_submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, source_url: typeof location !== "undefined" ? location.href : null }),
  });
  return res.json();
}

// Re-export for callers that need the base API host.
export const FORMS_API = FN;
export const PARENT_HOST = SUPABASE_URL;
