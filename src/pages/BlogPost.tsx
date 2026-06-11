import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/site/Layout";
import { Calendar, ArrowLeft, Tag as TagIcon } from "lucide-react";
import { fetchPostBySlug, type ParentPost } from "@/lib/parent";
import CachedImage from "@/components/CachedImage";
import { useSEO } from "@/lib/seo";
import { usePostSeoOverride } from "@/lib/usePostSeoOverride";
import NotFound from "./NotFound";

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<ParentPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    setLoading(true);
    setNotFound(false);
    fetchPostBySlug(slug).then((p) => {
      if (cancel) return;
      if (!p) setNotFound(true);
      else setPost(p);
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [slug]);

  const seoOverride = usePostSeoOverride(post?.slug);

  // SEO — apply once `post` is loaded. Custom SEO override layered on top.
  useSEO(
    post
      ? {
          title: seoOverride?.seo_title || post.meta_title || post.title,
          description: seoOverride?.seo_description || post.meta_description || (post.excerpt || "").replace(/<[^>]+>/g, "").slice(0, 240),
          canonical: seoOverride?.canonical_url || post.canonical_url || `/blog/${post.slug}`,
          type: "article",
          image: seoOverride?.social?.og_image || post.featured_image_url || undefined,
          jsonLd: (seoOverride?.schema_json && seoOverride.schema_json.length)
            ? seoOverride.schema_json
            : {
                "@context": "https://schema.org",
                "@type": "Article",
                headline: post.title,
                image: post.featured_image_url || undefined,
                datePublished: post.published_at || post.publish_date || undefined,
                dateModified: (post as any).updated_at || undefined,
                author: {
                  "@type": "Person",
                  name: typeof post.author === "string" ? post.author : (post.author as any)?.name || "Deepak Shukla",
                },
                description: post.meta_description || (post.excerpt || "").replace(/<[^>]+>/g, "").slice(0, 240),
                mainEntityOfPage: typeof window !== "undefined" ? `${window.location.origin}/blog/${post.slug}` : `/blog/${post.slug}`,
              },
        }
      : null,
  );

  if (notFound) return <NotFound />;
  if (loading || !post) {
    return (
      <Layout>
        <div className="container py-32 text-center text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  const date = post.published_at || post.publish_date;
  const body = post.body || post.content || "";

  return (
    <Layout>
      <article className="bg-background">
        <header className="bg-gradient-hero border-b border-border">
          <div className="container py-16 md:py-20 max-w-3xl">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Back to blog
            </Link>
            {post.categories?.[0] && (
              <Link
                to={`/blog/category/${post.categories[0].slug}`}
                className="inline-block bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full mb-4"
              >
                {post.categories[0].name}
              </Link>
            )}
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight text-balance">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-6">
              {date && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
              {post.author && (
                <span>by {typeof post.author === "string" ? post.author : post.author?.name}</span>
              )}
            </div>
          </div>
        </header>

        {post.featured_image_url && (
          <div className="container max-w-4xl -mt-8 md:-mt-12 relative z-10">
            <CachedImage
              src={post.featured_image_url}
              alt={post.title}
              className="w-full aspect-[16/9] object-cover rounded-2xl shadow-soft border border-border"
            />
          </div>
        )}

        <div className="container py-12 md:py-16 max-w-3xl">
          <div
            className="prose prose-lg prose-neutral max-w-none prose-headings:font-display prose-headings:text-foreground prose-a:text-primary prose-img:rounded-xl prose-img:my-8"
            dangerouslySetInnerHTML={{ __html: body }}
          />

          {(post.tags?.length ?? 0) > 0 && (
            <div className="mt-12 pt-8 border-t border-border flex items-center gap-2 flex-wrap">
              <TagIcon className="w-4 h-4 text-muted-foreground" />
              {post.tags!.map((t) => (
                <Link
                  key={t.slug}
                  to={`/blog/tag/${t.slug}`}
                  className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition"
                >
                  #{t.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </article>
    </Layout>
  );
};

export default BlogPost;
