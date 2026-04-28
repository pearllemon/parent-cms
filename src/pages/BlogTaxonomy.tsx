import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/site/Layout";
import { fetchPosts, type ParentPost } from "@/lib/parent";
import { Calendar, ArrowRight, ArrowLeft } from "lucide-react";

type Mode = "category" | "tag";

const BlogTaxonomy = ({ mode }: { mode: Mode }) => {
  const { slug } = useParams();
  const [posts, setPosts] = useState<ParentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchPosts({
      limit: 60,
      type: "post",
      ...(mode === "category" ? { category: slug } : { tag: slug }),
    }).then((data) => {
      // Defensive client-side filter — some parent revisions only filter server-side.
      const filtered = (data?.posts || []).filter((p) =>
        mode === "category"
          ? p.categories?.some((c) => c.slug === slug)
          : p.tags?.some((t) => t.slug === slug),
      );
      setPosts(filtered.length ? filtered : data?.posts || []);
      setLoading(false);
    });
  }, [slug, mode]);

  return (
    <Layout>
      <section className="bg-gradient-hero">
        <div className="container py-16 max-w-4xl">
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4" /> All posts
          </Link>
          <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">
            {mode === "category" ? "Category" : "Tag"}
          </span>
          <h1 className="font-display text-4xl md:text-5xl mt-3 leading-tight">
            {mode === "tag" ? "#" : ""}
            {slug?.replace(/-/g, " ")}
          </h1>
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
                  <h3 className="font-display text-lg leading-snug group-hover:text-primary transition-colors line-clamp-3">
                    {p.title}
                  </h3>
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
};

export default BlogTaxonomy;
