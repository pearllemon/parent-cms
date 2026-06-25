// Advanced Website Export ZIP & MD Importer.
// Extracts ZIPs containing page/ and post/ markdown files, uploads images,
// extracts logos, prompts for branding, and generates premium visual page layouts.

import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { saveTokens } from "./themeStore";

export type ZipImportResult = {
  pages: number;
  posts: number;
  images: number;
  logo: string | null;
  failed: number;
  errors: string[];
};

type ParsedPage = {
  title: string;
  slug: string;
  type: "page" | "post";
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  logoUrl: string | null;
  sections: { title: string; content: string }[];
  featuredImage: string | null;
};

// -------- Helpers for sanitizing and parsing -------------------------------

const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function parseMarkdownPage(filename: string, md: string, type: "page" | "post"): ParsedPage {
  const result: ParsedPage = {
    title: filename.replace(/\.md$/, ""),
    slug: slugify(filename.replace(/\.md$/, "")),
    type,
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    logoUrl: null,
    sections: [],
    featuredImage: null,
  };

  if (result.slug === "home") result.slug = ""; // Root path for homepage

  // 1. Parse Meta Tags Table
  const metaTitleMatch = md.match(/\|\s*\*\*Meta Title\*\*\s*\|\s*([^|]+)\|/i);
  if (metaTitleMatch) result.metaTitle = metaTitleMatch[1].trim();

  const metaDescMatch = md.match(/\|\s*\*\*Meta Description\*\*\s*\|\s*([^|]+)\|/i);
  if (metaDescMatch) result.metaDescription = metaDescMatch[1].trim();

  const canonicalMatch = md.match(/\|\s*\*\*Canonical URL\*\*\s*\|\s*([^|]+)\|/i);
  if (canonicalMatch) result.canonicalUrl = canonicalMatch[1].trim();

  // 2. Extract Logo from JSON-LD Schema
  const jsonBlocks = md.match(/```json([\s\S]*?)```/g) || [];
  for (const block of jsonBlocks) {
    try {
      const cleanJson = block.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.logo?.url) {
        result.logoUrl = parsed.logo.url;
      } else if (parsed.publisher?.logo?.url) {
        result.logoUrl = parsed.publisher.logo.url;
      } else if (parsed.image?.url && /logo/i.test(parsed.image.caption || "")) {
        result.logoUrl = parsed.image.url;
      }
      
      // Extract featured image from schema as fallback
      if (parsed.image?.url && !result.featuredImage) {
        result.featuredImage = parsed.image.url;
      }
    } catch { /* ignore */ }
  }

  // 3. Parse Sections by spliting after '# PAGE CONTENT'
  const contentMarker = md.indexOf("# ─────────────────────────────────────────────\n# PAGE CONTENT");
  const contentMarkerAlt = md.indexOf("# PAGE CONTENT");
  const markerIndex = contentMarker !== -1 ? contentMarker : contentMarkerAlt;
  
  // Slice body text
  let bodyText = md;
  if (markerIndex !== -1) {
    const rest = md.slice(markerIndex);
    const contentHeaderEnd = rest.indexOf("\n", rest.indexOf("PAGE CONTENT") + 12);
    bodyText = rest.slice(contentHeaderEnd === -1 ? 0 : contentHeaderEnd).trim();
  }

  // Split content by sections denoted by bullet checklist "- ✅" or h2 "## "
  const rawSections = bodyText.split(/(?:-\s*✅\s*|##\s*\[?✅\]?\s*)/i);
  
  // The first section before any checklist tag is the Hero intro
  const intro = rawSections[0].trim();
  if (intro) {
    // Extract first title header # or ## as page title
    const firstTitleMatch = intro.match(/^[#\s]+([^\n]+)/);
    if (firstTitleMatch) result.title = firstTitleMatch[1].trim();
    result.sections.push({
      title: "Hero",
      content: intro,
    });
  }

  for (let i = 1; i < rawSections.length; i++) {
    const block = rawSections[i];
    const lines = block.split("\n");
    const title = lines[0].trim();
    const content = lines.slice(1).join("\n").trim();
    if (title) {
      result.sections.push({ title, content });
    }
  }

  // Find first image in body as featured image if none was found in schema
  if (!result.featuredImage) {
    const imgMatch = md.match(/!\[[^\]]*\]\(([^)]+)\)/i);
    if (imgMatch) result.featuredImage = imgMatch[1];
  }

  return result;
}

// -------- Premium Layout Trees Generator (Elementor-compatible) ------------

function resolveImageUrl(url: string | null | undefined, imageMap: Map<string, string>): string {
  if (!url) return "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80";
  // Check key mapping (either exact, slug, or filename)
  for (const [orig, mapped] of imageMap.entries()) {
    if (url.includes(orig) || orig.includes(url) || url.split("/").pop() === orig.split("/").pop()) {
      return mapped;
    }
  }
  return url;
}

function generateVisualTree(
  page: ParsedPage,
  branding: { primary: string; accent: string; font: string },
  imageMap: Map<string, string>
): any[] {
  
  // Resolve image URLs with our uploaded mapped URLs
  const resolveImage = (url: string | null | undefined): string => resolveImageUrl(url, imageMap);

  // Helper to extract texts, bullet points, and headers from parsed section body
  const extractSectionData = (content: string) => {
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
    const headers: string[] = [];
    const paragraphs: string[] = [];
    const bullets: string[] = [];
    const images: string[] = [];
    let buttonText = "";
    let buttonUrl = "";

    lines.forEach((l) => {
      if (l.startsWith("##") || l.startsWith("###") || l.startsWith("#")) {
        headers.push(l.replace(/^[#\s]+/, ""));
      } else if (l.startsWith("- ") || l.startsWith("* ") || l.startsWith("✅")) {
        bullets.push(l.replace(/^[-*✅\s]+/, ""));
      } else if (l.startsWith("> [") || l.startsWith("[")) {
        const btnMatch = l.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (btnMatch) {
          buttonText = btnMatch[1].replace(/^[📞💬💡\s]+/, "");
          buttonUrl = btnMatch[2];
        }
      } else {
        // Check image
        const imgMatch = l.match(/!\[[^\]]*\]\(([^)]+)\)/);
        if (imgMatch) {
          images.push(imgMatch[1]);
        } else if (!l.startsWith("|") && !l.startsWith("---")) {
          paragraphs.push(l);
        }
      }
    });

    return { headers, paragraphs, bullets, images, buttonText, buttonUrl };
  };

  const tree: any[] = [];
  const pCol = branding.primary;
  const aCol = branding.accent;
  const font = branding.font;

  // Walk through each section and generate custom premium layouts
  page.sections.forEach((sec, idx) => {
    const { headers, paragraphs, bullets, images, buttonText, buttonUrl } = extractSectionData(sec.content);
    const sectionId = Math.random().toString(36).slice(2, 9);

    // Hero Section
    if (sec.title === "Hero" || idx === 0) {
      const heroHeadline = headers[0] || page.title;
      const heroSub = paragraphs.join(" ") || "Expert services tailored to boost your online visibility and drive real results.";
      const heroImage = resolveImage(page.featuredImage || images[0]);

      tree.push({
        id: sectionId,
        elType: "section",
        settings: {
          background_color: pCol === "#111111" ? "#0b0c10" : pCol,
          color: "#ffffff",
          padding: { top: 80, bottom: 80, unit: "px" }
        },
        elements: [
          {
            id: Math.random().toString(36).slice(2, 9),
            elType: "column",
            settings: { _column_size: 55 },
            elements: [
              {
                id: Math.random().toString(36).slice(2, 9),
                elType: "widget",
                widgetType: "heading",
                settings: {
                  title: heroHeadline,
                  header_size: "h1",
                  title_color: aCol,
                  typography_font_size: { size: 42, unit: "px" },
                  typography_font_family: font,
                  typography_font_weight: "700"
                }
              },
              {
                id: Math.random().toString(36).slice(2, 9),
                elType: "widget",
                widgetType: "text-editor",
                settings: {
                  editor: `<p style="font-size: 16px; opacity: 0.9; margin-top: 15px; margin-bottom: 25px; font-family: ${font}">${heroSub}</p>`
                }
              },
              {
                id: Math.random().toString(36).slice(2, 9),
                elType: "widget",
                widgetType: "button",
                settings: {
                  text: buttonText || "BOOK A CALL",
                  link: { url: buttonUrl || "/book-a-call" },
                  button_background_color: aCol,
                  button_text_color: pCol === "#111111" ? "#ffffff" : "#111111",
                  align: "left"
                }
              }
            ]
          },
          {
            id: Math.random().toString(36).slice(2, 9),
            elType: "column",
            settings: { _column_size: 45 },
            elements: [
              {
                id: Math.random().toString(36).slice(2, 9),
                elType: "widget",
                widgetType: "image",
                settings: {
                  image: { url: heroImage, alt: heroHeadline },
                  border_radius: { size: 12, unit: "px" },
                  align: "center"
                }
              }
            ]
          }
        ]
      });
      return;
    }

    // Services Grid / Numbered Cards Layout
    if (sec.title.toLowerCase().includes("service") || sec.title.toLowerCase().includes("our services")) {
      const sectionTitle = headers[0] || sec.title;
      const cards: any[] = [];
      
      // Parse structured services
      // Services section format usually has header numbers or list blocks like "01 BREEAM", "02 Consultancy"
      const serviceBlocks = sec.content.split(/\n(?=\d{2}\s*)/);
      serviceBlocks.forEach((block) => {
        const subLines = block.split("\n").map(l => l.trim()).filter(Boolean);
        if (subLines.length === 0) return;
        
        const numTitle = subLines[0]; // e.g. "01"
        const cardTitle = subLines[1]?.replace(/^\*\*|\*\*$/g, "") || "Service Detail";
        const cardDesc = subLines.slice(2).filter(l => !l.startsWith("!")).join(" ");
        const cardImg = block.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1] || null;

        cards.push({
          num: numTitle,
          title: cardTitle,
          desc: cardDesc,
          image: resolveImage(cardImg)
        });
      });

      // Renders services in columns
      const cols = cards.length > 0 ? cards.map(c => ({
        id: Math.random().toString(36).slice(2, 9),
        elType: "column",
        settings: { 
          _column_size: Math.floor(100 / Math.max(1, cards.length)),
          background_color: "#ffffff",
          padding: { top: 25, right: 20, bottom: 25, left: 20, unit: "px" },
          border_radius: { size: 10, unit: "px" },
          margin: { top: 10, right: 10, bottom: 10, left: 10, unit: "px" }
        },
        elements: [
          c.image && {
            id: Math.random().toString(36).slice(2, 9),
            elType: "widget",
            widgetType: "image",
            settings: { image: { url: c.image }, height: { size: 60, unit: "px" }, align: "left", margin: { bottom: 15 } }
          },
          {
            id: Math.random().toString(36).slice(2, 9),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: `${c.num} ${c.title}`,
              header_size: "h3",
              title_color: pCol,
              typography_font_size: { size: 18, unit: "px" },
              typography_font_family: font,
              typography_font_weight: "600"
            }
          },
          {
            id: Math.random().toString(36).slice(2, 9),
            elType: "widget",
            widgetType: "text-editor",
            settings: {
              editor: `<p style="font-size: 13px; color: #666666; margin-top: 8px; line-height: 1.5; font-family: ${font}">${c.desc}</p>`
            }
          }
        ].filter(Boolean)
      })) : [];

      tree.push({
        id: sectionId,
        elType: "section",
        settings: {
          background_color: "#f8f9fa",
          padding: { top: 70, bottom: 70, unit: "px" }
        },
        elements: [
          {
            id: Math.random().toString(36).slice(2, 9),
            elType: "column",
            settings: { _column_size: 100 },
            elements: [
              {
                id: Math.random().toString(36).slice(2, 9),
                elType: "widget",
                widgetType: "heading",
                settings: {
                  title: sectionTitle,
                  header_size: "h2",
                  title_color: pCol,
                  typography_font_size: { size: 30, unit: "px" },
                  typography_font_family: font,
                  typography_font_weight: "700",
                  align: "center"
                }
              },
              {
                id: Math.random().toString(36).slice(2, 9),
                elType: "widget",
                widgetType: "spacer",
                settings: { space: { size: 30, unit: "px" } }
              }
            ]
          },
          ...cols
        ]
      });
      return;
    }

    // Alternating Story / About / Layout blocks
    const sideImage = resolveImage(images[0] || page.featuredImage);
    const contentTitle = headers[0] || sec.title;
    const contentBody = paragraphs.join("<br/><br/>");
    const isEven = idx % 2 === 0;

    tree.push({
      id: sectionId,
      elType: "section",
      settings: {
        background_color: isEven ? "#ffffff" : "#fdfdfd",
        padding: { top: 65, bottom: 65, unit: "px" }
      },
      elements: isEven ? [
        {
          id: Math.random().toString(36).slice(2, 9),
          elType: "column",
          settings: { _column_size: 45 },
          elements: [
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "image",
              settings: { image: { url: sideImage }, border_radius: { size: 10, unit: "px" } }
            }
          ]
        },
        {
          id: Math.random().toString(36).slice(2, 9),
          elType: "column",
          settings: { _column_size: 55 },
          elements: [
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "heading",
              settings: {
                title: contentTitle,
                header_size: "h2",
                title_color: pCol,
                typography_font_size: { size: 28, unit: "px" },
                typography_font_family: font,
                typography_font_weight: "700"
              }
            },
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "text-editor",
              settings: {
                editor: `<div style="font-size: 14px; line-height: 1.6; color: #444444; margin-top: 15px; font-family: ${font}">${contentBody}</div>`
              }
            },
            bullets.length > 0 && {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "icon-list",
              settings: {
                icon_list: bullets.map(b => ({ text: b, selected_icon: { value: { url: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=20&q=80" } } }))
              }
            },
            buttonText && {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "button",
              settings: {
                text: buttonText,
                link: { url: buttonUrl },
                button_background_color: aCol,
                button_text_color: "#ffffff"
              }
            }
          ].filter(Boolean) as any[]
        }
      ] : [
        {
          id: Math.random().toString(36).slice(2, 9),
          elType: "column",
          settings: { _column_size: 55 },
          elements: [
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "heading",
              settings: {
                title: contentTitle,
                header_size: "h2",
                title_color: pCol,
                typography_font_size: { size: 28, unit: "px" },
                typography_font_family: font,
                typography_font_weight: "700"
              }
            },
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "text-editor",
              settings: {
                editor: `<div style="font-size: 14px; line-height: 1.6; color: #444444; margin-top: 15px; font-family: ${font}">${contentBody}</div>`
              }
            },
            bullets.length > 0 && {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "icon-list",
              settings: {
                icon_list: bullets.map(b => ({ text: b, selected_icon: { value: { url: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=20&q=80" } } }))
              }
            },
            buttonText && {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "button",
              settings: {
                text: buttonText,
                link: { url: buttonUrl },
                button_background_color: aCol,
                button_text_color: "#ffffff"
              }
            }
          ].filter(Boolean) as any[]
        },
        {
          id: Math.random().toString(36).slice(2, 9),
          elType: "column",
          settings: { _column_size: 45 },
          elements: [
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "image",
              settings: { image: { url: sideImage }, border_radius: { size: 10, unit: "px" } }
            }
          ]
        }
      ]
    });
  });

  return tree;
}

// -------- Prebuilt Premium Global Header/Footer Templates ------------------

function generatePremiumHeaderTemplate(
  branding: { primary: string; accent: string; font: string },
  logoUrl: string | null
): any[] {
  return [
    {
      id: "global-header-section",
      elType: "section",
      settings: {
        background_color: "#0b0c10",
        padding: { top: 8, bottom: 8, unit: "px" }
      },
      elements: [
        {
          id: "header-top-column",
          elType: "column",
          settings: { _column_size: 100 },
          elements: [
            {
              id: "header-contact-details",
              elType: "widget",
              widgetType: "html",
              settings: {
                html: `<div style="display:flex; justify-content:flex-end; gap:20px; font-size:11px; color:#c5c6c7; font-family:${branding.font}">
                  <span style="display:flex; align-items:center; gap:5px;"><span style="color:${branding.accent}">📞</span> UK: +442071833436</span>
                  <span style="display:flex; align-items:center; gap:5px;"><span style="color:${branding.accent}">📞</span> UK: +4474545439583</span>
                  <span style="display:flex; align-items:center; gap:5px;"><span style="color:${branding.accent}">📞</span> US: +16502784421</span>
                  <span style="display:flex; align-items:center; gap:5px;"><span style="color:${branding.accent}">✉️</span> info@pearllemongroup.com</span>
                </div>`
              }
            }
          ]
        }
      ]
    },
    {
      id: "global-nav-section",
      elType: "section",
      settings: {
        background_color: "#ffffff",
        padding: { top: 15, bottom: 15, unit: "px" }
      },
      elements: [
        {
          id: "header-logo-column",
          elType: "column",
          settings: { _column_size: 30 },
          elements: [
            {
              id: "header-logo-img",
              elType: "widget",
              widgetType: "image",
              settings: {
                image: { url: logoUrl || "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=150&q=80", alt: "Logo" },
                height: { size: 40, unit: "px" },
                align: "left"
              }
            }
          ]
        },
        {
          id: "header-nav-column",
          elType: "column",
          settings: { _column_size: 45 },
          elements: [
            {
              id: "header-nav-links",
              elType: "widget",
              widgetType: "html",
              settings: {
                html: `<div style="display:flex; justify-content:center; gap:25px; font-size:14px; font-weight:600; font-family:${branding.font}">
                  <a href="/seo" style="text-decoration:none; color:#333;">SEO</a>
                  <a href="/ppc" style="text-decoration:none; color:#333;">PPC</a>
                  <a href="/about" style="text-decoration:none; color:#333;">About</a>
                  <a href="/contact" style="text-decoration:none; color:#333;">Contact Us</a>
                </div>`
              }
            }
          ]
        },
        {
          id: "header-cta-column",
          elType: "column",
          settings: { _column_size: 25 },
          elements: [
            {
              id: "header-audit-btn",
              elType: "widget",
              widgetType: "button",
              settings: {
                text: "GET MY FREE SEO AUDIT!",
                link: { url: "/seo/audit" },
                button_background_color: branding.accent,
                button_text_color: "#111111"
              }
            }
          ]
        }
      ]
    }
  ];
}

function generatePremiumFooterTemplate(
  branding: { primary: string; accent: string; font: string },
  logoUrl: string | null
): any[] {
  return [
    {
      id: "global-footer-section",
      elType: "section",
      settings: {
        background_color: "#0b0c10",
        color: "#c5c6c7",
        padding: { top: 60, bottom: 40, unit: "px" }
      },
      elements: [
        {
          id: "footer-desc-col",
          elType: "column",
          settings: { _column_size: 30 },
          elements: [
            {
              id: "footer-logo",
              elType: "widget",
              widgetType: "image",
              settings: { image: { url: logoUrl || "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=150&q=80" }, height: { size: 35, unit: "px" } }
            },
            {
              id: "footer-desc-text",
              elType: "widget",
              widgetType: "text-editor",
              settings: { editor: `<p style="font-size:12px; margin-top:15px; font-family:${branding.font}">Increase visibility, attract qualified leads, and convert more customers with expert SEO services.</p>` }
            }
          ]
        },
        {
          id: "footer-links-col",
          elType: "column",
          settings: { _column_size: 20 },
          elements: [
            {
              id: "footer-links-heading",
              elType: "widget",
              widgetType: "heading",
              settings: { title: "Quick Links", header_size: "h4", title_color: "#ffffff", typography_font_size: { size: 15 } }
            },
            {
              id: "footer-links-list",
              elType: "widget",
              widgetType: "html",
              settings: {
                html: `<ul style="list-style:none; padding:0; font-size:12px; line-height:2; font-family:${branding.font}">
                  <li><a href="#" style="color:#aaa; text-decoration:none;">Meet The Team</a></li>
                  <li><a href="#" style="color:#aaa; text-decoration:none;">Why Pearl Lemon</a></li>
                  <li><a href="#" style="color:#aaa; text-decoration:none;">We're Hiring!</a></li>
                  <li><a href="#" style="color:#aaa; text-decoration:none;">B2B Lead Generation</a></li>
                </ul>`
              }
            }
          ]
        },
        {
          id: "footer-address-col",
          elType: "column",
          settings: { _column_size: 25 },
          elements: [
            {
              id: "footer-address-heading",
              elType: "widget",
              widgetType: "heading",
              settings: { title: "Office & Contact", header_size: "h4", title_color: "#ffffff", typography_font_size: { size: 15 } }
            },
            {
              id: "footer-address-text",
              elType: "widget",
              widgetType: "text-editor",
              settings: {
                editor: `<p style="font-size:12px; font-family:${branding.font}">
                  <strong>Pearl Lemon Ltd.</strong><br/>
                  Kemp House, 152 – 160 City Road<br/>
                  London, EC1V 2NX, UK
                </p>`
              }
            }
          ]
        },
        {
          id: "footer-map-col",
          elType: "column",
          settings: { _column_size: 25 },
          elements: [
            {
              id: "footer-map-iframe",
              elType: "widget",
              widgetType: "html",
              settings: {
                html: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2482.383188981622!2d-0.08985168403212879!3d51.524589979637566!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48761ca94eb6c0c1%3A0xc3f83737b830d6bf!2sKemp%20House%2C%20152-160%20City%20Rd%2C%20London%20EC1V%202NX!5e0!3m2!1sen!2suk!4v1624564887358" width="100%" height="110" style="border:0; filter:grayscale(1) opacity(0.8);" allowfullscreen="" loading="lazy"></iframe>`
              }
            }
          ]
        }
      ]
    }
  ];
}

// -------- Main ZipSite Importer Pipeline ------------------------------------

export async function importZipSite(
  file: File,
  branding: { primary: string; accent: string; font: string },
  onProgress?: (msg: string) => void,
  siteId?: string
): Promise<ZipImportResult> {
  const result: ZipImportResult = {
    pages: 0,
    posts: 0,
    images: 0,
    logo: null,
    failed: 0,
    errors: [],
  };

  const { data: sess } = await supabase.auth.getSession();
  const userId = sess?.session?.user?.id || null;
  if (!userId) throw new Error("Sign in required for website export import.");

  onProgress?.("Extracting ZIP file archive…");
  const zip = await JSZip.loadAsync(file);

  // 1. Upload and Map Images
  onProgress?.("Scanning and optimizing image assets…");
  const imageFiles = Object.keys(zip.files).filter(
    (p) => p.match(/\.(png|jpe?g|webp|gif|svg)$/i) && !p.includes("__MACOSX")
  );

  const imageMap = new Map<string, string>(); // origFilename -> supabasePublicUrl

  for (const path of imageFiles) {
    try {
      const filename = path.split("/").pop() || "image.png";
      const blob = await zip.files[path].async("blob");
      
      const ext = filename.split(".").pop() || "png";
      const slug = filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) || "img";
      const key = `imported/${Date.now()}-${slug}.${ext}`;
      
      const contentType = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      
      const { error } = await supabase.storage.from("post-images").upload(key, blob, {
        contentType,
        cacheControl: "31536000",
      });
      
      if (error) {
        result.errors.push(`Image upload failed (${filename}): ${error.message}`);
        continue;
      }
      
      const { data: pub } = supabase.storage.from("post-images").getPublicUrl(key);
      imageMap.set(filename, pub.publicUrl);
      result.images++;
    } catch (e) {
      result.errors.push(`Image extract failed (${path}): ${(e as Error).message}`);
    }
  }

  // 2. Scan and parse Markdown files under page/ and post/
  onProgress?.("Parsing Markdown pages and posts…");
  
  const files = Object.keys(zip.files);
  const mdPageFiles = files.filter((p) => p.match(/^page\/[^/]+\.md$/i) || (p.includes("/page/") && p.endsWith(".md")));
  const mdPostFiles = files.filter((p) => p.match(/^post\/[^/]+\.md$/i) || (p.includes("/post/") && p.endsWith(".md")));

  const parsedPages: ParsedPage[] = [];

  // Extract Logo Url
  let globalLogoUrl: string | null = null;

  for (const path of mdPageFiles) {
    try {
      const md = await zip.files[path].async("string");
      const filename = path.split("/").pop() || "page.md";
      const parsed = parseMarkdownPage(filename, md, "page");
      parsedPages.push(parsed);
      if (parsed.logoUrl && !globalLogoUrl) {
        globalLogoUrl = parsed.logoUrl;
      }
    } catch (e) {
      result.failed++;
      result.errors.push(`Page parse failed (${path}): ${(e as Error).message}`);
    }
  }

  for (const path of mdPostFiles) {
    try {
      const md = await zip.files[path].async("string");
      const filename = path.split("/").pop() || "post.md";
      const parsed = parseMarkdownPage(filename, md, "post");
      parsedPages.push(parsed);
      if (parsed.logoUrl && !globalLogoUrl) {
        globalLogoUrl = parsed.logoUrl;
      }
    } catch (e) {
      result.failed++;
      result.errors.push(`Post parse failed (${path}): ${(e as Error).message}`);
    }
  }

  // Map the logo to our uploaded image if possible
  if (globalLogoUrl) {
    const logoFilename = globalLogoUrl.split("/").pop() || "";
    if (imageMap.has(logoFilename)) {
      globalLogoUrl = imageMap.get(logoFilename) || globalLogoUrl;
    }
    result.logo = globalLogoUrl;
  }

  // 3. Sync Branding Colors and Font to Database (theme_tokens table)
  onProgress?.("Synchronizing branding tokens…");
  try {
    const { data: currentTokens } = await supabase.from("theme_tokens").select("*").limit(1).maybeSingle();
    const updatedTokens = {
      colors: {
        primary: branding.primary,
        accent: branding.accent,
        background: "#ffffff",
        foreground: "#0f172a",
      },
      typography: {
        fontFamilyHeading: branding.font,
        fontFamilyBody: branding.font,
        baseSize: 16,
        scale: 1.25,
      },
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 },
      breakpoints: { mobile: 640, tablet: 1024, desktop: 1280 },
    };
    
    if (currentTokens) {
      await supabase
        .from("theme_tokens")
        .update(updatedTokens)
        .eq("id", currentTokens.id);
    } else {
      await supabase
        .from("theme_tokens")
        .insert(updatedTokens);
    }
  } catch (e) {
    result.errors.push(`Branding sync failed: ${(e as Error).message}`);
  }

  // 4. Create and Save Premium Global Header/Footer Visual Templates
  onProgress?.("Creating premium Header & Footer templates…");
  try {
    const headerTree = generatePremiumHeaderTemplate(branding, globalLogoUrl);
    await supabase.from("elementor_templates").upsert({
      source_id: "global-header-layout",
      kind: "header",
      title: "Global Header Template",
      slug: "global-header",
      data: headerTree as any,
      source: "elementor",
      imported_by: userId,
    }, { onConflict: "source_id" });

    const footerTree = generatePremiumFooterTemplate(branding, globalLogoUrl);
    await supabase.from("elementor_templates").upsert({
      source_id: "global-footer-layout",
      kind: "footer",
      title: "Global Footer Template",
      slug: "global-footer",
      data: footerTree as any,
      source: "elementor",
      imported_by: userId,
    }, { onConflict: "source_id" });
  } catch (e) {
    result.errors.push(`Header/Footer creation failed: ${(e as Error).message}`);
  }

  // 5. Generate and Upsert Visual Pages
  onProgress?.(`Generating and saving ${parsedPages.length} visual pages/posts…`);
  const site_id = siteId || "default"; // Default site scope

  for (const page of parsedPages) {
    try {
      const visualTree = generateVisualTree(page, branding, imageMap);
      const featuredImage = resolveImageUrl(page.featuredImage, imageMap);

      const row = {
        site_id,
        title: page.title,
        slug: page.slug,
        excerpt: page.metaDescription || `Discover details about ${page.title}.`,
        body: page.sections.map(s => `<h2>${s.title}</h2><p>${s.content.slice(0, 150)}...</p>`).join(""),
        elementor_data: visualTree as unknown as never,
        render_mode: page.type === "post" ? "template" : "elementor",
        status: "published",
        publish_date: new Date().toISOString(),
        featured_image_url: featuredImage,
        type: page.type,
        meta_title: page.metaTitle || page.title,
        meta_description: page.metaDescription || "",
        canonical_url: page.canonicalUrl || "",
        source: "zip-export",
        imported_by: userId,
        raw: { original_slug: page.slug } as unknown as never,
      };

      const { error } = await supabase
        .from("imported_posts")
        .upsert(row, { onConflict: "site_id,slug" });

      if (error) {
        result.failed++;
        result.errors.push(`Upsert page failed (${page.title}): ${error.message}`);
      } else {
        if (page.type === "post") result.posts++;
        else result.pages++;

        // Best-effort mirror to live posts table
        try {
          const liveRow = {
            site_id,
            title: page.title,
            slug: page.slug,
            type: page.type,
            status: "published",
            excerpt: page.metaDescription || `Discover details about ${page.title}.`,
            body: page.sections.map(s => `<h2>${s.title}</h2><p>${s.content.slice(0, 150)}...</p>`).join(""),
            featured_image_url: featuredImage,
            template: page.type === "post" ? "blog" : (page.slug === "" || page.slug === "home" ? "home" : "default"),
            render_mode: page.type === "post" ? "template" : "elementor",
            elementor_data: visualTree as unknown as never,
            meta_title: page.metaTitle || page.title,
            meta_description: page.metaDescription || "",
            canonical_url: page.canonicalUrl || "",
            published_at: new Date().toISOString(),
            publish_date: new Date().toISOString(),
          };
          await supabase.from("posts").upsert(liveRow, { onConflict: "site_id,type,slug" });
        } catch (e) {
          console.warn(`Failed to mirror to live posts for ${page.title}:`, e);
        }
      }
    } catch (e) {
      result.failed++;
      result.errors.push(`Generate visual layout failed (${page.title}): ${(e as Error).message}`);
    }
  }

  // Auto-regenerate sitemap + llms.txt after the import lands
  if (result.pages > 0 || result.posts > 0) {
    try {
      const { regenerateSeoFiles } = await import("@/lib/regenerateSeoFiles");
      await regenerateSeoFiles(window.location.origin, null, undefined, ["sitemap", "llms"]);
    } catch (e) { console.warn("SEO regen failed:", e); }
  }

  return result;
}

export async function importSingleMd(
  file: File,
  branding: { primary: string; accent: string; font: string },
  onProgress?: (msg: string) => void,
  siteId?: string
): Promise<ZipImportResult> {
  const result: ZipImportResult = {
    pages: 0,
    posts: 0,
    images: 0,
    logo: null,
    failed: 0,
    errors: [],
  };

  try {
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const mdText = await file.text();
    onProgress?.("Parsing Markdown file…");
    
    const filename = file.name;
    const isPost = filename.toLowerCase().includes("post") || filename.toLowerCase().includes("blog") || filename.toLowerCase().startsWith("p-");
    const type = isPost ? "post" : "page";

    const parsedPage = parseMarkdownPage(filename, mdText, type);
    const imageMap = new Map<string, string>();

    onProgress?.("Generating premium visual layout…");
    const visualTree = generateVisualTree(parsedPage, branding, imageMap);
    
    const site_id = siteId || "default";
    const featuredImage = parsedPage.featuredImage || "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80";

    const row = {
      site_id,
      title: parsedPage.title,
      slug: parsedPage.slug,
      excerpt: parsedPage.metaDescription || `Discover details about ${parsedPage.title}.`,
      body: parsedPage.sections.map(s => `<h2>${s.title}</h2><p>${s.content.slice(0, 150)}...</p>`).join(""),
      elementor_data: visualTree as unknown as never,
      render_mode: parsedPage.type === "post" ? "template" : "elementor",
      status: "published",
      publish_date: new Date().toISOString(),
      featured_image_url: featuredImage,
      type: parsedPage.type,
      meta_title: parsedPage.metaTitle || parsedPage.title,
      meta_description: parsedPage.metaDescription || "",
      canonical_url: parsedPage.canonicalUrl || "",
      source: "md-import",
      imported_by: userId,
      raw: { original_slug: parsedPage.slug } as unknown as never,
    };

    onProgress?.("Saving to database…");
    const { error } = await supabase
      .from("imported_posts")
      .upsert(row, { onConflict: "site_id,slug" });

    if (error) {
      result.failed++;
      result.errors.push(`Upsert page failed (${parsedPage.title}): ${error.message}`);
    } else {
      if (parsedPage.type === "post") result.posts++;
      else result.pages++;

      // Mirror to live posts table
      try {
        const liveRow = {
          site_id,
          title: parsedPage.title,
          slug: parsedPage.slug,
          type: parsedPage.type,
          status: "published",
          excerpt: parsedPage.metaDescription || `Discover details about ${parsedPage.title}.`,
          body: parsedPage.sections.map(s => `<h2>${s.title}</h2><p>${s.content.slice(0, 150)}...</p>`).join(""),
          featured_image_url: featuredImage,
          template: parsedPage.type === "post" ? "blog" : (parsedPage.slug === "" || parsedPage.slug === "home" ? "home" : "default"),
          render_mode: parsedPage.type === "post" ? "template" : "elementor",
          elementor_data: visualTree as unknown as never,
          meta_title: parsedPage.metaTitle || parsedPage.title,
          meta_description: parsedPage.metaDescription || "",
          canonical_url: parsedPage.canonicalUrl || "",
          published_at: new Date().toISOString(),
          publish_date: new Date().toISOString(),
        };
        await supabase.from("posts").upsert(liveRow, { onConflict: "site_id,type,slug" });
      } catch (e) {
        console.warn(`Failed to mirror to live posts for ${parsedPage.title}:`, e);
      }
    }

    // Auto-regenerate sitemap + llms.txt
    if (result.pages > 0 || result.posts > 0) {
      try {
        const { regenerateSeoFiles } = await import("@/lib/regenerateSeoFiles");
        await regenerateSeoFiles(window.location.origin, null, undefined, ["sitemap", "llms"]);
      } catch (e) { console.warn("SEO regen failed:", e); }
    }
  } catch (e) {
    result.failed++;
    result.errors.push(`Single MD import failed: ${(e as Error).message}`);
  }

  return result;
}
