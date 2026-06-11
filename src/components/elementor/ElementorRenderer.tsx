// Minimal-but-faithful Elementor renderer.
// Walks the Elementor element tree (sections → columns → widgets) and emits
// React. Covers the most common widget types from the imported Elementor kit:
// section, container, column, heading, text-editor, image, button, divider,
// spacer, icon, icon-box, icon-list, image-box, video, html, shortcode (pass-
// through), blockquote, testimonial, social-icons, toggle/tabs (best effort).
// Unknown widgets render their children so layout is preserved.

import { CSSProperties, ReactNode, useMemo } from "react";
import { useEditor, type Path } from "@/components/editor/EditorContext";
import NodeToolbar from "@/components/editor/NodeToolbar";

type ElNode = {
  id?: string;
  elType?: "section" | "column" | "container" | "widget";
  widgetType?: string;
  settings?: Record<string, any>;
  elements?: ElNode[];
  isInner?: boolean;
};

const px = (v: any): string => {
  if (v == null) return "";
  if (typeof v === "number") return `${v}px`;
  if (typeof v === "string" && v.trim()) return /[a-z%]$/i.test(v) ? v : `${v}px`;
  if (typeof v === "object" && v.size != null) return `${v.size}${v.unit || "px"}`;
  return "";
};

const spacingStyle = (s: any, prefix: "padding" | "margin"): CSSProperties => {
  if (!s) return {};
  const unit = s.unit || "px";
  const out: any = {};
  if (s.top != null) out[`${prefix}Top`] = `${s.top}${unit}`;
  if (s.right != null) out[`${prefix}Right`] = `${s.right}${unit}`;
  if (s.bottom != null) out[`${prefix}Bottom`] = `${s.bottom}${unit}`;
  if (s.left != null) out[`${prefix}Left`] = `${s.left}${unit}`;
  return out;
};

const bgStyle = (s: Record<string, any>): CSSProperties => {
  const out: CSSProperties = {};
  if (s.background_color) out.backgroundColor = s.background_color;
  if (s.background_image?.url) {
    out.backgroundImage = `url(${s.background_image.url})`;
    out.backgroundSize = s.background_size || "cover";
    out.backgroundPosition = s.background_position || "center center";
    out.backgroundRepeat = s.background_repeat || "no-repeat";
  }
  return out;
};

const containerStyle = (s: Record<string, any>): CSSProperties => {
  return {
    ...bgStyle(s),
    ...spacingStyle(s.padding, "padding"),
    ...spacingStyle(s.margin, "margin"),
    color: s.color || undefined,
    minHeight: s.height === "min-height" ? px(s.custom_height) || undefined : undefined,
  };
};

const textAlign = (s: Record<string, any>): CSSProperties => {
  const a = s.align || s.text_align;
  if (!a) return {};
  return { textAlign: a as CSSProperties["textAlign"] };
};

const sanitizeHtml = (html: string): string => {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "");
};

// -------- Widgets ----------------------------------------------------------

function Heading({ s }: { s: Record<string, any> }) {
  const Tag = (s.header_size || "h2") as keyof JSX.IntrinsicElements;
  return (
    <Tag
      style={{
        ...textAlign(s),
        color: s.title_color || undefined,
        fontSize: px(s.typography_font_size) || undefined,
        fontFamily: s.typography_font_family || undefined,
        fontWeight: s.typography_font_weight || undefined,
        lineHeight: px(s.typography_line_height) || (s.typography_line_height?.size ?? undefined),
        letterSpacing: px(s.typography_letter_spacing) || undefined,
        textTransform: (s.typography_text_transform || undefined) as any,
        margin: 0,
      }}
      className="font-display"
    >
      {s.link?.url ? (
        <a href={s.link.url} className="hover:underline">{s.title}</a>
      ) : (
        s.title
      )}
    </Tag>
  );
}

function TextEditor({ s }: { s: Record<string, any> }) {
  return (
    <div
      className="prose prose-neutral max-w-none prose-img:rounded-lg"
      style={textAlign(s)}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.editor || "") }}
    />
  );
}

