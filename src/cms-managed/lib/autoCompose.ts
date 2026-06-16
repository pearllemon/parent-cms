// §17 — Content auto-generation. Paste markdown / html / plain text and get a
// block tree the Visual Editor can open immediately.
// Always tries the parent CMS first (which can run the full pipeline with
// AI styling + image placement); falls back to a local markdown parser so
// the feature still works while the parent endpoint is being deployed.
import { API, SUPABASE_ANON_KEY, getSiteId } from "./parent";

export type ComposeFormat = "markdown" | "docx" | "html" | "plaintext" | "richtext";
export type ComposeTarget = "post" | "page" | "landing" | "case_study" | "service";

export type ComposeBlock = {
  id: string;
  type: "heading" | "text" | "image" | "section" | "container";
  props: Record<string, unknown>;
  children?: ComposeBlock[];
};

export type ComposeResult = {
  post_id?: string;
  blocks: ComposeBlock[];
  seo?: { title?: string; desc?: string; og?: string };
  outline?: { level: number; text: string }[];
  suggested_images?: string[];
  toc?: { level: number; text: string; anchor: string }[];
};

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

// Local fallback: markdown / plaintext → block tree.
function composeLocal(content: string, format: ComposeFormat): ComposeResult {
  const blocks: ComposeBlock[] = [];
  const outline: { level: number; text: string }[] = [];
  const lines = (format === "html" ? content.replace(/<[^>]+>/g, " ") : content).split(/\r?\n/);
  let buf: string[] = [];
  const flushPara = () => {
    if (!buf.length) return;
    const text = buf.join(" ").trim();
    if (text) blocks.push({ id: uid(), type: "text", props: { text } });
    buf = [];
  };
  for (const ln of lines) {
    const m = /^(#{1,6})\s+(.+)/.exec(ln);
    if (m) {
      flushPara();
      const level = m[1].length;
      const text = m[2].trim();
      outline.push({ level, text });
      blocks.push({ id: uid(), type: "heading", props: { level, text } });
      continue;
    }
    const img = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(ln);
    if (img) {
      flushPara();
      blocks.push({ id: uid(), type: "image", props: { src: img[2], alt: img[1] } });
      continue;
    }
    if (!ln.trim()) flushPara();
    else buf.push(ln);
  }
  flushPara();
  const title = outline.find((o) => o.level === 1)?.text || lines.find((l) => l.trim())?.slice(0, 80) || "Untitled";
  const desc = blocks.find((b) => b.type === "text")?.props.text as string | undefined;
  const toc = outline.map((o) => ({ ...o, anchor: o.text.toLowerCase().replace(/[^a-z0-9]+/g, "-") }));
  return {
    blocks: [{ id: uid(), type: "section", props: { padding: "48px 0" }, children: [
      { id: uid(), type: "container", props: { maxWidth: 800 }, children: blocks },
    ] }],
    seo: { title, desc: desc?.slice(0, 160) },
    outline,
    toc,
    suggested_images: [],
  };
}

export async function autoCompose(input: {
  target: ComposeTarget;
  format: ComposeFormat;
  content: string;
  images?: string[];
  style_preset?: string;
  generate_seo?: boolean;
}): Promise<ComposeResult> {
  try {
    const site_id = await getSiteId();
    if (site_id) {
      const res = await fetch(`${API}?action=auto_compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({
          site_id,
          target: input.target,
          format: input.format,
          content: input.content,
          images: input.images || [],
          style_preset: input.style_preset,
          generate_seo: input.generate_seo ?? true,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as ComposeResult;
        if (Array.isArray(data?.blocks) && data.blocks.length) return data;
      }
    }
  } catch { /* fall through to local */ }
  return composeLocal(input.content, input.format);
}
