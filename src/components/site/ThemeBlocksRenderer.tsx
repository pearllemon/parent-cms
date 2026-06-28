// Public renderer for Theme Designer JSON block trees.
// Mirrors the block schema used by VisualCanvas.tsx.

import React from "react";
import DOMPurify from "dompurify";
import FormRenderer from "./FormRenderer";

type Block = {
  id: string;
  type: "section" | "container" | "heading" | "text" | "image" | "button" | "html" | "form";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
  children?: Block[];
};

function renderBlock(b: Block): React.ReactNode {
  const p = b.props || {};
  switch (b.type) {
    case "section":
      return (
        <section
          key={b.id}
          style={{ padding: p.padding, background: p.background, color: p.color }}
        >
          {(b.children || []).map(renderBlock)}
        </section>
      );
    case "container":
      return (
        <div
          key={b.id}
          style={{
            maxWidth: p.maxWidth,
            padding: p.padding,
            margin: "0 auto",
            display: p.display || "flex",
            flexDirection: (p.direction || "column") as React.CSSProperties["flexDirection"],
            gap: p.gap,
            alignItems: p.align,
            justifyContent: p.justify,
          }}
        >
          {(b.children || []).map(renderBlock)}
        </div>
      );
    case "heading": {
      const Tag = (`h${Math.min(6, Math.max(1, Number(p.level) || 2))}`) as keyof JSX.IntrinsicElements;
      return (
        <Tag
          key={b.id}
          style={{
            fontSize: p.fontSize, color: p.color, textAlign: p.align,
            fontWeight: p.fontWeight, lineHeight: p.lineHeight,
            margin: p.margin,
          }}
        >
          {p.text}
        </Tag>
      );
    }
    case "text":
      return (
        <p
          key={b.id}
          style={{
            fontSize: p.fontSize, color: p.color, textAlign: p.align,
            lineHeight: p.lineHeight, margin: p.margin,
          }}
        >
          {p.text}
        </p>
      );
    case "image":
      return p.src ? (
        <img
          key={b.id}
          src={p.src}
          alt={p.alt || ""}
          title={p.title}
          loading="lazy"
          style={{
            width: p.width, height: p.height,
            objectFit: p.fit as React.CSSProperties["objectFit"],
            borderRadius: p.radius,
          }}
        />
      ) : null;
    case "button":
      return (
        <a
          key={b.id}
          href={p.href || "#"}
          style={{
            display: "inline-block",
            background: p.bg, color: p.color,
            borderRadius: p.radius, padding: p.padding,
            textDecoration: "none", fontWeight: 600,
          }}
        >
          {p.text}
        </a>
      );
    case "html":
      return (
        <div
          key={b.id}
          style={{ padding: p.padding, margin: p.margin }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(p.code || "", { USE_PROFILES: { html: true } }) }}
        />
      );
    case "form":
      return (
        <div key={b.id} className="w-full my-4">
          <FormRenderer slug={p.formSlug} id={p.formId} />
        </div>
      );
    default:
      return null;
  }
}

export default function ThemeBlocksRenderer({ blocks }: { blocks: unknown }) {
  const arr = Array.isArray(blocks) ? (blocks as Block[]) : [];
  if (arr.length === 0) return null;
  return <>{arr.map(renderBlock)}</>;
}
