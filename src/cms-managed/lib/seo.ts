// Reusable per-route SEO hook for an SPA.
// Sets document.title and head meta tags (description, canonical, og:*,
// twitter:*) and optionally appends a JSON-LD script. All injected tags
// are removed on unmount/route change so navigations don't leak stale
// metadata. Falls back to the static defaults from index.html.

import { useEffect } from "react";

export type SEOInput = {
  title?: string;
  description?: string;
  canonical?: string; // absolute or relative path
  image?: string;
  type?: "website" | "article" | "profile";
  /** Schema.org JSON-LD object (or array of objects). */
  jsonLd?: Record<string, any> | Record<string, any>[];
  /** Set to true to hide from search engines. */
  noindex?: boolean;
};

const MARK = "data-route-seo";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  const created = !el;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  if (created) el.setAttribute(MARK, "1");
  return el;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  const created = !el;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  if (created) el.setAttribute(MARK, "1");
  return el;
}

function absoluteUrl(maybe?: string): string | undefined {
  if (!maybe) return undefined;
  if (/^https?:\/\//i.test(maybe)) return maybe;
  if (typeof window === "undefined") return maybe;
  try {
    return new URL(maybe, window.location.origin).toString();
  } catch {
    return maybe;
  }
}

export function useSEO(input: SEOInput | null | undefined) {
  useEffect(() => {
    if (!input) return;
    const prevTitle = document.title;
    const ldNodes: HTMLScriptElement[] = [];
    const mutatedExisting: Array<{ el: Element; attr: string; prev: string | null }> = [];

    const safeSet = (el: Element, attr: string, val: string) => {
      if (!el.hasAttribute(MARK)) {
        mutatedExisting.push({ el, attr, prev: el.getAttribute(attr) });
      }
      el.setAttribute(attr, val);
    };

    if (input.title) document.title = input.title;

    if (input.description) {
      const el = upsertMeta("name", "description", input.description);
      safeSet(el, "content", input.description);
      const og = upsertMeta("property", "og:description", input.description);
      safeSet(og, "content", input.description);
      const tw = upsertMeta("name", "twitter:description", input.description);
      safeSet(tw, "content", input.description);
    }

    if (input.title) {
      const og = upsertMeta("property", "og:title", input.title);
      safeSet(og, "content", input.title);
      const tw = upsertMeta("name", "twitter:title", input.title);
      safeSet(tw, "content", input.title);
    }

    if (input.type) {
      const el = upsertMeta("property", "og:type", input.type);
      safeSet(el, "content", input.type);
    }

    const url = absoluteUrl(input.canonical) || window.location.href;
    {
      const el = upsertLink("canonical", url);
      safeSet(el, "href", url);
      const og = upsertMeta("property", "og:url", url);
      safeSet(og, "content", url);
    }

    if (input.image) {
      const abs = absoluteUrl(input.image)!;
      const og = upsertMeta("property", "og:image", abs);
      safeSet(og, "content", abs);
      const tw = upsertMeta("name", "twitter:image", abs);
      safeSet(tw, "content", abs);
    }

    if (input.noindex) {
      const el = upsertMeta("name", "robots", "noindex, nofollow");
      safeSet(el, "content", "noindex, nofollow");
    }

    if (input.jsonLd) {
      const blocks = Array.isArray(input.jsonLd) ? input.jsonLd : [input.jsonLd];
      for (const block of blocks) {
        const s = document.createElement("script");
        s.type = "application/ld+json";
        s.text = JSON.stringify(block);
        s.setAttribute(MARK, "1");
        document.head.appendChild(s);
        ldNodes.push(s);
      }
    }

    return () => {
      document.title = prevTitle;
      // Revert any mutations to pre-existing tags
      for (const m of mutatedExisting) {
        if (m.prev === null) m.el.removeAttribute(m.attr);
        else m.el.setAttribute(m.attr, m.prev);
      }
      // Remove any tags we appended for this route
      ldNodes.forEach((n) => n.remove());
    };
    // Use JSON to avoid re-running on identical inputs each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input)]);
}
