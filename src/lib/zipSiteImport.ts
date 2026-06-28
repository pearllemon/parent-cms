// Advanced Website Export ZIP & MD Importer.
// Extracts ZIPs containing page/ and post/ markdown files, uploads images,
// extracts logos, prompts for branding, and generates premium visual page layouts.

import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { saveTokens } from "./themeStore";

import { parseVideo } from "./parsers/videoParser";
import { parseGallery } from "./parsers/galleryParser";
export type ZipImportResult = {
  pages: number;
  posts: number;
  images: number;
  logo: string | null;
  failed: number;
  errors: string[];
};

type NavLink = { label: string; url: string };

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
  headerLinks?: NavLink[];
  footerLinks?: NavLink[];
  faqQuestions?: string[];
};

// -------- Helpers for sanitizing and parsing -------------------------------

const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function cleanMarkdownJunk(md: string): string {
  if (!md) return "";
  
  let cleaned = md.replace(/\r\n/g, "\n");
  
  // Find the starting index of any of the junk/appended footer sections
  const patterns = [
    /(?:---\s*\n+)?#+\s+Navigation\s+Links/i,
    /(?:---\s*\n+)?\*?\s*Copyright\s+©/i,
    /(?:---\s*\n+)?\*?\s*Generated\s+by\s+Content\s+Snapshot\s+Pro/i,
  ];
  
  let firstIndex = -1;
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match.index !== undefined) {
      if (firstIndex === -1 || match.index < firstIndex) {
        firstIndex = match.index;
      }
    }
  }
  
  if (firstIndex !== -1) {
    cleaned = cleaned.substring(0, firstIndex).trim();
  }
  
  // Clean up any remaining trailing separators, linebreaks, or non-breaking spaces
  while (cleaned.endsWith("---") || cleaned.endsWith("&nbsp;") || cleaned.endsWith(" ")) {
    cleaned = cleaned.replace(/(?:---\s*|&nbsp;\s*|\s+)$/, "").trim();
  }
  
  return cleaned;
}

function rewriteImportedUrl(url: string): string {
  try {
    if (url.startsWith("/") || url.startsWith("#")) return url;
    const parsed = new URL(url);
    let path = parsed.pathname;
    if (path.endsWith("/")) path = path.slice(0, -1);
    if (!path) return "/";
    const slug = path.split("/").pop() || "";
    if (slug === "blog") return "/blog";
    if (slug === "home" || slug === "") return "/";
    return `/p/${slug}`;
  } catch {
    return url;
  }
}

function extractNavigationLinks(md: string): { headerLinks: NavLink[]; footerLinks: NavLink[] } {
  const headerLinks: NavLink[] = [];
  const footerLinks: NavLink[] = [];
  
  const navMatch = md.match(/##\s+Navigation\s+Links([\s\S]*?)(?:---|\*Copyright|$)/i);
  if (!navMatch) return { headerLinks, footerLinks };
  
  const content = navMatch[1];
  
  // Find Header section
  const headerMatch = content.match(/###\s+Header([\s\S]*?)(?:###\s+Footer|$)/i);
  if (headerMatch) {
    const linkMatches = headerMatch[1].matchAll(/-\s*\[([^\]]+)\]\(([^)]+)\)/g);
    for (const match of linkMatches) {
      headerLinks.push({ label: match[1].trim(), url: match[2].trim() });
    }
  }
  
  // Find Footer section
  const footerMatch = content.match(/###\s+Footer([\s\S]*?)$/i);
  if (footerMatch) {
    const linkMatches = footerMatch[1].matchAll(/-\s*\[([^\]]+)\]\(([^)]+)\)/g);
    for (const match of linkMatches) {
      footerLinks.push({ label: match[1].trim(), url: match[2].trim() });
    }
  }
  
  return { headerLinks, footerLinks };
}

