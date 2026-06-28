// Public renderer for Theme Designer JSON block trees.
// Mirrors the block schema used by VisualCanvas.tsx.

import React, { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { MapPin, Phone, Mail, Clock, ChevronDown, Calendar, ArrowRight } from "lucide-react";
import FormRenderer from "./FormRenderer";
import { supabase } from "@/integrations/supabase/client";

type Block = {
  id: string;
  type: "section" | "container" | "heading" | "text" | "image" | "button" | "html" | "form" | "accordion" | "contact-section" | "blog-section";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
  children?: Block[];
};

// --- Premium Accordion Widget ---
function AccordionWidget({ items = [] }: { items: { title: string; content: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (!items || items.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-4">No FAQ items available.</p>;
  }

  return (
    <div className="space-y-4 w-full my-6 font-sans">
      {items.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div
            key={idx}
            className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-300 hover:shadow-md"
            style={{
              borderColor: isOpen ? "var(--theme-primary, #FA8739)" : "#e2e8f0",
              borderWidth: isOpen ? "2px" : "1px",
            }}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="w-full px-6 py-4.5 flex justify-between items-center text-left font-bold text-slate-800 hover:bg-slate-50/50 transition-colors gap-4"
            >
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                {item.title}
              </span>
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transform transition-all duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
                style={{
                  backgroundColor: isOpen ? "var(--theme-primary, #FA8739)" : "#f1f5f9",
                  color: isOpen ? "#ffffff" : "#64748b",
                }}
              >
                <ChevronDown className="w-4 h-4" />
              </span>
            </button>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isOpen ? "max-h-[1000px] opacity-100 border-t border-slate-100 bg-slate-50/10" : "max-h-0 opacity-0"
              }`}
            >
              <div
                className="px-6 py-5 text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content || "") }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Premium Contact Section Widget ---
function ContactSectionWidget({ p }: { p: Record<string, any> }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start my-8 font-sans w-full">
      {/* Left Column: Info */}
      <div className="lg:col-span-5 space-y-6">
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {p.title || "Get in Touch"}
          </h2>
          {p.subtitle && (
            <p className="text-slate-500 text-sm leading-relaxed">
              {p.subtitle}
            </p>
          )}
        </div>

        <div className="space-y-4 pt-4">
          {p.address && (
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                <MapPin className="w-5 h-5" style={{ color: "var(--theme-primary, #FA8739)" }} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Our Address</h4>
                <p className="text-sm text-slate-700 mt-0.5">{p.address}</p>
              </div>
            </div>
          )}

          {p.phone && (
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                <Phone className="w-5 h-5" style={{ color: "var(--theme-primary, #FA8739)" }} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Phone Number</h4>
                <p className="text-sm text-slate-700 mt-0.5">
                  <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a>
                </p>
              </div>
            </div>
          )}

          {p.email && (
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                <Mail className="w-5 h-5" style={{ color: "var(--theme-primary, #FA8739)" }} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Email Us</h4>
                <p className="text-sm text-slate-700 mt-0.5">
                  <a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a>
                </p>
              </div>
            </div>
          )}

          {p.hours && (
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                <Clock className="w-5 h-5" style={{ color: "var(--theme-primary, #FA8739)" }} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Working Hours</h4>
                <p className="text-sm text-slate-700 mt-0.5">{p.hours}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Form Card */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <FormRenderer slug={p.formSlug || "contact"} id={p.formId} />
      </div>
    </div>
  );
}

// --- Premium Dynamic Blog Section Widget ---
function BlogSectionWidget({ p }: { p: Record<string, any> }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = Number(p.limit) || 3;

  useEffect(() => {
    let active = true;
    async function fetchPosts() {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id,title,slug,type,excerpt,featured_image_url,publish_date")
          .eq("type", "post")
          .eq("status", "published")
          .order("publish_date", { ascending: false })
          .limit(limit);

        if (error) throw error;
        if (active) setPosts(data || []);
      } catch (err) {
        console.error("Error fetching blog posts in widget:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchPosts();
    return () => { active = false; };
  }, [limit]);

  if (loading) {
    return (
      <div className="w-full py-12 text-center font-sans">
        <div className="inline-block w-6 h-6 border-2 border-t-transparent border-slate-400 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 mt-2">Loading latest articles…</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="w-full py-8 text-center border border-dashed rounded-2xl bg-slate-50/50 my-6 font-sans">
        <p className="text-sm text-slate-500">No blog posts found. Publish some articles to show them here!</p>
      </div>
    );
  }

  return (
    <div className="w-full my-8 font-sans space-y-8">
      {(p.title || p.subtitle) && (
        <div className="text-center space-y-2">
          {p.title && <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{p.title}</h2>}
          {p.subtitle && <p className="text-slate-500 text-sm max-w-xl mx-auto leading-relaxed">{p.subtitle}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {posts.map((post) => {
          const dateStr = post.publish_date
            ? new Date(post.publish_date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : null;

          const link = `/blog/${post.slug}`;

          return (
            <article
              key={post.id}
              className="group bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full"
            >
              {/* Featured Image */}
              <a href={link} className="block aspect-video w-full overflow-hidden bg-slate-100 relative shrink-0">
                <img
                  src={post.featured_image_url || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80"}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </a>

              {/* Content Body */}
              <div className="p-6 flex flex-col justify-between flex-grow space-y-4">
                <div className="space-y-2.5">
                  {dateStr && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{dateStr}</span>
                    </div>
                  )}
                  <h3 className="font-extrabold text-lg text-slate-900 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    <a href={link} style={{ color: "inherit" }}>{post.title}</a>
                  </h3>
                  {post.excerpt && (
                    <p className="text-slate-500 text-xs leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <a
                    href={link}
                    className="inline-flex items-center gap-1 text-xs font-bold transition-all hover:gap-2"
                    style={{ color: "var(--theme-primary, #FA8739)" }}
                  >
                    Read Article
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Block Renderer ---
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
    case "accordion":
      return <AccordionWidget key={b.id} items={p.items} />;
    case "contact-section":
      return <ContactSectionWidget key={b.id} p={p} />;
    case "blog-section":
      return <BlogSectionWidget key={b.id} p={p} />;
    default:
      return null;
  }
}

export default function ThemeBlocksRenderer({ blocks }: { blocks: unknown }) {
  const arr = Array.isArray(blocks) ? (blocks as Block[]) : [];
  if (arr.length === 0) return null;
  return <>{arr.map(renderBlock)}</>;
}
