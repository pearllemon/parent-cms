import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { useSiteConfig } from "@/providers/SiteProvider";

type EP = {
  bg_color?: string;
  text_color?: string;
  accent_color?: string;
  image_url?: string;
  heading?: string;
  subheading?: string;
  description?: string;
  cta_text?: string;
  show_search?: boolean;
  search_placeholder?: string;
};

const NotFound = () => {
  const location = useLocation();
  const { config } = useSiteConfig();
  const ep = (config?.errorPageConfig as EP) || null;

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  if (ep) {
    return (
      <Layout>
        <section
          style={{
            background: ep.bg_color ? `hsl(${ep.bg_color})` : undefined,
            color: ep.text_color ? `hsl(${ep.text_color})` : undefined,
          }}
          className="min-h-[70vh] flex flex-col items-center justify-center text-center container py-20"
        >
          {ep.image_url && <img src={ep.image_url} alt="404" className="w-56 mb-6" loading="lazy" />}
          <h1 className="font-display text-5xl md:text-6xl">{ep.heading || "404"}</h1>
          {ep.subheading && <p className="text-xl mt-2">{ep.subheading}</p>}
          {ep.description && <p className="mt-4 max-w-md opacity-80">{ep.description}</p>}
          {ep.show_search && (
            <input
              placeholder={ep.search_placeholder || "Search…"}
              className="mt-6 px-4 py-2 rounded border w-80 text-foreground"
            />
          )}
          <Button asChild className="mt-6" style={ep.accent_color ? { background: `hsl(${ep.accent_color})` } : undefined}>
            <Link to="/">{ep.cta_text || "Back home"}</Link>
          </Button>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="container py-24 md:py-32 text-center max-w-2xl">
        <div className="font-display text-[8rem] md:text-[12rem] leading-none text-primary">404</div>
        <h1 className="font-display text-3xl md:text-4xl mt-2">Page not found</h1>
        <p className="text-muted-foreground mt-4">
          That route doesn’t exist on this site. Let’s get you back to something useful.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <Button asChild>
            <Link to="/">Back home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contact">Contact me</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
