import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "@/components/site/Layout";
import { fetchPostBySlug, fetchPosts, type ParentPost } from "@/lib/parent";
import NotFound from "./NotFound";

const DynamicPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<ParentPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    setLoading(true);
    setNotFound(false);

    (async () => {
      // Fetch the slug; ensure it's a page (not a post)
      const direct = await fetchPostBySlug(slug);
      if (cancel) return;
      if (direct && direct.type === "page") {
        setPost(direct);
        setLoading(false);
        return;
      }
      // Fallback: pull pages list and match
      const pages = await fetchPosts({ type: "page", limit: 100 });
      if (cancel) return;
      const match = pages?.posts.find((p) => p.slug === slug);
      if (match) setPost(match);
      else setNotFound(true);
      setLoading(false);
    })();

    return () => {
      cancel = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    document.title = post.meta_title || post.title;
  }, [post]);

  if (notFound) return <NotFound />;
  if (loading || !post) {
    return (
      <Layout>
        <div className="container py-32 text-center text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  const body = post.body || post.content || "";

  return (
    <Layout>
      <section className="bg-gradient-hero border-b">
        <div className="container py-16 md:py-20 max-w-3xl">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight text-balance">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-muted-foreground mt-4 text-lg">
              {post.excerpt.replace(/<[^>]+>/g, "")}
            </p>
          )}
        </div>
      </section>
      <div className="container py-12 md:py-16 max-w-3xl">
        <div
          className="prose prose-lg prose-neutral max-w-none prose-headings:font-display prose-a:text-primary prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </div>
    </Layout>
  );
};

export default DynamicPage;