function Image({ s }: { s: Record<string, any> }) {
  const url = s.image?.url;
  if (!url) return null;
  const img = (
    <img
      src={url}
      alt={s.image?.alt || s.caption || ""}
      loading="lazy"
      style={{
        maxWidth: "100%",
        width: px(s.width) || undefined,
        height: px(s.height) || "auto",
        objectFit: (s.object_fit as any) || undefined,
        borderRadius: px(s.border_radius) || undefined,
      }}
    />
  );
  return (
    <figure style={textAlign(s)} className="m-0">
      {s.link?.url ? <a href={s.link.url}>{img}</a> : img}
      {s.caption && <figcaption className="text-sm text-muted-foreground mt-2">{s.caption}</figcaption>}
    </figure>
  );
}

function ButtonWidget({ s }: { s: Record<string, any> }) {
  const href = s.link?.url || "#";
  const target = s.link?.is_external ? "_blank" : undefined;
  return (
    <div style={textAlign(s)}>
      <a
        href={href}
        target={target}
        rel={target ? "noopener noreferrer" : undefined}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition hover:opacity-90"
        style={{
          backgroundColor: s.button_background_color || "hsl(var(--primary))",
          color: s.button_text_color || "hsl(var(--primary-foreground))",
          borderRadius: px(s.border_radius) || undefined,
        }}
      >
        {s.text || "Button"}
      </a>
    </div>
  );
}

function Divider({ s }: { s: Record<string, any> }) {
  return (
    <hr
      style={{
        borderTop: `${px(s.weight) || "1px"} ${s.style || "solid"} ${s.color || "currentColor"}`,
        opacity: 0.4,
        margin: 0,
      }}
    />
  );
}

function Spacer({ s }: { s: Record<string, any> }) {
  return <div aria-hidden style={{ height: px(s.space) || "20px" }} />;
}

function IconBox({ s }: { s: Record<string, any> }) {
  return (
    <div style={textAlign(s)} className="space-y-2">
      {s.icon?.value?.url && <img src={s.icon.value.url} alt="" className="w-10 h-10 inline-block" />}
      {s.title_text && <h3 className="font-display text-xl">{s.title_text}</h3>}
      {s.description_text && (
        <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.description_text) }} />
      )}
    </div>
  );
}

function ImageBox({ s }: { s: Record<string, any> }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start" style={textAlign(s)}>
      {s.image?.url && (
        <img src={s.image.url} alt={s.image.alt || s.title_text || ""} loading="lazy" className="rounded-lg max-w-full" style={{ width: px(s.image_size) || "120px" }} />
      )}
      <div className="space-y-1">
        {s.title_text && <h3 className="font-display text-xl">{s.title_text}</h3>}
        {s.description_text && (
          <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.description_text) }} />
        )}
      </div>
    </div>
  );
}

function IconList({ s }: { s: Record<string, any> }) {
  const items: any[] = s.icon_list || [];
  return (
    <ul className="space-y-2 list-none p-0">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-2">
          {it.selected_icon?.value?.url && <img src={it.selected_icon.value.url} alt="" className="w-5 h-5" />}
          <span>{it.link?.url ? <a className="hover:underline" href={it.link.url}>{it.text}</a> : it.text}</span>
        </li>
      ))}
    </ul>
  );
}

function VideoWidget({ s }: { s: Record<string, any> }) {
  const url: string = s.youtube_url || s.vimeo_url || s.hosted_url?.url || "";
  if (s.video_type === "hosted" && url) {
    return <video src={url} controls className="w-full rounded-lg" />;
  }
  // Try to convert YouTube URL to embed
  let embed = url;
  const yt = url.match(/youtu(?:be\.com\/watch\?v=|\.be\/)([\w-]+)/);
  if (yt) embed = `https://www.youtube.com/embed/${yt[1]}`;
  if (!embed) return null;
  return (
    <div className="relative aspect-video">
      <iframe src={embed} className="absolute inset-0 w-full h-full rounded-lg" allowFullScreen title={s.title || "video"} />
    </div>
  );
}

function HtmlWidget({ s }: { s: Record<string, any> }) {
  return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.html || "") }} />;
}