async function downloadAndMapRemoteImages(
  mdTexts: string[],
  imageMap: Map<string, string>,
  onProgress?: (msg: string) => void,
  siteId?: string,
  userId?: string | null
): Promise<number> {
  const remoteUrls = new Set<string>();
  
  // Match Markdown image syntax: ![alt](url)
  const mdImgRegex = /!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g;
  // Match HTML image syntax: <img src="url" .../>
  const htmlImgRegex = /<img\s+[^>]*src=["'](https?:\/\/[^"']+)["']/g;
  
  for (const md of mdTexts) {
    let match;
    
    mdImgRegex.lastIndex = 0;
    while ((match = mdImgRegex.exec(md)) !== null) {
      const url = match[1].trim();
      if (!url.includes(".supabase.co/storage/v1/object/public/")) {
        remoteUrls.add(url);
      }
    }
    
    htmlImgRegex.lastIndex = 0;
    while ((match = htmlImgRegex.exec(md)) !== null) {
      const url = match[1].trim();
      if (!url.includes(".supabase.co/storage/v1/object/public/")) {
        remoteUrls.add(url);
      }
    }
  }
  
  if (remoteUrls.size === 0) return 0;
  
  onProgress?.(`Found ${remoteUrls.size} remote image URLs. Downloading and caching…`);
  let downloadedCount = 0;
  
  for (const url of remoteUrls) {
    try {
      if (imageMap.has(url)) continue;
      
      const cleanUrl = url.split("?")[0];
      const filename = cleanUrl.split("/").pop() || "downloaded-image.png";
      
      onProgress?.(`Downloading image: ${filename}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to download image from ${url}: ${response.statusText}`);
        continue;
      }
      
      const blob = await response.blob();
      const ext = filename.split(".").pop() || "png";
      const slug = filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) || "img";
      const key = `imported/downloaded-${Date.now()}-${slug}.${ext}`;
      const contentType = blob.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
      
      const { error } = await supabase.storage.from("post-images").upload(key, blob, {
        contentType,
        cacheControl: "31536000",
      });
      
      if (error) {
        console.warn(`Failed to upload downloaded image ${filename}: ${error.message}`);
        continue;
      }
      
      const { data: pub } = supabase.storage.from("post-images").getPublicUrl(key);
      imageMap.set(url, pub.publicUrl);
      imageMap.set(filename, pub.publicUrl);
      downloadedCount++;

      // Catalog in Media Library
      try {
        const targetSiteId = siteId || "default";
        await supabase.from("media_meta").insert({
          site_id: targetSiteId,
          media_url: pub.publicUrl,
          file_name: filename,
          mime_type: contentType,
          size_bytes: blob.size,
          source: "cloud",
          folder: "imported",
        });

        await supabase.from("media_library").insert({
          site_id: targetSiteId,
          file_url: pub.publicUrl,
          file_name: filename,
          file_size: blob.size,
          mime_type: contentType,
        });
      } catch (dbErr) {
        console.warn("Failed to catalog downloaded remote image in media library:", dbErr);
      }
    } catch (e) {
      console.warn(`Failed to download remote image from ${url}:`, e);
    }
  }
  
  return downloadedCount;
}

