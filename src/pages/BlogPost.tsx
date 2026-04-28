import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/site/Layout";
import { Calendar, ArrowLeft, Tag as TagIcon } from "lucide-react";
import { fetchPostBySlug, type ParentPost } from "@/lib/parent";
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

  // SEO
  useEffect(() => {
    if (!post) return;
    document.title = post.meta_title || post.title;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    if (post.meta_description) setMeta("description", post.meta_description);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = post.canonical_url || window.location.href;

    // JSON-LD
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      image: post.featured_image_url,
      datePublished: post.published_at || post.publish_date,
      author: { "@type": "Person", name: typeof post.author === "string" ? post.author : post.author?.name || "Deepak Shukla" },
      description: post.meta_description || post.excerpt,
    });
    document.head.appendChild(ld);
    return () => {
      ld.remove();
    };
  }, [post]);

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
            <img
              src={post.featured_image_url}
              alt={post.title}
              loading="lazy"
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
