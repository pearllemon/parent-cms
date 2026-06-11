// Public author archive page at /author/:slug.
// Lists posts attributed to the author (best-effort match against
// author name or id on parent posts / imported posts).

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async" as any;
import { supabase as cloud } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Layout from "@/components/site/Layout";

type Author = {
  id: string; slug: string; name: string; job_title: string | null;
  bio: string | null; profile_image_url: string | null;
  social: Record<string, string>; seo: Record<string, any>;
  archive_enabled: boolean;
};

type Post = { id: string; title: string; slug: string; excerpt?: string | null; published_at?: string | null; type?: string };

export default function AuthorArchive() {
  const { slug } = useParams();
  const [author, setAuthor] = useState<Author | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: a } = await (cloud.from("authors" as any) as any).select("*").eq("slug", slug).maybeSingle();
      if (!a || !(a as any).archive_enabled) { setNotFound(true); setLoading(false); return; }
      setAuthor(a as Author);
      // Pull posts by name match (parent CMS) — best-effort
      const { data: pp } = await parent.from("posts").select("id,title,slug,excerpt,publish_date,type")
        .ilike("author", `%${(a as any).name}%`).order("publish_date", { ascending: false }).limit(50);
      setPosts(((pp as any) || []).map((p: any) => ({ ...p, published_at: p.publish_date })));
      setLoading(false);
    })();
  }, [slug]);

  const title = useMemo(() => author?.seo?.title || `${author?.name} — Author`, [author]);
  const desc = useMemo(() => author?.seo?.description || author?.bio || `Articles by ${author?.name}`, [author]);

  if (notFound) return <Layout><div className="container py-20 text-center"><h1 className="font-display text-3xl">Author not found</h1></div></Layout>;

  return (
    <Layout>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={(desc || "").slice(0, 160)} />
        <link rel="canonical" href={`/author/${slug}`} />
      </Helmet>
      <section className="container py-12 max-w-4xl">
        {loading || !author ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <>
            <header className="flex items-center gap-6 border-b pb-8">
              <Avatar className="w-24 h-24">
                <AvatarImage src={author.profile_image_url || undefined} />
                <AvatarFallback>{author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-display text-4xl">{author.name}</h1>
                {author.job_title && <p className="text-muted-foreground">{author.job_title}</p>}
                {author.bio && <p className="mt-3 max-w-2xl">{author.bio}</p>}
                <div className="flex gap-3 mt-3">
                  {Object.entries(author.social || {}).filter(([, v]) => v).map(([k, v]) => (
                    <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline capitalize">{k}</a>
                  ))}
                </div>
              </div>
            </header>

            <h2 className="font-display text-2xl mt-10 mb-4">Articles</h2>
            {posts.length === 0 ? (
              <p className="text-muted-foreground">No posts yet.</p>
            ) : (
              <ul className="divide-y">
                {posts.map((p) => (
                  <li key={p.id} className="py-4">
                    <Link to={`/${p.type === "page" ? "p" : "blog"}/${p.slug}`} className="font-medium hover:text-primary">{p.title}</Link>
                    {p.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}
