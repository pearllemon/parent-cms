import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import ElementorRenderer from "@/components/elementor/ElementorRenderer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Layout } from "lucide-react";
import Landing from "./Landing";

type PageData = {
  id: string;
  title: string;
  slug: string;
  body: string;
  type: string;
  featured_image_url: string | null;
  elementor_data: any[] | null;
  render_mode: string | null;
};

export default function PageView({ type: propType, homepage = false }: { type?: "page" | "post"; homepage?: boolean }) {
  const { slug = "" } = useParams();
  const nav = useNavigate();
  const [page, setPage] = useState<PageData | null>(null);
  const [headerTree, setHeaderTree] = useState<any[] | null>(null);
  const [footerTree, setFooterTree] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  const targetSlug = homepage ? "" : slug;
  const targetType = propType || (homepage ? "page" : "page");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let foundPage: PageData | null = null;

      // 1. Fetch from live posts table via parent client
      try {
        const { data } = await parent
          .from("posts")
          .select("id,title,slug,type,body,elementor_data,render_mode,featured_image_url")
          .eq("type", targetType)
          .eq("slug", targetSlug)
          .maybeSingle();
        if (data) {
          foundPage = data as PageData;
        }
      } catch (e) {
        console.warn("Failed to fetch from parent posts:", e);
      }

      // 2. Fallback to imported_posts via cloud client
      if (!foundPage) {
        try {
          const { data } = await supabase
            .from("imported_posts")
            .select("id,title,slug,type,body,elementor_data,render_mode,featured_image_url")
            .eq("type", targetType)
            .eq("slug", targetSlug)
            .maybeSingle();
          if (data) {
            foundPage = data as PageData;
          }
        } catch (e) {
          console.warn("Failed to fetch from imported_posts:", e);
        }
      }

      // 3. Fallback to matching by slug only
      if (!foundPage && targetSlug) {
        try {
          const { data } = await supabase
            .from("imported_posts")
            .select("id,title,slug,type,body,elementor_data,render_mode,featured_image_url")
            .eq("slug", targetSlug)
            .limit(1)
            .maybeSingle();
          if (data) {
            foundPage = data as PageData;
          }
        } catch {}
      }

      setPage(foundPage);

      // 4. Load Global Header and Footer templates from elementor_templates
      try {
        const { data: header } = await supabase.from("elementor_templates").select("data").eq("kind", "header").maybeSingle();
        if (header && Array.isArray(header.data)) {
          setHeaderTree(header.data);
        }
        const { data: footer } = await supabase.from("elementor_templates").select("data").eq("kind", "footer").maybeSingle();
        if (footer && Array.isArray(footer.data)) {
          setFooterTree(footer.data);
        }
      } catch (e) {
        console.warn("Failed to load header/footer templates:", e);
      }

      setLoading(false);
    })();
  }, [targetSlug, targetType, homepage]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground font-sans">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-8 w-32 bg-muted rounded"></div>
          <div className="text-sm">Loading page preview…</div>
        </div>
      </div>
    );
  }

  // Fallback if page not found
  if (!page) {
    if (homepage) {
      return <Landing />;
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 font-sans">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-3xl font-bold font-display text-red-500">Page Not Found</h1>
          <p className="text-muted-foreground text-sm">
            We couldn't find the page with slug <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/{targetSlug}</code>.
            Make sure it has been imported or created in the admin panel.
          </p>
          <Button asChild>
            <Link to="/admin/posts"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isElementor = page.render_mode === "elementor" && Array.isArray(page.elementor_data) && page.elementor_data.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans relative">
      {/* Floating Admin Preview Bar */}
      <div className="sticky top-0 z-50 bg-black/85 backdrop-blur-md text-white h-11 px-4 flex items-center justify-between text-xs font-medium border-b border-white/10 select-none">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Preview Mode</span>
          <span className="text-white/40">|</span>
          <span className="text-white/80 truncate max-w-[200px]">{page.title}</span>
          <span className="bg-white/10 text-white/90 text-[10px] uppercase px-1.5 py-0.5 rounded tracking-wider">
            {page.type || "page"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="h-7 text-white/90 hover:bg-white/10 hover:text-white">
            <Link to={`/admin/edit/${page.id}`}>
              <Layout className="w-3.5 h-3.5 mr-1.5" /> Edit Visually
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-7 text-white/90 hover:bg-white/10 hover:text-white">
            <Link to={`/admin/posts/${page.id}${page.type === "post" ? "" : "?type=page"}`}>
              <Edit className="w-3.5 h-3.5 mr-1.5" /> Settings
            </Link>
          </Button>
          <span className="text-white/20">|</span>
          <Button asChild size="sm" variant="secondary" className="h-7 bg-white/15 hover:bg-white/25 text-white border-0">
            <Link to="/admin/posts">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Admin
            </Link>
          </Button>
        </div>
      </div>

      {/* 1. RENDER HEADER */}
      {headerTree ? (
        <ElementorRenderer data={headerTree} />
      ) : (
        <header className="py-4 px-6 border-b flex items-center justify-between bg-white shadow-sm">
          <div className="font-bold text-xl tracking-tight text-primary">Pearl Lemon</div>
          <nav className="flex gap-6 text-sm font-semibold text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <Link to="/p/services" className="hover:text-foreground">Services</Link>
            <Link to="/p/about" className="hover:text-foreground">About</Link>
            <Link to="/blog" className="hover:text-foreground">Blog</Link>
            <Link to="/p/contact" className="hover:text-foreground">Contact</Link>
          </nav>
        </header>
      )}

      {/* 2. RENDER MAIN CONTENT */}
      <main className="flex-grow">
        {isElementor ? (
          <ElementorRenderer data={page.elementor_data!} />
        ) : (
          <div className="w-full">
            {/* Hero Section */}
            <section className="bg-[#f8f9fa] text-[#1a202c] py-16 px-6 border-b">
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-between">
                <div className="flex-1 space-y-4">
                  <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">
                    {page.type === "post" ? "Blog Post" : "Article"}
                  </span>
                  <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                    {page.title}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Published by <strong>Team</strong> &bull; 5 min read
                  </p>
                </div>
                {page.featured_image_url && (
                  <div className="w-full md:w-[320px] shrink-0">
                    <img
                      src={page.featured_image_url}
                      alt={page.title}
                      className="w-full rounded-2xl object-cover aspect-video shadow-md"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Content Split Section */}
            <section className="py-12 px-6 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
                {/* Main Article Text */}
                <div
                  className="prose max-w-none prose-rose font-sans text-[#2d3748] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: page.body || "" }}
                />

                {/* Sidebar */}
                <aside className="space-y-6">
                  <div className="bg-[#f8f9fa] p-6 rounded-2xl border space-y-3">
                    <h4 className="font-bold text-base">About Our Agency</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      We are an award-winning consulting agency dedicated to delivering high-impact, data-driven optimization campaigns that boost search rankings and double organic traffic.
                    </p>
                  </div>
                  <div className="bg-[#111111] text-white p-6 rounded-2xl space-y-4">
                    <h4 className="font-bold text-base text-rose-400">Ready to Scale?</h4>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Schedule a zero-obligation strategy session with our senior advisors today.
                    </p>
                    <Button asChild className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs h-9">
                      <Link to="/p/contact">Book a Call</Link>
                    </Button>
                  </div>
                </aside>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* 3. RENDER FOOTER */}
      {footerTree ? (
        <ElementorRenderer data={footerTree} />
      ) : (
        <footer className="bg-slate-900 text-slate-400 py-8 px-6 text-center text-sm border-t border-slate-800">
          <p>&copy; {new Date().getFullYear()} Pearl Lemon. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
}