function parseMarkdownPage(filename: string, md: string, type: "page" | "post"): ParsedPage {
  const cleanedMd = cleanMarkdownJunk(md);
  const navLinks = extractNavigationLinks(md);
  
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
    headerLinks: navLinks.headerLinks,
    footerLinks: navLinks.footerLinks,
    faqQuestions: [],
  };

  if (result.slug === "home") result.slug = ""; // Root path for homepage

  // 1. Parse Meta Tags Table
  const metaTitleMatch = cleanedMd.match(/\|\s*\*\*Meta Title\*\*\s*\|\s*([^|]+)\|/i);
  if (metaTitleMatch) result.metaTitle = metaTitleMatch[1].trim();

  const metaDescMatch = cleanedMd.match(/\|\s*\*\*Meta Description\*\*\s*\|\s*([^|]+)\|/i);
  if (metaDescMatch) result.metaDescription = metaDescMatch[1].trim();

  const canonicalMatch = cleanedMd.match(/\|\s*\*\*Canonical URL\*\*\s*\|\s*([^|]+)\|/i);
  if (canonicalMatch) result.canonicalUrl = canonicalMatch[1].trim();

  // 2. Extract Logo & FAQs from JSON-LD Schema
  const jsonBlocks = cleanedMd.match(/```json([\s\S]*?)```/g) || [];
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

      // Extract FAQ questions from ItemList schema
      if (parsed["@type"] === "ItemList" && Array.isArray(parsed.itemListElement)) {
        parsed.itemListElement.forEach((item: any) => {
          if (item.name) {
            const name = item.name.trim();
            const lower = name.toLowerCase();
            if (name.includes("?") || lower.includes("faq") || lower.startsWith("how ") || lower.startsWith("what ") || lower.startsWith("why ") || lower.startsWith("do ") || lower.startsWith("are ") || lower.startsWith("can ") || lower.startsWith("which ") || lower.startsWith("is ")) {
              result.faqQuestions?.push(name);
            }
          }
        });
      }
    } catch { /* ignore */ }
  }

  // 3. Parse Sections by splitting after '# PAGE CONTENT'
  const normalizedMd = cleanedMd;
  const contentMarker = normalizedMd.indexOf("# PAGE CONTENT");
  let bodyText = normalizedMd;
  
  if (contentMarker !== -1) {
    const lineEnd = normalizedMd.indexOf("\n", contentMarker);
    const startIdx = lineEnd !== -1 ? lineEnd + 1 : contentMarker + 14;
    let rest = normalizedMd.slice(startIdx).trim();
    
    // Skip the trailing divider line if it exists
    if (rest.startsWith("# ──") || rest.startsWith("# ───") || rest.startsWith("# ──────────────────────────────")) {
      const dividerEnd = rest.indexOf("\n");
      rest = rest.slice(dividerEnd !== -1 ? dividerEnd + 1 : 0).trim();
    }
    bodyText = rest;
  }

  // Split content by sections denoted by bullet checklist "- ✅" or h2 "## "
  const rawSections = bodyText.split(/(?:-\s*✅\s*|##\s*\[?✅\]?\s*)/i);
  
  // The first section before any checklist tag is the Hero intro
  let intro = rawSections[0].trim();
  if (intro) {
    // Extract first title header # or ## as page title, ignoring horizontal lines
    let firstTitle = "";
    const firstTitleMatch = intro.match(/^[#\s]+([^\n]+)/);
    if (firstTitleMatch) {
      const matchedTitle = firstTitleMatch[1].trim();
      // Only set title if it's not a horizontal rule or divider
      if (!matchedTitle.startsWith("──") && !matchedTitle.startsWith("---")) {
        firstTitle = matchedTitle;
      }
    }
    
    if (firstTitle) {
      result.title = firstTitle;
      // Strip this heading from the intro content so it's not duplicated
      intro = intro.substring(firstTitleMatch[0].length).trim();
    }
    
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
    const imgMatch = cleanedMd.match(/!\[[^\]]*\]\(([^)]+)\)/i);
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

function markdownToHtml(md: string, imageMap?: Map<string, string>): string {
  if (!md) return "";
  
  let html = md.replace(/\r\n/g, "\n");
  
  // Resolve image helper
  const resolveImage = (url: string): string => {
    if (!imageMap) return url;
    return resolveImageUrl(url, imageMap);
  };
  
  // 1. Headings (h1, h2, h3, h4)
  html = html.replace(/^####\s+(.*)$/gm, "<h4 style='font-size:18px; font-weight:700; margin-top:25px; margin-bottom:10px;'>$1</h4>");
  html = html.replace(/^###\s+(.*)$/gm, "<h3 style='font-size:20px; font-weight:700; margin-top:28px; margin-bottom:12px;'>$1</h3>");
  html = html.replace(/^##\s+(.*)$/gm, "<h2 style='font-size:24px; font-weight:700; margin-top:32px; margin-bottom:15px; border-bottom:1px solid #eaeaea; padding-bottom:8px;'>$1</h2>");
  html = html.replace(/^#\s+(.*)$/gm, "<h1 style='font-size:30px; font-weight:800; margin-top:35px; margin-bottom:20px;'>$1</h1>");
  
  // 2. Blockquotes
  html = html.replace(/^>\s+(.*)$/gm, "<blockquote style='border-left:4px solid #e94560; padding-left:15px; font-style:italic; color:#555; margin:20px 0;'>$1</blockquote>");
  
  // 3. Images - resolve image URLs via imageMap
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
    const resolvedSrc = resolveImage(src);
    return `<img src='${resolvedSrc}' alt='${alt}' style='max-width:100%; height:auto; border-radius:8px; margin:20px 0; display:block;'/>`;
  });
  
  // 4. Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' style='color:#e94560; font-weight:600; text-decoration:underline;'>$1</a>");
  
  // 5. Bold and Italic
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  
  // 6. Unordered Lists
  const lines = html.split("\n");
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.substring(2);
      if (!inList) {
        lines[i] = `<ul style='list-style-type:disc; padding-left:25px; margin:15px 0;'>\n<li style='margin-bottom:8px;'>${content}</li>`;
        inList = true;
      } else {
        lines[i] = `<li style='margin-bottom:8px;'>${content}</li>`;
      }
    } else {
      if (inList) {
        lines[i] = "</ul>\n" + lines[i];
        inList = false;
      }
    }
  }
  if (inList) {
    lines.push("</ul>");
  }
  html = lines.join("\n");
  
  // 7. Paragraphs
  const blocks = html.split(/\n\s*\n/);
  const blockTags = ["<h1", "<h2", "<h3", "<h4", "<blockquote", "<ul", "<img", "<div"];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;
    
    const hasBlockTag = blockTags.some(t => block.startsWith(t));
    if (!hasBlockTag) {
      blocks[i] = `<p style='margin-bottom:15px; color:#4a5568;'>${block}</p>`;
    }
  }
  html = blocks.join("\n");
  
  return html;
}

function generateVisualTree(
  page: ParsedPage,
  branding: { primary: string; accent: string; font: string },
  imageMap: Map<string, string>
): any[] {
  
  // Resolve image URLs with our uploaded mapped URLs
  const resolveImage = (url: string | null | undefined): string => resolveImageUrl(url, imageMap);

  const pCol = branding.primary;
  const aCol = branding.accent;
  const font = branding.font;

  // Check if this page is a post or a standard contiguous article page (0 or 1 checklist/section splits)
  const isArticle = page.type === "post" || page.sections.length <= 1;

  if (isArticle) {
    const tree: any[] = [];
    const contentText = page.sections[0]?.content || "";
    const articleHtml = markdownToHtml(contentText, imageMap);
    const featuredImage = resolveImage(page.featuredImage);
    const postTitle = page.title;
    
    // Check if the article is essentially empty (less than 20 characters of real text)
    const isContentEmpty = contentText.replace(/[#\s─\-=_]/g, "").length < 20;
    
    const heroSectionId = Math.random().toString(36).slice(2, 9);
    
    // 1. Hero Header Section
    tree.push({
      id: heroSectionId,
      elType: "section",
      settings: {
        background_color: pCol === "#111111" ? "#0b0c10" : "#f8f9fa",
        color: pCol === "#111111" ? "#ffffff" : "#1a202c",
        padding: { top: 60, bottom: 60, unit: "px" }
      },
      elements: [
        // Title column (60% width)
        {
          id: Math.random().toString(36).slice(2, 9),
          elType: "column",
          settings: { _column_size: featuredImage ? 60 : 100 },
          elements: [
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "heading",
              settings: {
                title: page.type === "post" ? "BLOG POST" : "ARTICLE",
                header_size: "span",
                title_color: aCol,
                typography_font_size: { size: 13, unit: "px" },
                typography_font_family: font,
                typography_font_weight: "700",
                typography_text_transform: "uppercase",
                margin: { bottom: 10 }
              }
            },
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "heading",
              settings: {
                title: postTitle,
                header_size: "h1",
                title_color: pCol === "#111111" ? "#ffffff" : pCol,
                typography_font_size: { size: 36, unit: "px" },
                typography_font_family: font,
                typography_font_weight: "800",
                margin: { bottom: 15 }
              }
            },
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "text-editor",
              settings: {
                editor: `<p style="font-size: 13px; opacity: 0.8; margin-top: 10px; margin-bottom: 20px; font-family: ${font}">
                  Published by <strong>Team</strong> &bull; Updated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} &bull; 5 min read
                </p>`
              }
            }
          ]
        },
        // Image column (40% width, only if image exists)
        featuredImage ? {
          id: Math.random().toString(36).slice(2, 9),
          elType: "column",
          settings: { _column_size: 40 },
          elements: [
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "image",
              settings: {
                image: { url: featuredImage, alt: postTitle },
                border_radius: { size: 12, unit: "px" },
                align: "center"
              }
            }
          ]
        } : null
      ].filter(Boolean)
    });
    
    // 2. Main Body Section
    const bodySectionId = Math.random().toString(36).slice(2, 9);
    tree.push({
      id: bodySectionId,
      elType: "section",
      settings: {
        background_color: "#ffffff",
        padding: { top: 50, bottom: 70, unit: "px" }
      },
      elements: [
        // Left Column: Content (70% width)
        {
          id: Math.random().toString(36).slice(2, 9),
          elType: "column",
          settings: { _column_size: 70, padding: { right: 35, unit: "px" } },
          elements: [
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "text-editor",
              settings: {
                editor: isContentEmpty 
                  ? `<div style="font-family: ${font}; padding-top: 10px;">
                      <h2 style="font-size: 24px; color: ${pCol}; margin-bottom: 15px; font-weight: 700;">${postTitle}</h2>
                      <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 20px;">
                        Welcome to our dedicated page for <strong>${postTitle}</strong>. We are currently preparing a comprehensive set of resources, insights, and guides for this section.
                      </p>
                      <div style="padding: 30px; background-color: #f7fafc; border-left: 4px solid ${aCol}; border-radius: 6px; margin: 35px 0;">
                        <h4 style="margin-top: 0; color: ${pCol}; font-size: 18px; margin-bottom: 10px; font-weight: 700;">Need immediate consultation?</h4>
                        <p style="margin-bottom: 15px; font-size: 14px; color: #4a5568; line-height: 1.6;">Our expert advisors are fully equipped to address your specific questions and design a custom solution tailored to your requirements.</p>
                        <a href="/book-a-call" style="display: inline-block; padding: 12px 24px; background-color: ${aCol}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; transition: background-color 0.2s;">Book a Call with Our Team</a>
                      </div>
                     </div>`
                  : `<div style="font-family: ${font}; font-size: 15px; line-height: 1.75; color: #2d3748;">${articleHtml}</div>`
              }
            }
          ]
        },
        // Right Column: Sidebar (30% width)
        {
          id: Math.random().toString(36).slice(2, 9),
          elType: "column",
          settings: { 
            _column_size: 30,
            background_color: "#f8f9fa",
            padding: { top: 30, right: 25, bottom: 30, left: 25, unit: "px" },
            border_radius: { size: 10, unit: "px" }
          },
          elements: [
            // About Agency Card
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "heading",
              settings: {
                title: "About Our Agency",
                header_size: "h4",
                title_color: pCol,
                typography_font_size: { size: 17, unit: "px" },
                typography_font_family: font,
                typography_font_weight: "700",
                margin: { bottom: 12 }
              }
            },
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "text-editor",
              settings: {
                editor: `<p style="font-size: 13px; color: #4a5568; line-height: 1.6; margin-bottom: 20px; font-family: ${font}">
                  We are an award-winning consulting agency dedicated to delivering high-impact, data-driven optimization campaigns that boost search rankings and double organic traffic.
                </p>`
              }
            },
            // Divider
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "spacer",
              settings: { space: { size: 15, unit: "px" } }
            },
            // Call CTA Box
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "column",
              settings: {
                background_color: pCol === "#111111" ? "#1e1e24" : pCol,
                padding: { top: 25, right: 20, bottom: 25, left: 20, unit: "px" },
                border_radius: { size: 8, unit: "px" }
              },
              elements: [
                {
                  id: Math.random().toString(36).slice(2, 9),
                  elType: "widget",
                  widgetType: "heading",
                  settings: {
                    title: "Ready to Scale?",
                    header_size: "h5",
                    title_color: "#ffffff",
                    typography_font_size: { size: 16, unit: "px" },
                    typography_font_family: font,
                    typography_font_weight: "700",
                    margin: { bottom: 8 }
                  }
                },
                {
                  id: Math.random().toString(36).slice(2, 9),
                  elType: "widget",
                  widgetType: "text-editor",
                  settings: {
                    editor: `<p style="font-size: 12px; color: #cbd5e1; line-height: 1.5; margin-bottom: 15px; font-family: ${font}">
                      Schedule a zero-obligation strategy session with our senior advisors today.
                    </p>`
                  }
                },
                {
                  id: Math.random().toString(36).slice(2, 9),
                  elType: "widget",
                  widgetType: "button",
                  settings: {
                    text: "BOOK A CALL",
                    link: { url: "/book-a-call" },
                    button_background_color: aCol,
                    button_text_color: pCol === "#111111" ? "#ffffff" : "#111111",
                    align: "center",
                    size: "sm"
                  }
                }
              ]
            }
          ]
        }
      ]
    });
    
    return tree;
  }

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

    // Local Helper to parse Accordion blocks
    const parseAccordion = (content: string, faqQuestions: string[] = [], defaultTitle: string = "Question") => {
      const items: { title: string; content: string }[] = [];
      // Split on **Q: or **Q: 
      const parts = content.split(/\*\*Q:\s*/i);
      const intro = parts[0]?.trim() || "";
      
      let questionIndex = 0;
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const starIdx = part.indexOf("**");
        if (starIdx === -1) continue;
        
        let title = part.substring(0, starIdx).trim();
        let body = part.substring(starIdx + 2).trim();
        
        // Clean up trailing divider lines and whitespace
        body = body.replace(/^-+\s*$/gm, "").trim();
        if (body.endsWith("---")) {
          body = body.slice(0, -3).trim();
        }

        const actualTitle = title || faqQuestions[questionIndex] || (questionIndex === 0 ? defaultTitle : `${defaultTitle} ${questionIndex + 1}`);
        questionIndex++;
        
        items.push({
          title: actualTitle,
          content: markdownToHtml(body, imageMap)
        });
      }
      return { intro, items };
    };

    // Local Helper to parse Contact details
    const parseContactInfo = (content: string) => {
      const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
      let address = "";
      let phone = "";
      let email = "";
      let hours = "";
      let formSlug = "contact";

      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes("address:") || lower.includes("st,") || lower.includes("street,") || lower.includes("road,")) {
          address = line.replace(/^[-\s✅]*address:\s*/i, "").replace(/^[-\s✅]*/, "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1").trim();
        }
        else if (lower.includes("phone:") || lower.includes("tel:") || lower.includes("call:") || (lower.includes("+") && /\d{5,}/.test(lower))) {
          phone = line.replace(/^[-\s✅]*(phone|tel|call):\s*/i, "").replace(/^[-\s✅]*/, "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1").trim();
        }
        else if (lower.includes("email:") || lower.includes("mail:") || lower.includes("@")) {
          const mailMatch = line.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
          if (mailMatch) email = mailMatch[1];
        }
        else if (lower.includes("hours:") || lower.includes("monday to") || lower.includes("working hours") || lower.includes("9-5") || lower.includes("9am")) {
          hours = line.replace(/^[-\s✅]*(hours|working hours):\s*/i, "").replace(/^[-\s✅]*/, "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1").trim();
        }
        else if (lower.includes("📋") || lower.includes("form")) {
          const formMatch = line.match(/📋\s*\*\*([^*]+)\*\*/i) || line.match(/form:\s*([a-zA-Z0-9_-]+)/i);
          if (formMatch) formSlug = slugify(formMatch[1]);
        }
      });

      return { address, phone, email, hours, formSlug };
    };

    // Local Helper to parse Carousel blocks
    const parseCarousel = (content: string) => {
      const slides: { image: string; heading: string; description: string; button_text: string; button_url: string }[] = [];
      const slideRegex = /\*\*Slide\s*(\d+):\*\*/gi;
      const parts = content.split(slideRegex);
      const intro = parts[0]?.trim().replace(/🎠\s*Carousel\s*\/\s*Slider/gi, "").trim() || "";
      
      for (let i = 1; i < parts.length; i += 2) {
        const slideContent = parts[i + 1] || "";
        const lines = slideContent.split("\n").map(l => l.trim()).filter(Boolean);
        let image = "";
        let heading = "";
        let description = "";
        let button_text = "";
        let button_url = "";
        
        lines.forEach(line => {
          const imgMatch = line.match(/!\[[^\]]*\]\(([^)]+)\)/);
          if (imgMatch) {
            image = resolveImage(imgMatch[1]);
          } else if (line.toLowerCase().startsWith("- heading:")) {
            heading = line.replace(/^[-\s]*heading:\s*/i, "").trim();
          } else if (line.toLowerCase().startsWith("- description:")) {
            description = line.replace(/^[-\s]*description:\s*/i, "").trim();
          } else if (line.toLowerCase().startsWith("- button:")) {
            const btnMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (btnMatch) {
              button_text = btnMatch[1];
              button_url = btnMatch[2];
            }
          }
        });
        slides.push({ image, heading, description, button_text, button_url });
      }
      return { intro, slides };
    };

    // FAQ / Accordion Section Check
    const isFaqSection = sec.title.toLowerCase().includes("faq") || 
                        sec.title.toLowerCase().includes("frequently asked questions") || 
                        sec.content.toLowerCase().includes("frequently asked questions") ||
                        sec.content.includes("**Q:");
    if (sec.content.toLowerCase().includes("accordion tab") || isFaqSection) {
      const sectionTitle = headers[0] || sec.title;
      const { intro, items } = parseAccordion(
        sec.content, 
        isFaqSection ? (page.faqQuestions || []) : [], 
        sectionTitle
      );
      
      tree.push({
        id: sectionId,
        elType: "section",
        settings: {
          background_color: "#f8f9fa",
          padding: { top: 75, bottom: 75, unit: "px" }
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
                  typography_font_size: { size: 32, unit: "px" },
                  typography_font_family: font,
                  typography_font_weight: "800",
                  align: "center",
                  margin: { bottom: 15 }
                }
              },
              intro && {
                id: Math.random().toString(36).slice(2, 9),
                elType: "widget",
                widgetType: "text-editor",
                settings: {
                  editor: `<p style="font-size: 15px; color: #666; text-align: center; max-width: 650px; margin: 0 auto 35px; font-family: ${font}">${intro}</p>`
                }
              },
              {
                id: Math.random().toString(36).slice(2, 9),
                elType: "widget",
                widgetType: "accordion",
                settings: { items }
              }
            ].filter(Boolean) as any[]
          }
        ]
      });
      return;
    }

    // Contact Section Check
    const isContactSection = sec.title.toLowerCase().includes("contact") || 
                            sec.title.toLowerCase().includes("get in touch") || 
                            sec.content.includes("📋");
    if (isContactSection) {
      const sectionTitle = headers[0] || sec.title;
      const { address, phone, email, hours, formSlug } = parseContactInfo(sec.content);
      const subtitle = paragraphs.join(" ");

      tree.push({
        id: sectionId,
        elType: "section",
        settings: {
          background_color: "#ffffff",
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
                widgetType: "contact-section",
                settings: {
                  title: sectionTitle,
                  subtitle,
                  address,
                  phone,
                  email,
                  hours,
                  formSlug
                }
              }
            ]
          }
        ]
      });
      return;
    }

    // Blog / Latest Posts Section Check
    const isBlogSection = sec.title.toLowerCase().includes("news") || 
                         sec.title.toLowerCase().includes("updates") || 
                         sec.title.toLowerCase().includes("blog") ||
                         sec.title.toLowerCase().includes("insights");
    if (isBlogSection) {
      const sectionTitle = headers[0] || sec.title;
      const subtitle = paragraphs.join(" ");

      tree.push({
        id: sectionId,
        elType: "section",
        settings: {
          background_color: "#f8f9fa",
          padding: { top: 75, bottom: 75, unit: "px" }
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
                widgetType: "blog-section",
                settings: {
                  title: sectionTitle,
                  subtitle,
                  limit: 3
                }
              }
            ]
          }
        ]
      });
      return;
    }

    // Carousel / Slider Section Check
    if (sec.content.toLowerCase().includes("carousel") || sec.content.toLowerCase().includes("slide 1:")) {
      const { intro, slides } = parseCarousel(sec.content);
      const sectionTitle = headers[0] || sec.title;
      
      tree.push({
        id: sectionId,
        elType: "section",
        settings: {
          background_color: "#ffffff",
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
                  typography_font_size: { size: 32, unit: "px" },
                  typography_font_family: font,
                  typography_font_weight: "800",
                  align: "center",
                  margin: { bottom: 15 }
                }
              },
              intro && {
                id: Math.random().toString(36).slice(2, 9),
                elType: "widget",
                widgetType: "text-editor",
                settings: {
                  editor: `<p style="font-size: 15px; color: #666; text-align: center; max-width: 650px; margin: 0 auto 30px; font-family: ${font}">${intro}</p>`
                }
              },
              {
                id: Math.random().toString(36).slice(2, 9),
                elType: "widget",
                widgetType: "carousel",
                settings: { slides }
              }
            ].filter(Boolean) as any[]
          }
        ]
      });
      return;
    }