function Blockquote({ s }: { s: Record<string, any> }) {
  return (
    <blockquote className="border-l-4 pl-4 italic text-lg" style={{ borderColor: s.color || "hsl(var(--primary))" }}>
      <p dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.blockquote_content || "") }} />
      {s.author_name && <footer className="mt-2 text-sm not-italic text-muted-foreground">— {s.author_name}</footer>}
    </blockquote>
  );
}

function Testimonial({ s }: { s: Record<string, any> }) {
  return (
    <figure className="space-y-3 text-center">
      {s.testimonial_image?.url && (
        <img src={s.testimonial_image.url} alt={s.testimonial_name || ""} className="w-16 h-16 rounded-full mx-auto object-cover" />
      )}
      <blockquote className="italic" dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.testimonial_content || "") }} />
      {s.testimonial_name && <figcaption className="font-medium">{s.testimonial_name}</figcaption>}
      {s.testimonial_job && <p className="text-sm text-muted-foreground">{s.testimonial_job}</p>}
    </figure>
  );
}

function SocialIcons({ s }: { s: Record<string, any> }) {
  const list: any[] = s.social_icon_list || [];
  return (
    <div className="flex gap-2" style={textAlign(s)}>
      {list.map((it, i) => (
        <a key={i} href={it.link?.url || "#"} className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/80">
          {it.social_icon?.value?.url ? (
            <img src={it.social_icon.value.url} alt="" className="w-4 h-4" />
          ) : (
            <span className="text-xs">{it.social_icon?.value?.split?.("-")[1] || "•"}</span>
          )}
        </a>
      ))}
    </div>
  );
}

// -------- Container / column logic -----------------------------------------

function gridCols(width: any): string {
  // Elementor column._column_size is a percentage (e.g. 33.33)
  const n = parseFloat(width);
  if (!isFinite(n) || n <= 0) return "100%";
  return `${n}%`;
}

function Section({ node, path }: { node: ElNode; path: Path }) {
  const s = node.settings || {};
  const style = containerStyle(s);
  const inner = (
    <div
      className="mx-auto w-full"
      style={{
        maxWidth: s.content_width?.size ? `${s.content_width.size}${s.content_width.unit || "px"}` : "1200px",
      }}
    >
      <div className="flex flex-wrap gap-6">
        {(node.elements || []).map((child) => (
          <ElementorNode key={child.id} node={child} path={path} />
        ))}
      </div>
    </div>
  );
  return (
    <section style={style} className="relative w-full px-4 py-10 md:py-16">
      {inner}
    </section>
  );
}

function Column({ node, path }: { node: ElNode; path: Path }) {
  const s = node.settings || {};
  const width = gridCols(s._column_size ?? s._inline_size ?? 100);
  return (
    <div
      className="space-y-4 min-w-0 basis-full md:basis-[calc(var(--w)-1.5rem)]"
      style={{ ["--w" as any]: width, ...containerStyle(s) }}
    >
      {(node.elements || []).map((child) => (
        <ElementorNode key={child.id} node={child} path={path} />
      ))}
    </div>
  );
}

function Container({ node, path }: { node: ElNode; path: Path }) {
  const s = node.settings || {};
  const direction = s.flex_direction || "column";
  const style: CSSProperties = {
    ...containerStyle(s),
    display: "flex",
    flexDirection: direction.includes("row") ? "row" : "column",
    flexWrap: "wrap",
    gap: px(s.flex_gap?.size != null ? `${s.flex_gap.size}${s.flex_gap.unit || "px"}` : "1.5rem") || "1.5rem",
    justifyContent: s.flex_justify_content || undefined,
    alignItems: s.flex_align_items || undefined,
  };
  return (
    <div style={style} className="w-full">
      {(node.elements || []).map((child) => (
        <ElementorNode key={child.id} node={child} path={path} />
      ))}
    </div>
  );
}

// -------- Dispatch ---------------------------------------------------------

