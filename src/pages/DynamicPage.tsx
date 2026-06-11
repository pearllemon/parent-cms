import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "@/components/site/Layout";
import { fetchPostBySlug, fetchPosts, type ParentPost } from "@/lib/parent";
import ElementorRenderer from "@/components/elementor/ElementorRenderer";
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
      const direct = await fetchPostBySlug(slug);
      if (cancel) return;
      if (direct && direct.type === "page") {
        setPost(direct);
        setLoading(false);
        return;
      }
      const pages = await fetchPosts({ type: "page", limit: 200 });
      if (cancel) return;
      const match = pages?.posts.find((p) => p.slug === slug);
      if (match) setPost(match);
      else setNotFound(true);
      setLoading(false);
    })();

    return () => { cancel = true; };
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    document.title = post.meta_title || post.title;
    if (post.meta_description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
      }
      m.setAttribute("content", post.meta_description);
    }
  }, [post]);

  if (notFound) return <NotFound />;
  if (loading || !post) {
    return (
      <Layout>
        <div className="container py-32 text-center text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  const hasElementor =
    Array.isArray(post.elementor_data) && (post.elementor_data as unknown[]).length > 0;

  if (hasElementor && post.render_mode !== "template") {
    return (
      <Layout>
        <article>
          <ElementorRenderer data={post.elementor_data} />
        </article>
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
