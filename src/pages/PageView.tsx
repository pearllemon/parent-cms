import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabase as parent } from "@/lib/parent";
import ElementorRenderer from "@/components/elementor/ElementorRenderer";
import ServicePageTemplate from "@/components/service/ServicePageTemplate";
import DOMPurify from 'dompurify';
import FormRenderer from "@/components/site/FormRenderer";

const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html || "", {
    ADD_TAGS: ["style", "iframe", "script", "link"],
    ADD_ATTR: ["target", "scrolling", "frameborder", "allow", "allowfullscreen", "rel", "href"],
    FORCE_BODY: true
  });
};
import { Button } from "@/components/ui/button";
import HtmlEmbedSection from "./HtmlEmbedSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Edit,
  Layout,
  Mail,
  Phone,
  Clock,
  ArrowRight,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  Users,
  MapPin
} from "lucide-react";
import { toast } from "sonner";

type PageData = {
  id: string;
  title: string;
  slug: string;
  body: string;
  type: string;
  featured_image_url: string | null;
  elementor_data: any[] | null;
  render_mode: string | null;
  template: string | null;
};

const TEAM_MEMBERS = [
  {
    name: "Deepak Shukla",
    role: "Founder & CEO",
    description: "Deepak founded Pearl Lemon with a vision to deliver world-class SEO and digital growth consulting.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    name: "Federica",
    role: "Head of SEO & Content",
    description: "Federica oversees our organic search frameworks, ensuring high-intent traffic and rank growth.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    name: "Richard",
    role: "Senior Growth Advisor",
    description: "Richard consults with senior partners on commercial expansion and high-velocity lead acquisition.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80"
  }
];

