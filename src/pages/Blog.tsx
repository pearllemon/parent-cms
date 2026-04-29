import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/site/Layout";
import { Calendar, ArrowRight } from "lucide-react";
import { fetchPosts, type ParentPost } from "@/lib/parent";
import CachedImage from "@/components/CachedImage";

const PAGE_SIZE = 30;

const Blog = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page") || "1"));
  const [posts, setPosts] = useState<ParentPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetchPosts({ page, limit: PAGE_SIZE, type: "post" }).then((data) => {
      if (cancel) return;
      setPosts(data?.posts || []);
      setTotal(data?.total || 0);
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Layout>
      <section className="bg-gradient-hero">
        <div className="container py-20 md:py-24 max-w-4xl">
          <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Blog</span>
          <h1 className="font-display text-5xl md:text-6xl mt-3 leading-tight text-balance">
            Notes from the <span className="text-primary">field.</span>
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl">
            Business, life, relationships, books, and the lessons I keep learning the hard way.
          </p>
        </div>
      </section>

      <section className="bg-background">
        <div className="container py-16">
          {loading && (
            <div className="text-center py-20 text-muted-foreground">Loading posts…</div>
          )}

          {!loading && posts.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              No posts published yet.
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p) => {
              const cat = p.categories?.[0];
              const date = p.published_at || p.publish_date;
              return (
                <Link
                  to={`/blog/${p.slug}`}
                  key={p.id}
                  className="group block lift rounded-2xl overflow-hidden bg-card border border-border shadow-soft"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    {p.featured_image_url ? (
                      <CachedImage
                        src={p.featured_image_url}
                        alt={p.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-mint to-primary/10" />
                    )}
                  </div>
                  <div className="p-6 space-y-3">
                    {cat && (
                      <Link
                        to={`/blog/category/${cat.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-block bg-mint text-mint-foreground text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      >
                        {cat.name}
                      </Link>
                    )}
                    <h3 className="font-display text-lg leading-snug group-hover:text-primary transition-colors line-clamp-3">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{p.excerpt.replace(/<[^>]+>/g, "")}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 text-sm">
                      <span className="text-muted-foreground inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {date ? new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""}
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

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-16" aria-label="Pagination">
              <button
                disabled={page === 1}
                onClick={() => setParams({ page: String(page - 1) })}
                className="px-4 py-2 rounded-lg border disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setParams({ page: String(page + 1) })}
                className="px-4 py-2 rounded-lg border disabled:opacity-40"
              >
                Next →
              </button>
            </nav>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
