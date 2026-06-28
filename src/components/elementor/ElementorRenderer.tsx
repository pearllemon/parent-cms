// Minimal-but-faithful Elementor renderer.
// Walks the Elementor element tree (sections → columns → widgets) and emits
// React. Covers the most common widget types from the imported Elementor kit:
// section, container, column, heading, text-editor, image, button, divider,
// spacer, icon, icon-box, icon-list, image-box, video, html, shortcode (pass-
// through), blockquote, testimonial, social-icons, toggle/tabs (best effort).
// Unknown widgets render their children so layout is preserved.

import { CSSProperties, ReactNode, useMemo, useState, useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ArrowRight, MapPin, Phone, Mail, Clock, Calendar } from "lucide-react";
import { useEditor, type Path } from "@/components/editor/EditorContext";
import NodeToolbar from "@/components/editor/NodeToolbar";
import FormRenderer from "@/components/site/FormRenderer";
import { supabase } from "@/integrations/supabase/client";

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
  if (s.top != null && s.top !== "") out[`${prefix}Top`] = `${s.top}${unit}`;
  if (s.right != null && s.right !== "") out[`${prefix}Right`] = `${s.right}${unit}`;
  if (s.bottom != null && s.bottom !== "") out[`${prefix}Bottom`] = `${s.bottom}${unit}`;
  if (s.left != null && s.left !== "") out[`${prefix}Left`] = `${s.left}${unit}`;
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

// ----- Advanced Styling Helpers ------------------------------------------

const getResponsiveClasses = (s: Record<string, any>): string => {
  const classes = [];
  const hideDesktop = s.hide_desktop === "yes" || s._hide_desktop === "yes";
  const hideTablet = s.hide_tablet === "yes" || s._hide_tablet === "yes";
  const hideMobile = s.hide_mobile === "yes" || s._hide_mobile === "yes";

  if (hideDesktop && hideTablet && hideMobile) {
    classes.push("hidden");
  } else if (hideDesktop && hideTablet) {
    classes.push("md:hidden"); // Hide on tablet and desktop, show on mobile
  } else if (hideTablet && hideMobile) {
    classes.push("hidden lg:block"); // Hide on mobile and tablet, show on desktop
  } else if (hideDesktop && hideMobile) {
    classes.push("hidden md:block lg:hidden"); // Hide on mobile and desktop, show on tablet
  } else if (hideDesktop) {
    classes.push("lg:hidden");
  } else if (hideTablet) {
    classes.push("md:max-lg:hidden");
  } else if (hideMobile) {
    classes.push("max-md:hidden");
  }
  return classes.join(" ");
};

const getAdvancedStyles = (s: Record<string, any>): CSSProperties => {
  const style: CSSProperties = {};

  // Margins (supports nested objects and flat schema)
  const margin = s.margin;
  if (margin) {
    const unit = margin.unit || "px";
    if (margin.top != null && margin.top !== "") style.marginTop = `${margin.top}${unit}`;
    if (margin.right != null && margin.right !== "") style.marginRight = `${margin.right}${unit}`;
    if (margin.bottom != null && margin.bottom !== "") style.marginBottom = `${margin.bottom}${unit}`;
    if (margin.left != null && margin.left !== "") style.marginLeft = `${margin.left}${unit}`;
  } else {
    const unit = s.margin_unit || "px";
    if (s.margin_top != null && s.margin_top !== "") style.marginTop = `${s.margin_top}${unit}`;
    if (s.margin_right != null && s.margin_right !== "") style.marginRight = `${s.margin_right}${unit}`;
    if (s.margin_bottom != null && s.margin_bottom !== "") style.marginBottom = `${s.margin_bottom}${unit}`;
    if (s.margin_left != null && s.margin_left !== "") style.marginLeft = `${s.margin_left}${unit}`;
  }

  // Padding (supports nested objects and flat schema)
  const padding = s.padding;
  if (padding) {
    const unit = padding.unit || "px";
    if (padding.top != null && padding.top !== "") style.paddingTop = `${padding.top}${unit}`;
    if (padding.right != null && padding.right !== "") style.paddingRight = `${padding.right}${unit}`;
    if (padding.bottom != null && padding.bottom !== "") style.paddingBottom = `${padding.bottom}${unit}`;
    if (padding.left != null && padding.left !== "") style.paddingLeft = `${padding.left}${unit}`;
  } else {
    const unit = s.padding_unit || "px";
    if (s.padding_top != null && s.padding_top !== "") style.paddingTop = `${s.padding_top}${unit}`;
    if (s.padding_right != null && s.padding_right !== "") style.paddingRight = `${s.padding_right}${unit}`;
    if (s.padding_bottom != null && s.padding_bottom !== "") style.paddingBottom = `${s.padding_bottom}${unit}`;
    if (s.padding_left != null && s.padding_left !== "") style.paddingLeft = `${s.padding_left}${unit}`;
  }

  // Z-Index
  const zIndex = s.z_index ?? s._z_index ?? s.zindex;
  if (zIndex != null && zIndex !== "") {
    style.zIndex = Number(zIndex);
  }

  // Animation Delay
  const delay = s.animation_delay || s._animation_delay;
  if (delay) {
    style.animationDelay = `${delay}ms`;
  }

  return style;
};