function Widget({ node }: { node: ElNode }) {
  const s = node.settings || {};
  switch (node.widgetType) {
    case "heading": return <Heading s={s} />;
    case "text-editor": return <TextEditor s={s} />;
    case "image": return <Image s={s} />;
    case "button": return <ButtonWidget s={s} />;
    case "divider": return <Divider s={s} />;
    case "spacer": return <Spacer s={s} />;
    case "icon-box": return <IconBox s={s} />;
    case "image-box": return <ImageBox s={s} />;
    case "icon-list": return <IconList s={s} />;
    case "video": return <VideoWidget s={s} />;
    case "html": return <HtmlWidget s={s} />;
    case "shortcode": return null;
    case "blockquote": return <Blockquote s={s} />;
    case "testimonial": return <Testimonial s={s} />;
    case "social-icons": return <SocialIcons s={s} />;
    default:
      if (node.elements?.length) {
        return (
          <div className="space-y-4">
            {node.elements.map((c) => <ElementorNode key={c.id} node={c} path={[]} />)}
          </div>
        );
      }
      return null;
  }
}

/**
 * EditableShell: when an EditorContext is active, wraps a node with
 * hover/select affordances. When no editor context exists, renders children
 * untouched so the public site is unaffected.
 */
function EditableShell({
  node,
  path,
  kind,
  children,
}: {
  node: ElNode;
  path: Path;
  kind: "section" | "column" | "container" | "widget";
  children: ReactNode;
}) {
  const ed = useEditor();
  if (!ed) return <>{children}</>;
  const id = node.id || "";
  const fullPath = [...path, id];
  const isSelected =
    !!ed.selected && ed.selected.length === fullPath.length && ed.selected.every((p, i) => p === fullPath[i]);
  const isHovered =
    !!ed.hovered && ed.hovered.length === fullPath.length && ed.hovered.every((p, i) => p === fullPath[i]);

  const ring =
    isSelected
      ? "outline outline-2 outline-blue-500 outline-offset-[-2px]"
      : isHovered
        ? "outline outline-2 outline-blue-300/70 outline-offset-[-2px]"
        : "";

  return (
    <div
      data-edit-path={fullPath.join("/")}
      className={`relative ${ring}`}
      onMouseEnter={(e) => { e.stopPropagation(); ed.setHover(fullPath); }}
      onMouseLeave={(e) => { e.stopPropagation(); ed.setHover(null); }}
      onClick={(e) => { e.stopPropagation(); ed.select(fullPath); }}
    >
      {isSelected && (
        <>
          <span className="absolute -top-6 left-0 z-30 text-[10px] uppercase tracking-wide bg-blue-500 text-white px-1.5 py-0.5 rounded-sm pointer-events-none">
            {kind === "widget" ? (node.widgetType || "widget") : kind}
          </span>
          <NodeToolbar path={fullPath} />
        </>
      )}
      {children}
    </div>
  );
}

function ElementorNode({ node, path = [] }: { node: ElNode; path?: Path }) {
  if (!node) return null;
  const id = node.id || "";
  const childPath = [...path, id];

  if (node.elType === "section") {
    return (
      <EditableShell node={node} path={path} kind="section">
        <Section node={node} path={childPath} />
      </EditableShell>
    );
  }
  if (node.elType === "column") {
    return (
      <EditableShell node={node} path={path} kind="column">
        <Column node={node} path={childPath} />
      </EditableShell>
    );
  }
  if (node.elType === "container") {
    return (
      <EditableShell node={node} path={path} kind="container">
        <Container node={node} path={childPath} />
      </EditableShell>
    );
  }
  if (node.elType === "widget") {
    return (
      <EditableShell node={node} path={path} kind="widget">
        <Widget node={node} />
      </EditableShell>
    );
  }
  if (node.elements?.length) {
    return (
      <>
        {node.elements.map((c) => <ElementorNode key={c.id} node={c} path={childPath} />)}
      </>
    );
  }
  return null;
}

export default function ElementorRenderer({ data }: { data: unknown }) {
  const tree = useMemo(() => (Array.isArray(data) ? (data as ElNode[]) : []), [data]);
  if (!tree.length) return null;
  return (
    <div className="elementor-rendered">
      {tree.map((n, i) => (
        <ElementorNode key={n.id || i} node={n} path={[]} />
      ))}
    </div>
  );
}
