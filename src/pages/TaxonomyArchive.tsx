// Public archive page for any taxonomy term: /:taxonomy/:slug
// Resolves the taxonomy + term, fetches matching posts (parent + entry_terms),
// and emits SEO meta + canonical + JSON-LD.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import Layout from "@/components/site/Layout";
import { fetchPosts, type ParentPost } from "@/lib/parent";
import { supabase } from "@/integrations/supabase/client";
import { getTaxonomyBySlug, getTermBySlug, type Taxonomy, type TaxonomyTerm } from "@/lib/taxonomies";
import { Calendar, ArrowRight, ArrowLeft } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// Reserved top-level paths that must never be treated as taxonomy slugs.
const RESERVED = new Set([
  "admin", "blog", "about", "contact", "book-a-call", "press", "books",
  "privacy", "terms", "services", "p", "author",
]);

export default function TaxonomyArchive() {
  const { taxonomy: taxSlug = "", slug = "" } = useParams();
  const [tax, setTax] = useState<Taxonomy | null>(null);
  const [term, setTerm] = useState<TaxonomyTerm | null>(null);
  const [posts, setPosts] = useState<ParentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!taxSlug || !slug || RESERVED.has(taxSlug)) { setNotFound(true); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setNotFound(false);
      const t = await getTaxonomyBySlug(taxSlug);
      if (!t) { if (!cancelled) { setNotFound(true); setLoading(false); } return; }
      const term = await getTermBySlug(t.id, slug);
      if (!term) { if (!cancelled) { setNotFound(true); setLoading(false); } return; }
      if (cancelled) return;
      setTax(t); setTerm(term);

      // Sources of matching posts:
      // 1) parent fetchPosts with category/tag for legacy taxonomies
      // 2) entry_terms rows for any taxonomy
      let matched: ParentPost[] = [];
      if (taxSlug === "category" || taxSlug === "tag") {
        const data = await fetchPosts({
          limit: 60,
          type: "post",
          ...(taxSlug === "category" ? { category: slug } : { tag: slug }),
        });
        matched = (data?.posts || []).filter((p) =>
          taxSlug === "category"
            ? p.categories?.some((c) => c.slug === slug)
            : p.tags?.some((x) => x.slug === slug),
        );
      }

      // Entry-terms join (works for any taxonomy)
      const { data: rows } = await db
        .from("entry_terms")
        .select("entry_type, entry_id")
        .eq("term_id", term.id);

      const postIds = (rows || [])
        .filter((r: { entry_type: string }) => r.entry_type === "post" || r.entry_type === "page")
        .map((r: { entry_id: string }) => r.entry_id);

      if (postIds.length) {
        // Fetch each by slug/id via parent endpoint best-effort.
        const extras = await Promise.all(
          postIds.map(async (id: string) => {
            const data = await fetchPosts({ limit: 1, slug: id });
            return data?.posts?.[0] || null;
          }),
        );
        const dedup = new Map<string, ParentPost>();
        [...matched, ...extras.filter(Boolean) as ParentPost[]].forEach((p) => dedup.set(p.id, p));
        matched = Array.from(dedup.values());
      }

      if (!cancelled) { setPosts(matched); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [taxSlug, slug]);

  // SEO meta
  useEffect(() => {
    if (!term || !tax) return;
    const title = term.seo_title || `${term.name} — ${tax.label_singular}`;
    const desc = term.seo_description || term.description || `Browse ${posts.length} ${tax.label_singular.toLowerCase()} posts in ${term.name}.`;
    const canonical = term.canonical_url || `${window.location.origin}/${tax.slug}/${term.slug}`;

    document.title = title;
    setMeta("description", desc);
    setMeta("og:title", title, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", canonical, "property");
    if (term.og_image) setMeta("og:image", term.og_image, "property");
    setMeta("twitter:card", "summary_large_image", "name");
    setLinkRel("canonical", canonical);

    // JSON-LD: CollectionPage + breadcrumb + optional custom
    const ld = term.schema_json || {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description: desc,
      url: canonical,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: posts.length,
        itemListElement: posts.slice(0, 20).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${window.location.origin}/blog/${p.slug}`,
          name: p.title,
        })),
      },
    };
    setJsonLd("taxonomy-archive", ld);
    return () => removeJsonLd("taxonomy-archive");
  }, [term, tax, posts]);

  if (notFound) return <Navigate to="/404" replace />;

  return (
    <Layout>
      <section className="bg-gradient-hero">
        <div className="container py-16 max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">
            {tax?.label_singular || taxSlug}
          </span>
          <h1 className="font-display text-4xl md:text-5xl mt-3 leading-tight">
            {term?.name || slug.replace(/-/g, " ")}
          </h1>
          {term?.description && (
            <p className="mt-4 text-muted-foreground max-w-2xl">{term.description}</p>
          )}
        </div>
      </section>

      <section className="bg-background">
        <div className="container py-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && <div className="col-span-full text-center text-muted-foreground py-12">Loading…</div>}
          {!loading && posts.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-12">No posts here yet.</div>
          )}
          {posts.map((p) => {
            const date = p.published_at || p.publish_date;
            return (
              <Link
                to={`/blog/${p.slug}`}
                key={p.id}
                className="group block lift rounded-2xl overflow-hidden bg-card border border-border shadow-soft"
              >
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  {p.featured_image_url ? (
                    <img src={p.featured_image_url} alt={p.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-mint to-primary/10" />
                  )}
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-display text-lg leading-snug group-hover:text-primary transition-colors line-clamp-3">{p.title}</h3>
                  <div className="flex items-center justify-between pt-2 text-sm">
                    <span className="text-muted-foreground inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {date ? new Date(date).toLocaleDateString() : ""}
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary font-medium">
                      Read More <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </Layout>
  );
}

function setMeta(key: string, value: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", value);
}
function setLinkRel(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
  el.setAttribute("href", href);
}
function setJsonLd(id: string, data: unknown) {
  removeJsonLd(id);
  const el = document.createElement("script");
  el.type = "application/ld+json";
  el.id = `ld-${id}`;
  el.text = JSON.stringify(data);
  document.head.appendChild(el);
}
function removeJsonLd(id: string) {
  document.getElementById(`ld-${id}`)?.remove();
}