export default function PageView({ type: propType, homepage = false }: { type?: "page" | "post"; homepage?: boolean }) {
  const { slug = "" } = useParams();
  const nav = useNavigate();
  const [page, setPage] = useState<PageData | null>(null);
  const [headerTree, setHeaderTree] = useState<any[] | null>(null);
  const [footerTree, setFooterTree] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [latestPosts, setLatestPosts] = useState<any[]>([]);

  // Check if user is logged in to show the floating preview bar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Dynamic branding state synced from theme_tokens
  const [branding, setBranding] = useState<{ primary: string; accent: string; font: string }>({
    primary: "#F4B80E", // Default Pearl Lemon Yellow
    accent: "#111111",
    font: "Poppins",
  });

  const [siteSettings, setSiteSettings] = useState<any>(null);

  const targetSlug = homepage ? "" : slug;
  const targetType = propType || (homepage ? "page" : "page");

  // Determine special page scopes
  const is404Page = targetSlug === "404";
  const isThankYouPage = targetSlug === "thank-you";
  const isBlogIndex = targetSlug === "blog" || (propType === "post" && homepage);
  const isContactPage = useMemo(() => {
    const s = targetSlug.toLowerCase();
    return s === "contact" || s === "contact-us" || s === "get-in-touch";
  }, [targetSlug]);
  const isBookingPage = useMemo(() => {
    const s = targetSlug.toLowerCase();
    return s.includes("call") || s.includes("book") || s.includes("booking") || s.includes("schedule") || s.includes("appointment");
  }, [targetSlug]);

  // Detect service pages (e.g., breeam-*)
  const isServicePage = useMemo(() => targetSlug.toLowerCase().startsWith('breeam-'), [targetSlug]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      
      // 1. Fetch branding tokens dynamically
      try {
        const { data: tokens } = await supabase.from("theme_tokens").select("colors,typography").limit(1).maybeSingle();
        if (tokens) {
          const colors = (tokens as any).colors || {};
          const typography = (tokens as any).typography || {};
          setBranding({
            primary: colors.primary || "#F4B80E",
            accent: colors.accent || "#111111",
            font: typography.fontFamilyHeading || "Poppins",
          });
        }
      } catch (e) {
        console.warn("Failed to load theme tokens:", e);
      }

      // Fetch site settings for contact details
      let loadedSettings: any = null;
      try {
        const { data: settings } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
        if (settings) {
          setSiteSettings(settings);
          loadedSettings = settings;
        }
      } catch (e) {
        console.warn("Failed to load site settings:", e);
      }

      // If we are on the blog index, fetch posts list
      if (isBlogIndex) {
        try {
          const { data: localPosts } = await supabase
            .from("imported_posts")
            .select("id,title,slug,excerpt,featured_image_url,publish_date,type")
            .eq("type", "post")
            .eq("status", "published")
            .order("publish_date", { ascending: false });
          
          const { data: parentPosts } = await parent
            .from("posts")
            .select("id,title,slug,excerpt,featured_image_url,publish_date,type")
            .eq("type", "post")
            .eq("status", "published")
            .order("publish_date", { ascending: false });

          const merged = [...(parentPosts || []), ...(localPosts || [])];
          const seen = new Set<string>();
          const unique = merged.filter((p) => {
            const key = `${p.slug}`;
            return seen.has(key) ? false : (seen.add(key), true);
          });
          setPosts(unique);
        } catch (e) {
          console.warn("Failed to load blog posts list:", e);
        }
      }
      
      // If we are on the homepage, fetch the latest 3 posts for the blog grid
      if (homepage) {
        try {
          const { data: localPosts } = await supabase
            .from("imported_posts")
            .select("id,title,slug,excerpt,featured_image_url,publish_date,type")
            .eq("type", "post")
            .eq("status", "published")
            .order("publish_date", { ascending: false })
            .limit(3);
          
          const { data: parentPosts } = await parent
            .from("posts")
            .select("id,title,slug,excerpt,featured_image_url,publish_date,type")
            .eq("type", "post")
            .eq("status", "published")
            .order("publish_date", { ascending: false })
            .limit(3);

          const merged = [...(parentPosts || []), ...(localPosts || [])];
          const seen = new Set<string>();
          const unique = merged.filter((p) => {
            const key = `${p.slug}`;
            return seen.has(key) ? false : (seen.add(key), true);
          }).slice(0, 3);
          
          setLatestPosts(unique);
        } catch (e) {
          console.warn("Failed to load latest posts for homepage:", e);
        }
      }

      let foundPage: PageData | null = null;
      const isHomepageRequest = homepage || targetSlug === "" || targetSlug === "home" || targetSlug === "homepage";
      const homepageId = isHomepageRequest ? loadedSettings?.extras?.homepage_page_id : null;

      // 2. Fetch page (by ID if homepage ID is set, otherwise by slug)
      if (homepageId) {
        try {
          const { data } = await parent
            .from("posts")
            .select("id,title,slug,type,body,elementor_data,render_mode,featured_image_url,template")
            .eq("id", homepageId)
            .maybeSingle();
          if (data) {
            foundPage = data as PageData;
          }
        } catch (e) {
          console.warn("Failed to fetch homepage by ID from parent posts:", e);
        }

        if (!foundPage) {
          try {
            const { data } = await supabase
              .from("imported_posts")
              .select("id,title,slug,type,body,elementor_data,render_mode,featured_image_url,template")
              .eq("id", homepageId)
              .maybeSingle();
            if (data) {
              foundPage = data as PageData;
            }
          } catch (e) {
            console.warn("Failed to fetch homepage by ID from imported_posts:", e);
          }
        }
      }

      // If no page has been found yet (either not a homepage request, homepage ID not configured, or page not found by ID), fetch by slug
      if (!foundPage) {
        const slugOptions = isHomepageRequest
          ? ["", "home", "homepage", "index"] 
          : [targetSlug];

        // Fetch from live posts table via parent client
        try {
          const { data } = await parent
            .from("posts")
            .select("id,title,slug,type,body,elementor_data,render_mode,featured_image_url,template")
            .eq("type", targetType)
            .in("slug", slugOptions)
            .order("publish_date", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) {
            foundPage = data as PageData;
          }
        } catch (e) {
          console.warn("Failed to fetch from parent posts:", e);
        }

        // Fallback to imported_posts via cloud client
        if (!foundPage) {
          try {
            const { data } = await supabase
              .from("imported_posts")
              .select("id,title,slug,type,body,elementor_data,render_mode,featured_image_url,template")
              .eq("type", targetType)
              .in("slug", slugOptions)
              .limit(1)
              .maybeSingle();
          if (data) {
            foundPage = data as PageData;
          }
        } catch (e) {
          console.warn("Failed to fetch from imported_posts:", e);
        }
      }
    }

      // 4. Fallback to matching by slug only
      if (!foundPage && !homepage && targetSlug) {
        try {
          const { data } = await supabase
            .from("imported_posts")
            .select("id,title,slug,type,body,elementor_data,render_mode,featured_image_url,template")
            .eq("slug", targetSlug)
            .limit(1)
            .maybeSingle();
          if (data) {
            foundPage = data as PageData;
          }
        } catch {}
      }

      setPage(foundPage);
    const cleanedBody = (foundPage?.body || '').replace(/Generated by Content Snapshot Pro[\s\S]*?\)/g, '');

      // 5. Load Global Header and Footer templates from elementor_templates
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
  }, [targetSlug, targetType, homepage, isBlogIndex]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground font-sans">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-muted border-t-yellow-500 animate-spin" style={{ borderTopColor: branding.primary }}></div>
          <div className="text-sm font-semibold">Loading page preview…</div>
        </div>
      </div>
    );
  }

  const isElementor = page && page.render_mode === "elementor" && Array.isArray(page.elementor_data);
  const isCanvas = page && ((page as any).template === "canvas" || (page as any).template === "elementor_canvas");

  if (isCanvas && page && page.render_mode === "html") {
    return (
      <div 
        className="w-full min-h-screen"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body || "") }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans relative">
      {/* Styles for custom premium micro-animations */}
      <style>{`
        @keyframes pl-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .pl-animate-float {
          animation: pl-float 4s ease-in-out infinite;
        }
        @keyframes pl-bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .pl-animate-bounce-slow {
          animation: pl-bounce-slow 3s ease-in-out infinite;
        }
      `}</style>

      {/* Floating Admin Preview Bar */}
      {page && isAdmin && (
        <div className="sticky top-0 z-50 bg-[#0c0d0e]/95 backdrop-blur-md text-white h-11 px-4 flex items-center justify-between text-xs font-medium border-b border-white/5 select-none shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: branding.primary }}></span>
            <span>Preview Mode</span>
            <span className="text-white/20">|</span>
            <span className="text-white/80 truncate max-w-[200px]">{page.title}</span>
            <span className="bg-white/10 text-white/90 text-[9px] uppercase px-1.5 py-0.5 rounded tracking-wider font-bold">
              {page.type || "page"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="h-7 text-white/90 hover:bg-white/10 hover:text-white text-[11px]">
              <Link to={`/admin/edit/${page.id}`}>
                <Layout className="w-3.5 h-3.5 mr-1.5" /> Edit Visually
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-7 text-white/90 hover:bg-white/10 hover:text-white text-[11px]">
              <Link to={`/admin/posts/${page.id}${page.type === "post" ? "" : "?type=page"}`}>
                <Edit className="w-3.5 h-3.5 mr-1.5" /> Settings
              </Link>
            </Button>
            <span className="text-white/20">|</span>
            <Button asChild size="sm" variant="secondary" className="h-7 bg-white/10 hover:bg-white/20 text-white border-0 text-[11px]">
              <Link to="/admin/posts">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Admin
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* 1. RENDER HEADER */}
      {!isCanvas && (
        headerTree ? (
          <ElementorRenderer data={headerTree} />
        ) : (
          <header className="py-4 px-6 border-b flex items-center justify-between bg-white shadow-sm shrink-0">
            <Link to="/" className="font-bold text-xl tracking-tight text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-slate-950" style={{ backgroundColor: branding.primary }}>P</span>
              <span>Pearl Lemon</span>
            </Link>
            <nav className="flex gap-6 text-sm font-bold text-slate-600">
              <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
              <Link to="/services" className="hover:text-slate-900 transition-colors">Services</Link>
              <Link to="/about" className="hover:text-slate-900 transition-colors">About</Link>
              <Link to="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
              <Link to="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
            </nav>
          </header>
        )
      )}

      {/* 2. RENDER MAIN CONTENT */}
      <main className="flex-grow">
        {is404Page || (!page && !homepage && !isBlogIndex && !isThankYouPage) ? (
          <Custom404Page branding={branding} />
        ) : isThankYouPage ? (
          <ThankYouPage branding={branding} />
        ) : isBlogIndex ? (
          <BlogIndexPage posts={posts} branding={branding} />
        ) : isContactPage && page ? (
          <ContactPageView page={page} branding={branding} siteSettings={siteSettings} />
        ) : isServicePage ? (
          <ServicePageTemplate page={page} branding={branding} />
        ) : (
          <div className="w-full">
            {isBookingPage && (
              <div className="py-12 px-6 bg-slate-50/30 shrink-0">
                <BookingCalendar branding={branding} />
              </div>
            )}
            <HtmlEmbedSection branding={branding} html={cleanedBody} />

            {isElementor && page ? (
              <ElementorRenderer data={page.elementor_data!} />
            ) : page ? (
              <div className="w-full">
                {!(page as any).template || (page as any).template === "default" ? (
                  <>
                    {/* Fallback Hero Section */}
                    <section className="bg-slate-50 text-slate-900 py-16 px-6 border-b">
                      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-between">
                        <div className="flex-1 space-y-4">
                          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: branding.primary }}>
                            {page.type === "post" ? "Blog Post" : "Article"}
                          </span>
                          <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight tracking-tight">
                            {page.title}
                          </h1>
                          <p className="text-xs text-muted-foreground">
                            Published &bull; 5 min read
                          </p>
                        </div>
                        {page.featured_image_url && (
                          <div className="w-full md:w-[320px] shrink-0">
                            <img
                              src={page.featured_image_url}
                              alt={page.title}
                              className="w-full rounded-2xl object-cover aspect-video shadow-md border"
                            />
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Content Section */}
                    <section className="py-12 px-6 max-w-5xl mx-auto">
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
                        <div
                          className="prose max-w-none prose-slate font-sans text-slate-800 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body || "") }}
                        />
                        
                        <aside className="space-y-6">
                          <div className="bg-slate-50 p-6 rounded-2xl border space-y-3 shadow-sm">
                            <h4 className="font-extrabold text-sm text-slate-900">About Pearl Lemon</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Pearl Lemon is a multi-award-winning digital consulting agency. We build high-performance organic marketing systems that rank brands on Page 1 and double search leads.
                            </p>
                          </div>
                          <div className="bg-slate-950 text-white p-6 rounded-2xl space-y-4 shadow-md">
                            <h4 className="font-extrabold text-sm" style={{ color: branding.primary }}>Ready to Scale?</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Book a strategy consultation with our senior consultants today to audit your current search bottlenecks.
                            </p>
                            <Button asChild className="w-full font-bold text-xs h-9 active:scale-95" style={{ backgroundColor: branding.primary, color: "#111" }}>
                              <Link to="/book-a-call">Book a Call</Link>
                            </Button>
                          </div>
                        </aside>
                      </div>
                    </section>
                  </>
                ) : (
                  <div 
                    className="w-full"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body || "") }}
                  />
                )}
              </div>
            ) : null}

            {isBookingPage && (
              <TeamMembersSection branding={branding} />
            )}
          </div>
        )}

        {/* 2.5 RENDER HOMEPAGE BLOG POST GRID */}
        {homepage && latestPosts.length > 0 && (
          <section className="py-16 px-6 bg-slate-50 border-t border-b border-slate-100 shrink-0">
            <div className="max-w-6xl mx-auto space-y-10">
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-extrabold font-display text-slate-900">Latest News & Updates</h2>
                <p className="text-sm text-slate-500 max-w-xl mx-auto">
                  Stay updated with the latest insights, guidelines, and news about BREEAM assessments in the UK.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {latestPosts.map((post) => (
                  <article key={post.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                    {post.featured_image_url && (
                      <Link to={`/blog/${post.slug}`} className="block aspect-video overflow-hidden border-b">
                        <img src={post.featured_image_url} alt={post.title} className="w-full h-full object-cover hover:scale-102 transition-transform duration-300" />
                      </Link>
                    )}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-bold text-base text-slate-900 line-clamp-2 transition-colors hover:opacity-80">
                          <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                        </h3>
                        {post.excerpt && <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{post.excerpt}</p>}
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{post.publish_date ? new Date(post.publish_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Recent'}</span>
                        <Link to={`/blog/${post.slug}`} className="font-bold hover:underline flex items-center gap-1" style={{ color: branding.primary }}>
                          Read More <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 3. RENDER GLOBAL CONTACT FORM (Show on all standard pages/posts, hide on 404/thank-you) */}
        {page && !is404Page && !isThankYouPage && !isContactPage && (
          <GlobalContactForm branding={branding} onSubmitSuccess={() => nav("/thank-you")} />
        )}
      </main>

      {/* 4. RENDER FOOTER */}
      {!isCanvas && !(window as any).isServicePage && (
        footerTree ? (
          <ElementorRenderer data={footerTree} />
        ) : (
          <footer className="bg-slate-950 text-slate-400 py-12 px-6 text-center text-xs border-t border-slate-900 shrink-0">
            <div className="max-w-4xl mx-auto space-y-4">
              <p className="font-bold text-slate-200">Pearl Lemon Group</p>
              <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                London-based growth specialists. SEO, Lead Generation, PR, Web Development, and Business Advisory.
              </p>
              <div className="pt-4 border-t border-slate-900 text-slate-600">
                &copy; {new Date().getFullYear()} Pearl Lemon. All rights reserved.
              </div>
            </div>
          </footer>
        )
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// 1. GORGEOUS CUSTOM 404 ROBOT PAGE
function Custom404Page({ branding }: { branding: any }) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"…`);
      setTimeout(() => {
        toast.error(`No pages found matching "${searchQuery}".`);
      }, 1000);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center bg-background text-foreground px-6 py-16 font-sans shrink-0">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left Side: Robot graphic */}
        <div className="text-center space-y-4">
          <div className="text-4xl font-black font-display tracking-tight text-slate-900">Oops! 404 ERROR</div>
          
          <svg className="w-full max-w-[280px] mx-auto pl-animate-float" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="120" y="140" width="160" height="150" rx="30" fill={branding.primary} stroke="#111" strokeWidth="8" />
            <rect x="150" y="60" width="100" height="70" rx="20" fill={branding.primary} stroke="#111" strokeWidth="8" />
            <line x1="200" y1="60" x2="200" y2="30" stroke="#111" strokeWidth="8" strokeLinecap="round" />
            <circle cx="200" cy="20" r="10" fill={branding.primary} stroke="#111" strokeWidth="6" />
            <rect x="185" y="125" width="30" height="20" rx="5" fill="#555" stroke="#111" strokeWidth="6" />
            <circle cx="180" cy="95" r="14" fill="#222" />
            <circle cx="180" cy="95" r="5" fill="#fff" />
            <circle cx="220" cy="95" r="14" fill="#222" />
            <circle cx="220" cy="95" r="5" fill="#fff" />
            <path d="M 180 118 Q 200 108 220 118" stroke="#111" strokeWidth="6" strokeLinecap="round" fill="none" />
            <rect x="138" y="80" width="12" height="30" rx="4" fill="#555" stroke="#111" strokeWidth="6" />
            <rect x="250" y="80" width="12" height="30" rx="4" fill="#555" stroke="#111" strokeWidth="6" />
            <circle cx="200" cy="215" r="28" fill="#111" />
            <circle cx="200" cy="215" r="12" fill={branding.primary} />
            <path d="M 200 182 L 200 188 M 200 242 L 200 248 M 167 215 L 173 215 M 227 215 L 233 215" stroke={branding.primary} strokeWidth="6" strokeLinecap="round" />
            <path d="M 120 200 C 100 220 90 240 90 260" stroke="#111" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M 280 200 C 300 220 310 240 310 260" stroke="#111" strokeWidth="8" strokeLinecap="round" fill="none" />
            <rect x="150" y="290" width="35" height="50" rx="10" fill="#555" stroke="#111" strokeWidth="8" />
            <rect x="215" y="290" width="35" height="50" rx="10" fill="#555" stroke="#111" strokeWidth="8" />
          </svg>
        </div>

        {/* Right Side: Description and links */}
        <div className="space-y-6 text-left">
          <h1 className="text-5xl font-extrabold font-display text-slate-900">Oooops...</h1>
          <h2 className="text-2xl font-bold text-slate-800">Page not found</h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-md">
            The page you are looking for doesn't exist or another error occurred. Go back to the Homepage or search for the page you were looking for below.
          </p>

          <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
            <Input
              type="text"
              placeholder="What page you were looking for?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-yellow-500"
              required
            />
            <Button type="submit" className="font-bold text-xs px-6 active:scale-95" style={{ backgroundColor: branding.primary, color: "#111" }}>
              Send
            </Button>
          </form>

          <div>
            <Button asChild className="font-bold text-xs h-10 px-6 transition-transform hover:scale-105 active:scale-95 shadow-md" style={{ backgroundColor: branding.primary, color: "#111" }}>
              <Link to="/">Go Back to Homepage</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. HAPPY ROBOT THANK YOU PAGE
function ThankYouPage({ branding }: { branding: any }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50/30 text-foreground px-6 py-16 font-sans shrink-0">
      <div className="max-w-md text-center space-y-6 bg-white p-8 rounded-3xl border shadow-lg flex flex-col items-center">
        <svg className="w-full max-w-[220px] mx-auto pl-animate-bounce-slow" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="120" y="140" width="160" height="150" rx="30" fill={branding.primary} stroke="#111" strokeWidth="8" />
          <rect x="150" y="60" width="100" height="70" rx="20" fill={branding.primary} stroke="#111" strokeWidth="8" />
          <line x1="200" y1="60" x2="200" y2="30" stroke="#111" strokeWidth="8" strokeLinecap="round" />
          <circle cx="200" cy="20" r="10" fill={branding.primary} stroke="#111" strokeWidth="6" />
          <rect x="185" y="125" width="30" height="20" rx="5" fill="#555" stroke="#111" strokeWidth="6" />
          <circle cx="180" cy="95" r="14" fill="#222" />
          <circle cx="180" cy="95" r="5" fill="#fff" />
          <circle cx="220" cy="95" r="14" fill="#222" />
          <circle cx="220" cy="95" r="5" fill="#fff" />
          <path d="M 175 110 Q 200 125 225 110" stroke="#111" strokeWidth="6" strokeLinecap="round" fill="none" />
          <rect x="138" y="80" width="12" height="30" rx="4" fill="#555" stroke="#111" strokeWidth="6" />
          <rect x="250" y="80" width="12" height="30" rx="4" fill="#555" stroke="#111" strokeWidth="6" />
          <path d="M 200 220 C 200 220 185 205 185 195 C 185 188 191 182 198 182 C 202 182 205 185 207 188 C 209 185 212 182 216 182 C 223 182 229 188 229 195 C 229 205 214 220 214 220 Z" fill="#f43f5e" stroke="#111" strokeWidth="4" />
          <path d="M 120 200 C 90 200 70 170 60 140" stroke="#111" strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M 280 200 C 310 200 330 180 340 160" stroke="#111" strokeWidth="8" strokeLinecap="round" fill="none" />
          <rect x="150" y="290" width="35" height="50" rx="10" fill="#555" stroke="#111" strokeWidth="8" />
          <rect x="215" y="290" width="35" height="50" rx="10" fill="#555" stroke="#111" strokeWidth="8" />
        </svg>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold font-display text-slate-900">Thank You!</h1>
          <p className="text-sm text-emerald-600 font-bold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4.5 h-4.5" /> Message Sent Successfully
          </p>
          <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
            We have received your growth request. A senior partner will review your website and contact you within the next 4 minutes with your roadmap.
          </p>
        </div>
        <Button asChild className="font-bold text-xs h-10 px-6 active:scale-95 shadow-md" style={{ backgroundColor: branding.primary, color: "#111" }}>
          <Link to="/">Go Back to Homepage</Link>
        </Button>
      </div>
    </div>
  );
}

// 3. PREMIUM CONTACT FORM (WITH 4-MINUTE SYNC)
function GlobalContactForm({ branding, onSubmitSuccess }: { branding: any; onSubmitSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and Email are required");
      return;
    }
    setLoading(true);
    try {
      // 1. Save lead locally in child database
      const { error: localErr } = await supabase.from("leads").insert({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        message: message.trim() || null,
        source: "website_contact_form",
        source_url: window.location.href,
        status: "new",
      });

      if (localErr) throw localErr;

      // 2. Sync lead to parent CMS API
      try {
        const { submitLead } = await import("@/lib/parent");
        await submitLead({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
        });
      } catch (parentErr) {
        console.warn("Failed to sync lead to parent CMS:", parentErr);
      }

      toast.success("Message sent successfully!");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      onSubmitSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 px-6 bg-[#0c0d0e] text-white border-t border-slate-900 shrink-0">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-xs font-semibold" style={{ color: branding.primary }}>
            <Sparkles className="w-3.5 h-3.5" /> Ready to Grow?
          </div>
          <h2 className="text-3.5xl md:text-4xl font-extrabold font-display tracking-tight leading-tight">
            Let's build something <span style={{ color: branding.primary }}>exceptional</span> together
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Schedule a session or send us a message. Our senior advisors will analyze your website and provide a custom roadmap to scale your organic search and double your revenue.
          </p>
          <div className="space-y-4 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 shrink-0" style={{ color: branding.primary }} />
              <span>UK: +442071833436 &bull; US: +16502874421</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 shrink-0" style={{ color: branding.primary }} />
              <span>info@pearlemongroup.com</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 shrink-0" style={{ color: branding.primary }} />
              <span>Response time: Under 4 minutes</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl space-y-4 shadow-xl backdrop-blur-md">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name" className="text-xs font-semibold text-slate-300">Name *</Label>
            <Input
              id="contact-name"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-1"
              style={{ "--tw-ring-color": branding.primary } as any}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-email" className="text-xs font-semibold text-slate-300">Email *</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-1"
              style={{ "--tw-ring-color": branding.primary } as any}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone" className="text-xs font-semibold text-slate-300">Phone</Label>
            <Input
              id="contact-phone"
              type="tel"
              placeholder="+44 7123 456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-1"
              style={{ "--tw-ring-color": branding.primary } as any}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-message" className="text-xs font-semibold text-slate-300">Message</Label>
            <Textarea
              id="contact-message"
              placeholder="Tell us about your project or goals..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-1 resize-none"
              style={{ "--tw-ring-color": branding.primary } as any}
            />
          </div>
          <Button
            type="submit"
            className="w-full font-bold text-xs h-10 transition-transform duration-150 active:scale-[0.98] shadow-lg"
            style={{ backgroundColor: branding.primary, color: "#111111" }}
            disabled={loading}
          >
            {loading ? "SENDING..." : "GET MY FREE ROADMAP"}
          </Button>
        </form>
      </div>
    </section>
  );
}

// 4. INTERACTIVE BOOKING CALENDAR (WITH SHIMMER STATE)
function BookingCalendar({ branding }: { branding: any }) {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl border p-8 shadow-md relative overflow-hidden min-h-[500px] shrink-0">
      {loading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-yellow-500 animate-spin" style={{ borderTopColor: branding.primary }}></div>
          <div className="text-sm font-semibold text-slate-500 animate-pulse">Loading booking schedule…</div>
          <div className="w-full max-w-md px-6 space-y-3 pt-4">
            <div className="h-6 bg-slate-100 rounded w-3/4 mx-auto animate-pulse"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto animate-pulse"></div>
            <div className="h-32 bg-slate-100 rounded animate-pulse mt-4"></div>
          </div>
        </div>
      ) : null}
      
      <div className="space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 mb-2" style={{ backgroundColor: `${branding.primary}15`, color: branding.primary }}>
          <Calendar className="w-6 h-6" />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">Schedule Your Growth Session</h2>
        <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          Book a 15-minute diagnostic call with our growth consultants. Choose a date and time from the calendar below.
        </p>
        
        {/* Simulated Interactive Booking Widget */}
        <div className="border rounded-2xl p-6 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-8 text-left border-slate-150">
          <div>
            <h4 className="font-bold text-xs mb-4 uppercase tracking-wider text-slate-500">1. Select a Date</h4>
            <div className="grid grid-cols-7 gap-2 text-center text-xs">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <div key={i} className="font-bold text-slate-400 py-1">{d}</div>
              ))}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const active = day === 25 || day === 26;
                return (
                  <button
                    key={i}
                    className={`py-2 rounded-lg font-semibold transition-all ${
                      active
                        ? "text-slate-950 font-bold scale-105"
                        : "hover:bg-slate-200 text-slate-700"
                    }`}
                    style={active ? { backgroundColor: branding.primary } : {}}
                    type="button"
                    onClick={() => toast.info(`Selected Date: June ${day}, 2026`)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="flex flex-col justify-between space-y-4">
            <div>
              <h4 className="font-bold text-xs mb-4 uppercase tracking-wider text-slate-500">2. Available Slots (June 25)</h4>
              <div className="grid grid-cols-2 gap-2">
                {["09:00 AM", "10:30 AM", "01:00 PM", "03:30 PM", "05:00 PM"].map((slot, i) => (
                  <button
                    key={i}
                    className="border border-slate-200 rounded-lg py-2 text-center text-xs font-bold hover:border-slate-800 hover:bg-slate-100 transition-all text-slate-700"
                    type="button"
                    onClick={() => {
                      toast.success(`Booked slot: ${slot}! Redirecting…`);
                      setTimeout(() => {
                        window.location.href = "/thank-you";
                      }, 1000);
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 bg-white p-4 rounded-xl border border-slate-150 leading-relaxed space-y-1 shadow-inner">
              <div className="font-bold text-slate-600">Meeting Guidelines:</div>
              <div>&bull; Call type: Zoom / Google Meet Video Conference</div>
              <div>&bull; Duration: 15 minutes strategy assessment</div>
              <div>&bull; Led by: Senior SEO Strategy Consultant</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. MEET OUR TEAM SECTION
function TeamMembersSection({ branding }: { branding: any }) {
  return (
    <section className="py-16 px-6 bg-slate-50 border-t border-slate-100 shrink-0">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            <Users className="w-3.5 h-3.5" style={{ color: branding.primary }} /> Our Leadership
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 leading-tight">
            Meet our senior growth consultants
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Our team of specialists has scaled campaigns for major brands. You will be speaking directly with our senior leaders.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {TEAM_MEMBERS.map((member, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border shadow-sm text-center flex flex-col items-center space-y-4 hover:shadow-md transition-shadow">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 shadow-inner" style={{ borderColor: `${branding.primary}40` }}>
                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-slate-900">{member.name}</h4>
                <p className="text-xs font-extrabold uppercase tracking-widest text-[10px]" style={{ color: branding.primary }}>{member.role}</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">{member.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 6. GORGEOUS UNIFIED CONTACT PAGE VIEW
function ContactPageView({ page, branding, siteSettings }: { page: any; branding: any; siteSettings: any }) {
  const address = siteSettings?.contact_address || "Kemp House, 152 – 160 City Road London, EC1V 2NX United Kingdom";
  const phone = siteSettings?.contact_phone || "+442071833436";
  const email = siteSettings?.email_from_address || "info@pearllemongroup.com";

  return (
    <div className="w-full bg-white">
      {/* Banner / Hero */}
      <section className="relative text-white py-24 px-6 overflow-hidden bg-[#0c0d0e]">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ backgroundColor: branding.primary }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ backgroundColor: branding.primary }} />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10" style={{ color: branding.primary }}>
            Get In Touch
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold font-display tracking-tight leading-none">
            {page.title || "Contact Us"}
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Have questions or ready to scale? Reach out to our team of experts today and let's build something exceptional together.
          </p>
        </div>
      </section>

      {/* Main Grid Content */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column - Contact Info */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                We'd Love To Hear From You!
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Have any questions? Please get in touch! If you’d prefer to speak directly with a consultant, feel free to schedule a session.
              </p>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 gap-4">
              <ContactInfoCard
                icon={<MapPin className="w-5 h-5" />}
                title="Office Address"
                value={address}
                branding={branding}
              />
              <ContactInfoCard
                icon={<Phone className="w-5 h-5" />}
                title="Phone Numbers"
                value={
                  <div className="space-y-1.5 text-sm text-slate-600">
                    <a href={`tel:${phone}`} className="hover:underline block font-semibold text-slate-800">{phone} (UK Office)</a>
                    <a href="tel:+447454539583" className="hover:underline block font-semibold text-slate-800">+44 7454 539583 (UK Mobile)</a>
                  </div>
                }
                branding={branding}
              />
              <ContactInfoCard
                icon={<Mail className="w-5 h-5" />}
                title="Email Address"
                value={<a href={`mailto:${email}`} className="hover:underline font-semibold text-slate-800">{email}</a>}
                branding={branding}
              />
            </div>

            {/* Workflow Steps / Timeline */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Our Simple Process</h4>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-slate-600 relative">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto text-slate-950 font-bold" style={{ backgroundColor: branding.primary }}>1</div>
                  <div>Submit Form</div>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto text-slate-950 font-bold" style={{ backgroundColor: branding.primary }}>2</div>
                  <div>We Review</div>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto text-slate-950 font-bold" style={{ backgroundColor: branding.primary }}>3</div>
                  <div>You Get a Call</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form Card */}
          <div className="lg:col-span-7">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Send us a Message</h3>
                <p className="text-xs text-slate-400">Fill in your details below and we will get back to you in under 4 minutes.</p>
              </div>
              
              <FormRenderer slug="contact" branding={branding} />
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>🔒 Secure 256-bit SSL connection</span>
                <span>⚡ Response time: &lt; 4 mins</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-slate-50 py-20 px-6 border-t border-slate-100">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Positive Reviews From Our Customers
            </h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">
              What investors and clients value most is our transparency, integrity, and lack of pushy sales tactics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <TestimonialCard
              quote="The value was not in being told to proceed, but in understanding why waiting made sense. That restraint saved time, capital, and future complications. It felt like advice given without an agenda."
              author="Marcus Feldman"
              role="Business Owner & UK Property Investor"
            />
            <TestimonialCard
              quote="This felt very different from typical property advice. Calm, disciplined, and focused on risk rather than upside. I came away with a recommendation I could stand behind, even though it meant not acting immediately."
              author="Jonathan Hale"
              role="Portfolio Investor, South East England"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactInfoCard({ icon, title, value, branding }: { icon: React.ReactNode; title: string; value: React.ReactNode; branding: any }) {
  return (
    <div className="flex gap-4 p-5 rounded-2xl border border-slate-100 bg-white hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${branding.primary}15`, color: branding.primary }}>
        {icon}
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
        <div className="text-sm text-slate-600 leading-relaxed font-medium">{value}</div>
      </div>
    </div>
  );
}

function TestimonialCard({ quote, author, role }: { quote: string; author: string; role: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-150 relative space-y-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <p className="text-xs text-slate-600 leading-relaxed italic">
        "{quote}"
      </p>
      <div className="space-y-0.5">
        <h5 className="font-bold text-xs text-slate-900">{author}</h5>
        <p className="text-[10px] text-slate-400 font-semibold">{role}</p>
      </div>
      <span className="absolute bottom-4 right-6 text-5xl font-black text-slate-100 select-none pointer-events-none">”</span>
    </div>
  );
}

// 6. PREMIUM BLOG INDEX PAGE (MATCHING IMAGE 2 EXACTLY)
function BlogIndexPage({ posts, branding }: { posts: any[]; branding: any }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredPosts = useMemo(() => {
    return posts;
  }, [posts]);

  return (
    <div className="bg-slate-50/30 min-h-[80vh] py-12 px-6 font-sans relative pb-28 shrink-0">
      {/* Blog Heading */}
      <div className="max-w-4xl mx-auto text-center mb-16 space-y-4">
        <div className="inline-block px-8 py-3 rounded-2xl border" style={{ backgroundColor: `${branding.primary}08`, borderColor: `${branding.primary}20` }}>
          <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight text-slate-900">Our Blogs</h1>
        </div>
        <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          Discover the latest insights, strategies, and industry secrets from our senior consultants to scale your website's organic visibility.
        </p>
      </div>

      {/* Blog Cards Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post, idx) => {
            const badges = ["Marketing Guide", "Internal Tool", "Listicles", "Case Studies", "Strategy"];
            const badge = badges[idx % badges.length];
            const featuredImg = post.featured_image_url || `https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80`;
            const formattedDate = post.publish_date 
              ? new Date(post.publish_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              : "June 22, 2026";

            return (
              <div key={post.id} className="bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full group border-slate-100">
                {/* Image and Badge */}
                <div className="aspect-[16/10] relative overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src={featuredImg}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm" style={{ backgroundColor: branding.primary, color: "#111111" }}>
                    {badge}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-grow justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-yellow-600 transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                      {post.excerpt || `Discover valuable strategic tips and advanced consulting guidelines on ${post.title}.`}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">{formattedDate}</span>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:gap-2 transition-all"
                      style={{ color: "#111111" }}
                    >
                      Read More <ArrowRight className="w-3.5 h-3.5" style={{ color: branding.primary }} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center space-y-4 bg-white rounded-3xl border border-slate-100">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-500">No blog posts found.</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Please import some posts using the ZIP importer or create them in the admin dashboard.</p>
          </div>
        )}
      </div>

      {/* Floating Pill Category/Tag Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 shrink-0">
        <div className="bg-[#0c0d0e]/90 backdrop-blur-md text-white rounded-full px-5 py-3 flex items-center gap-4 text-[11px] font-bold shadow-2xl border border-white/5 select-none">
          {["Our Team", "Qualifications", "Case Studies", "Testimonials"].map((tag) => {
            const active = activeCategory === tag;
            return (
              <button
                key={tag}
                onClick={() => {
                  setActiveCategory(tag);
                  toast.info(`Filter: ${tag}`);
                }}
                className="hover:text-yellow-400 transition-colors py-0.5 px-2 rounded-full relative"
                style={active ? { color: branding.primary } : {}}
              >
                {tag}
                {active && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: branding.primary }}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
