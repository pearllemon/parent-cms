// Types + helpers for Custom Post Types, Custom Fields, Entries, Revisions.

export type FieldType =
  | "text" | "textarea" | "richtext" | "number" | "boolean"
  | "date" | "datetime" | "url" | "email" | "image"
  | "select" | "multiselect" | "color" | "json"
  | "relationship" | "repeater";

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text (single line)" },
  { value: "textarea", label: "Textarea" },
  { value: "richtext", label: "Rich text / HTML" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean (toggle)" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & time" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "image", label: "Image URL" },
  { value: "color", label: "Color" },
  { value: "select", label: "Select (single)" },
  { value: "multiselect", label: "Select (multi)" },
  { value: "json", label: "JSON" },
  { value: "relationship", label: "Relationship (entry id)" },
  { value: "repeater", label: "Repeater (list of items)" },
];

export type CPT = {
  id: string;
  slug: string;
  label: string;
  plural_label: string;
  icon: string;
  supports: string[];
  is_public: boolean;
  has_archive: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type CustomField = {
  id: string;
  cpt_slug: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  settings: Record<string, any>;
  required: boolean;
  position: number;
};

export type CPTEntry = {
  id: string;
  cpt_slug: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  data: Record<string, any>;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Revision = {
  id: string;
  entity_type: string;
  entity_id: string;
  snapshot: any;
  author_id: string | null;
  note: string | null;
  created_at: string;
};

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export const defaultValueFor = (type: FieldType): any => {
  switch (type) {
    case "boolean": return false;
    case "number": return 0;
    case "multiselect": return [];
    case "repeater": return [];
    case "json": return {};
    default: return "";
  }
};