const getAnimationClass = (s: Record<string, any>): string => {
  const anim = s.animation || s._animation;
  if (!anim) return "";
  const mapping: Record<string, string> = {
    fadeIn: "animate-in fade-in duration-700",
    fadeInDown: "animate-in fade-in slide-in-from-top-4 duration-700",
    fadeInUp: "animate-in fade-in slide-in-from-bottom-4 duration-700",
    fadeInLeft: "animate-in fade-in slide-in-from-left-4 duration-700",
    fadeInRight: "animate-in fade-in slide-in-from-right-4 duration-700",
    bounceIn: "animate-in zoom-in-95 duration-500 ease-out",
    zoomIn: "animate-in zoom-in-90 duration-500",
  };
  return mapping[anim] || `animate-${anim}`;
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
      className="prose prose-neutral max-w-none prose-img:rounded-lg text-foreground"
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
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition hover:opacity-90 shadow-sm"
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
        borderTop: `${px(s.weight) || "2px"} ${s.style || "solid"} ${s.color || "currentColor"}`,
        opacity: 0.4,
        margin: 0,
      }}
    />
  );
}

function Spacer({ s }: { s: Record<string, any> }) {
  return <div aria-hidden style={{ height: px(s.space) || "30px" }} />;
}

function IconBox({ s }: { s: Record<string, any> }) {
  return (
    <div style={textAlign(s)} className="space-y-2">
      {s.icon?.value?.url && <img src={s.icon.value.url} alt="" className="w-10 h-10 inline-block" />}
      {s.title_text && <h3 className="font-display text-xl font-medium">{s.title_text}</h3>}
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
        {s.title_text && <h3 className="font-display text-xl font-medium">{s.title_text}</h3>}
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
  let embed = url;
  const yt = url.match(/youtu(?:be\.com\/watch\?v=|\.be\/)([\w-]+)/);
  if (yt) embed = `https://www.youtube.com/embed/${yt[1]}`;
  if (!embed) return null;
  return (
    <div className="relative aspect-video">
      <iframe src={embed} className="absolute inset-0 w-full h-full rounded-lg border-0" allowFullScreen title={s.title || "video"} />
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
    <figure className="space-y-3 text-center p-6 border rounded-lg bg-card/50">
      {s.testimonial_image?.url && (
        <img src={s.testimonial_image.url} alt={s.testimonial_name || ""} className="w-16 h-16 rounded-full mx-auto object-cover border" />
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
        <a key={i} href={it.link?.url || "#"} className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/80 transition shadow-sm">
          {it.social_icon?.value?.url ? (
            <img src={it.social_icon.value.url} alt="" className="w-4 h-4" />
          ) : (
            <span className="text-xs uppercase font-semibold">{it.social_icon?.value?.split?.("-")[1] || "•"}</span>
          )}
        </a>
      ))}
    </div>
  );
}