// Video / Embed Section Check
if (sec.content.toLowerCase().includes('iframe') || sec.content.match(/\[video\s/)) {
  const video = parseVideo(sec.content);
  if (video) {
    const sectionTitle = headers[0] || sec.title;
    tree.push({
      id: sectionId,
      elType: "section",
      settings: {
        background_color: "#ffffff",
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
                typography_font_size: { size: 32, unit: "px" },
                typography_font_family: font,
                typography_font_weight: "800",
                align: "center",
                margin: { bottom: 15 }
              }
            },
            {
              id: Math.random().toString(36).slice(2, 9),
              elType: "widget",
              widgetType: "video",
              settings: { src: video.src, title: video.title }
            }
          ]
        }
      ]
    });
    return;
  }
}

// Gallery Section Check
if (parseGallery(sec.content)) {
  const gallery = parseGallery(sec.content)!;
  const sectionTitle = headers[0] || sec.title;
  const slides = gallery.images.map((img) => ({
    image: img,
    heading: "",
    description: "",
    button_text: "",
    button_url: ""
  }));
  tree.push({
    id: sectionId,
    elType: "section",
    settings: {
      background_color: "#ffffff",
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
              typography_font_size: { size: 32, unit: "px" },
              typography_font_family: font,
              typography_font_weight: "800",
              align: "center",
              margin: { bottom: 15 }
            }
          },
          {
            id: Math.random().toString(36).slice(2, 9),
            elType: "widget",
            widgetType: "gallery",
            settings: { images: gallery.images }
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
  logoUrl: string | null,
  navLinks?: NavLink[]
): any[] {
  const linksHtml = navLinks && navLinks.length > 0
    ? navLinks.map(l => `<a href="${rewriteImportedUrl(l.url)}" style="text-decoration:none; color:#333; font-family:${branding.font}">${l.label}</a>`).join("\n")
    : `<a href="/seo" style="text-decoration:none; color:#333;">SEO</a>
       <a href="/ppc" style="text-decoration:none; color:#333;">PPC</a>
       <a href="/about" style="text-decoration:none; color:#333;">About</a>
       <a href="/contact" style="text-decoration:none; color:#333;">Contact Us</a>`;

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
                  ${linksHtml}
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
  logoUrl: string | null,
  navLinks?: NavLink[]
): any[] {
  const linksHtml = navLinks && navLinks.length > 0
    ? navLinks.map(l => `<li><a href="${rewriteImportedUrl(l.url)}" style="color:#aaa; text-decoration:none; font-family:${branding.font}">${l.label}</a></li>`).join("\n")
    : `<li><a href="#" style="color:#aaa; text-decoration:none;">Meet The Team</a></li>
       <li><a href="#" style="color:#aaa; text-decoration:none;">Why Pearl Lemon</a></li>
       <li><a href="#" style="color:#aaa; text-decoration:none;">We're Hiring!</a></li>
       <li><a href="#" style="color:#aaa; text-decoration:none;">B2B Lead Generation</a></li>`;

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
                  ${linksHtml}
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

  const site_id = siteId || "default";

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

      // Catalog in Media Library
      try {
        await supabase.from("media_meta").insert({
          site_id: site_id,
          media_url: pub.publicUrl,
          file_name: filename,
          mime_type: contentType,
          size_bytes: blob.size,
          source: "cloud",
          folder: "imported",
        });

        await supabase.from("media_library").insert({
          site_id: site_id,
          file_url: pub.publicUrl,
          file_name: filename,
          file_size: blob.size,
          mime_type: contentType,
        });
      } catch (dbErr) {
        console.warn(`Failed to catalog extracted ZIP image:`, dbErr);
      }
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
  const mdTexts: string[] = [];
  const filesToParse: { path: string; filename: string; type: "page" | "post" }[] = [];

  // Extract Logo Url & Navigation Links
  let globalLogoUrl: string | null = null;
  let globalHeaderLinks: NavLink[] = [];
  let globalFooterLinks: NavLink[] = [];

  for (const path of mdPageFiles) {
    try {
      const md = await zip.files[path].async("string");
      mdTexts.push(md);
      filesToParse.push({ path, filename: path.split("/").pop() || "page.md", type: "page" });
    } catch (e) {
      result.failed++;
      result.errors.push(`Page load failed (${path}): ${(e as Error).message}`);
    }
  }

  for (const path of mdPostFiles) {
    try {
      const md = await zip.files[path].async("string");
      mdTexts.push(md);
      filesToParse.push({ path, filename: path.split("/").pop() || "post.md", type: "post" });
    } catch (e) {
      result.failed++;
      result.errors.push(`Post load failed (${path}): ${(e as Error).message}`);
    }
  }

  // Download and cache remote media files referenced in the markdown content
  if (mdTexts.length > 0) {
    await downloadAndMapRemoteImages(mdTexts, imageMap, onProgress, site_id, userId);
  }

  onProgress?.("Parsing content and generating layouts…");
  for (const item of filesToParse) {
    try {
      const md = await zip.files[item.path].async("string");
      const parsed = parseMarkdownPage(item.filename, md, item.type);
      parsedPages.push(parsed);
      
      if (parsed.logoUrl && !globalLogoUrl) {
        globalLogoUrl = parsed.logoUrl;
      }
      if (parsed.headerLinks && parsed.headerLinks.length > 0 && globalHeaderLinks.length === 0) {
        globalHeaderLinks = parsed.headerLinks;
      }
      if (parsed.footerLinks && parsed.footerLinks.length > 0 && globalFooterLinks.length === 0) {
        globalFooterLinks = parsed.footerLinks;
      }
    } catch (e) {
      result.failed++;
      result.errors.push(`${item.type === "page" ? "Page" : "Post"} parse failed (${item.path}): ${(e as Error).message}`);
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
    const headerTree = generatePremiumHeaderTemplate(branding, globalLogoUrl, globalHeaderLinks);
    await supabase.from("elementor_templates").upsert({
      source_id: "global-header-layout",
      kind: "header",
      title: "Global Header Template",
      slug: "global-header",
      data: headerTree as any,
      source: "elementor",
      imported_by: userId,
    }, { onConflict: "source_id" });

    const footerTree = generatePremiumFooterTemplate(branding, globalLogoUrl, globalFooterLinks);
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

  for (const page of parsedPages) {
    try {
      const visualTree = generateVisualTree(page, branding, imageMap);
      const featuredImage = resolveImageUrl(page.featuredImage, imageMap);

      const fullHtml = page.sections.map((s, sIdx) => {
        const sectionContentHtml = markdownToHtml(s.content, imageMap);
        if (s.title === "Hero" || sIdx === 0) {
          return sectionContentHtml;
        }
        return `<h2>${s.title}</h2>\n${sectionContentHtml}`;
      }).join("\n");

      const row = {
        site_id,
        title: page.title,
        slug: page.slug,
        excerpt: page.metaDescription || `Discover details about ${page.title}.`,
        body: fullHtml,
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
            body: fullHtml,
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
    const imageMap = new Map<string, string>();

    // Download and cache remote media files referenced in this single file
    await downloadAndMapRemoteImages([mdText], imageMap, onProgress, siteId || "default", userId);

    onProgress?.("Parsing Markdown file…");
    const filename = file.name;
    const isPost = filename.toLowerCase().includes("post") || filename.toLowerCase().includes("blog") || filename.toLowerCase().startsWith("p-");
    const type = isPost ? "post" : "page";

    const parsedPage = parseMarkdownPage(filename, mdText, type);

    onProgress?.("Generating premium visual layout…");
    const visualTree = generateVisualTree(parsedPage, branding, imageMap);
    
    const site_id = siteId || "default";
    const featuredImage = parsedPage.featuredImage || "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80";

    const fullHtml = parsedPage.sections.map((s, sIdx) => {
      const sectionContentHtml = markdownToHtml(s.content, imageMap);
      if (s.title === "Hero" || sIdx === 0) {
        return sectionContentHtml;
      }
      return `<h2>${s.title}</h2>\n${sectionContentHtml}`;
    }).join("\n");

    const row = {
      site_id,
      title: parsedPage.title,
      slug: parsedPage.slug,
      excerpt: parsedPage.metaDescription || `Discover details about ${parsedPage.title}.`,
      body: fullHtml,
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
          body: fullHtml,
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
