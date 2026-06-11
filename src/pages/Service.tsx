import { Link, useParams } from "react-router-dom";
import Layout from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/Reveal";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { findService, services } from "@/data/services";
import { useSEO } from "@/lib/seo";
import NotFound from "./NotFound";

const Service = () => {
  const { slug = "" } = useParams();
  const svc = findService(slug);
  useSEO(
    svc
      ? {
          title: `${svc.title} | Deepak Shukla`,
          description:
            (svc as any).intro || (svc as any).summary || `Hire ${svc.title.toLowerCase()} — Deepak Shukla & the Pearl Lemon team.`,
          canonical: `/services/${svc.slug}`,
          type: "website",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Service",
            name: svc.title,
            provider: { "@type": "Person", name: "Deepak Shukla" },
            url: typeof window !== "undefined" ? `${window.location.origin}/services/${svc.slug}` : `/services/${svc.slug}`,
          },
        }
      : null,
  );
  if (!svc) return <NotFound />;

  const others = services.filter((s) => s.slug !== svc.slug).slice(0, 4);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative bg-gradient-hero overflow-hidden">
        <div aria-hidden className="absolute -top-32 -right-40 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="container relative py-20 md:py-28 grid lg:grid-cols-12 gap-10 items-center">
          <Reveal className="lg:col-span-7 space-y-6">
            <Link to="/" className="text-xs uppercase tracking-[0.3em] text-primary font-semibold hover:underline">
              ← All services
            </Link>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-balance">
              {svc.title.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="text-primary">{svc.title.split(" ").slice(-1)}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">{svc.tagline}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg">
                <Link to="/contact">{svc.cta} <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/book-a-call">Book a call</Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-leaf opacity-25 blur-2xl" />
              <div className="relative rounded-[2rem] overflow-hidden border-4 border-white shadow-pop bg-mint">
                <img src={svc.image} alt={svc.title} className="w-full h-auto object-cover" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-background">
        <div className="container py-16 md:py-20 max-w-3xl">
          <Reveal>
            <p className="text-xl md:text-2xl font-display leading-relaxed text-foreground/85 text-balance">
              {svc.intro}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-mint">
        <div className="container py-16 md:py-20">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl text-mint-foreground text-balance">
              Here’s what working with me looks like.
            </h2>
          </Reveal>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {svc.highlights.map((h, i) => (
              <Reveal key={h.title} delay={i * 100}>
                <div className="lift rounded-2xl bg-white p-6 h-full shadow-card border border-primary/10">
                  <div className="h-10 w-10 rounded-xl bg-gradient-leaf flex items-center justify-center text-white font-display text-lg mb-4">
                    {i + 1}
                  </div>
                  <h3 className="font-display text-xl">{h.title}</h3>
                  <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{h.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="bg-background">
        <div className="container py-16 md:py-20 grid lg:grid-cols-12 gap-10">
          <Reveal className="lg:col-span-5">
            <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">What you get</span>
            <h2 className="font-display text-3xl md:text-4xl mt-3 leading-tight text-balance">
              Outcomes — not deliverables theatre.
            </h2>
            <p className="text-muted-foreground mt-4">
              Every engagement is shaped to the size and speed of your business. The list on the right is what
              typically lands in scope.
            </p>
            <Button asChild className="mt-6">
              <a href={svc.externalUrl} target="_blank" rel="noopener noreferrer">
                Read the full service breakdown <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-7">
            <ul className="space-y-3">
              {svc.bullets.map((b) => (
                <li key={b} className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-soft">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span className="text-foreground/85">{b}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-gradient-forest text-forest-foreground">
        <div className="container py-14 md:py-16 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl text-balance">
              Ready to put this to work in your business?
            </h2>
            <p className="text-white/75 mt-2">30 minutes on a call and we’ll know if there’s a fit.</p>
          </Reveal>
          <Reveal delay={100} className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary hover:bg-primary-glow">
              <Link to="/book-a-call">Book a call</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
              <Link to="/contact">Send a message</Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* Other services */}
      <section className="bg-muted/60">
        <div className="container py-16">
          <h2 className="font-display text-2xl md:text-3xl mb-8">Other services</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {others.map((o) => (
              <Link
                key={o.slug}
                to={`/services/${o.slug}`}
                className="group rounded-2xl bg-card border border-border p-5 lift shadow-soft"
              >
                <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-muted">
                  <img src={o.image} alt={o.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                </div>
                <h3 className="font-display text-base group-hover:text-primary transition-colors">{o.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Service;