function AccordionWidget({ s }: { s: Record<string, any> }) {
  const items = s.items || [];
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (!items.length) return <p className="text-xs text-muted-foreground italic">No accordion items.</p>;

  return (
    <div className="space-y-3.5 w-full my-6 font-body">
      {items.map((item: any, idx: number) => {
        const isOpen = openIdx === idx;
        return (
          <div
            key={idx}
            className="border rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-300"
            style={{
              borderColor: isOpen ? "hsl(var(--primary))" : "rgb(226, 232, 240)",
              borderWidth: isOpen ? "2px" : "1px",
            }}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="w-full px-6 py-4.5 flex justify-between items-center text-left font-bold text-slate-800 hover:bg-slate-50/60 transition-colors gap-4"
            >
              <span className="text-base font-extrabold tracking-tight text-slate-900">{item.title || `Item ${idx + 1}`}</span>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transform transition-all duration-300 ${isOpen ? "rotate-180" : ""}`}
                style={{
                  backgroundColor: isOpen ? "hsl(var(--primary))" : "rgb(241, 245, 249)",
                  color: isOpen ? "hsl(var(--primary-foreground))" : "rgb(100, 116, 139)",
                }}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </span>
            </button>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isOpen ? "max-h-[800px] opacity-100 border-t border-slate-100 bg-slate-50/15" : "max-h-0 opacity-0"
              }`}
            >
              <div
                className="px-6 py-5 text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content || "") }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CarouselWidget({ s }: { s: Record<string, any> }) {
  const slides = s.slides || [];
  const [activeIdx, setActiveIdx] = useState(0);

  if (!slides.length) return <p className="text-xs text-muted-foreground italic">No slides.</p>;

  const next = () => setActiveIdx((prev) => (prev + 1) % slides.length);
  const prev = () => setActiveIdx((prev) => (prev - 1 + slides.length) % slides.length);

  const activeSlide = slides[activeIdx];

  return (
    <div className="w-full my-8 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-md flex flex-col md:flex-row relative group min-h-[360px]">
      {/* Slide Image */}
      {activeSlide.image && (
        <div className="w-full md:w-1/2 aspect-video md:aspect-auto md:min-h-[380px] relative overflow-hidden bg-slate-50 shrink-0">
          <img
            src={activeSlide.image}
            alt={activeSlide.heading || ""}
            className="w-full h-full object-cover transition-transform duration-500 scale-100 group-hover:scale-[1.02]"
          />
        </div>
      )}

      {/* Slide Content */}
      <div className="p-8 md:p-12 flex flex-col justify-between flex-grow space-y-6">
        <div className="space-y-4">
          <div className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "hsl(var(--accent))" }}>
            Case Study / Feature
          </div>
          <h3 className="text-2xl md:text-3xl font-black font-display text-slate-900 leading-tight">
            {activeSlide.heading || "Slide Heading"}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {activeSlide.description || "Slide description goes here."}
          </p>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          {activeSlide.button_text && activeSlide.button_url ? (
            <a
              href={activeSlide.button_url}
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all hover:gap-2.5"
              style={{ color: "hsl(var(--primary))" }}
            >
              {activeSlide.button_text} <ArrowRight className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
            </a>
          ) : <div />}

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={prev}
              className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-slate-600 hover:text-slate-900"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Indicators */}
        <div className="flex gap-1.5 justify-center md:justify-start">
          {slides.map((_: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIdx ? "w-6" : "w-1.5"}`}
              style={{
                backgroundColor: idx === activeIdx ? "hsl(var(--primary))" : "rgb(226, 232, 240)"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactSectionWidget({ s }: { s: Record<string, any> }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start my-8 font-sans w-full">
      {/* Left Column: Info */}
      <div className="lg:col-span-5 space-y-6 text-left">
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {s.title || "Get in Touch"}
          </h2>
          {s.subtitle && (
            <p className="text-slate-500 text-sm leading-relaxed">
              {s.subtitle}
            </p>
          )}
        </div>

        <div className="space-y-4 pt-4">
          {s.address && (
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                <MapPin className="w-5 h-5 text-primary" style={{ color: "var(--theme-primary, #FA8739)" }} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Our Address</h4>
                <p className="text-sm text-slate-700 mt-0.5">{s.address}</p>
              </div>
            </div>
          )}

          {s.phone && (
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                <Phone className="w-5 h-5 text-primary" style={{ color: "var(--theme-primary, #FA8739)" }} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Phone Number</h4>
                <p className="text-sm text-slate-700 mt-0.5">
                  <a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a>
                </p>
              </div>
            </div>
          )}

          {s.email && (
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                <Mail className="w-5 h-5 text-primary" style={{ color: "var(--theme-primary, #FA8739)" }} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Email Us</h4>
                <p className="text-sm text-slate-700 mt-0.5">
                  <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a>
                </p>
              </div>
            </div>
          )}

          {s.hours && (
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                <Clock className="w-5 h-5 text-primary" style={{ color: "var(--theme-primary, #FA8739)" }} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Working Hours</h4>
                <p className="text-sm text-slate-700 mt-0.5">{s.hours}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Form Card */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <FormRenderer slug={s.formSlug || "contact"} id={s.formId} />
      </div>
    </div>
  );
}

function BlogSectionWidget({ s }: { s: Record<string, any> }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = Number(s.limit) || 3;

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
    <div className="w-full my-8 font-sans space-y-8 text-left">
      {(s.title || s.subtitle) && (
        <div className="text-center space-y-2">
          {s.title && <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{s.title}</h2>}
          {s.subtitle && <p className="text-slate-500 text-sm max-w-xl mx-auto leading-relaxed">{s.subtitle}</p>}
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
                <div className="space-y-2.5 text-left">
                  {dateStr && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{dateStr}</span>
                    </div>
                  )}
                  <h3 className="font-extrabold text-lg text-slate-900 leading-snug hover:text-primary transition-colors line-clamp-2">
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

// -------- Container / column logic -----------------------------------------

function gridCols(width: any): string {
  const n = parseFloat(width);
  if (!isFinite(n) || n <= 0) return "100%";
  return `${n}%`;
}

function Section({ node, path }: { node: ElNode; path: Path }) {
  const s = node.settings || {};
  const style = {
    ...containerStyle(s),
    ...getAdvancedStyles(s)
  };
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
    <section
      id={s.css_id || s._css_id || undefined}
      style={style}
      className={`relative w-full px-4 py-10 md:py-16 ${getResponsiveClasses(s)} ${getAnimationClass(s)} ${s.css_classes || s._css_classes || ""}`}
    >
      {inner}
    </section>
  );
}

function Column({ node, path }: { node: ElNode; path: Path }) {
  const s = node.settings || {};
  const width = gridCols(s._column_size ?? s._inline_size ?? 100);
  const style = {
    ["--w" as any]: width,
    ...containerStyle(s),
    ...getAdvancedStyles(s)
  };
  return (
    <div
      id={s.css_id || s._css_id || undefined}
      className={`space-y-4 min-w-0 basis-full md:basis-[calc(var(--w)-1.5rem)] ${getResponsiveClasses(s)} ${getAnimationClass(s)} ${s.css_classes || s._css_classes || ""}`}
      style={style}
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
    ...getAdvancedStyles(s),
    display: "flex",
    flexDirection: direction.includes("row") ? "row" : "column",
    flexWrap: "wrap",
    gap: px(s.flex_gap?.size != null ? `${s.flex_gap.size}${s.flex_gap.unit || "px"}` : "1.5rem") || "1.5rem",
    justifyContent: s.flex_justify_content || undefined,
    alignItems: s.flex_align_items || undefined,
  };
  return (
    <div
      id={s.css_id || s._css_id || undefined}
      style={style}
      className={`w-full ${getResponsiveClasses(s)} ${getAnimationClass(s)} ${s.css_classes || s._css_classes || ""}`}
    >
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
    case "accordion": return <AccordionWidget s={s} />;
    case "carousel": return <CarouselWidget s={s} />;
    case "contact-section": return <ContactSectionWidget s={s} />;
    case "blog-section": return <BlogSectionWidget s={s} />;
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
    const s = node.settings || {};
    return (
      <EditableShell node={node} path={path} kind="widget">
        <div
          id={s.css_id || s._css_id || undefined}
          className={`w-full ${getResponsiveClasses(s)} ${getAnimationClass(s)} ${s.css_classes || s._css_classes || ""}`}
          style={getAdvancedStyles(s)}
        >
          <Widget node={node} />
        </div>
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
