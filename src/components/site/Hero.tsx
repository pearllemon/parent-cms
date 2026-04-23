import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const portrait = "https://deepakshukla.com/wp-content/uploads/2024/08/Heading-4.png";

const Hero = () => {
  const [y, setY] = useState(0);

  useEffect(() => {
    const onScroll = () => setY(Math.min(window.scrollY, 400));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      {/* parallax decorative blobs */}
      <div
        aria-hidden
        style={{ transform: `translate3d(${y * 0.08}px, ${y * 0.18}px, 0)` }}
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl will-change-transform"
      />
      <div
        aria-hidden
        style={{ transform: `translate3d(${-y * 0.06}px, ${y * -0.12}px, 0)` }}
        className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-forest/15 blur-3xl will-change-transform"
      />

      <div className="container relative py-16 md:py-24 lg:py-28 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-7 animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-mint px-3 py-1.5 text-xs font-medium text-mint-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Lead investor — Pearl Lemon Group
          </span>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-balance">
            Hi, I’m <span className="text-primary">Deepak Shukla</span>.
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Hire me to publish your blended content with multiple links in it. I run{" "}
            <a className="underline decoration-primary/40 underline-offset-2 hover:text-primary" href="https://pearllemongroup.com/divisions/" target="_blank" rel="noreferrer">
              Pearl Lemon Group
            </a>{" "}
            — a 125+ person family of agencies covering SEO, leads, accounting, PR, web, games, legal & more.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="group">
              <Link to="/contact">
                Contact Me <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/book-a-call">Book a Call</Link>
            </Button>
          </div>

          <div className="flex items-center gap-6 pt-4">
            <div>
              <div className="font-display text-3xl text-forest">125+</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Team & growing</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <div className="font-display text-3xl text-forest">$1.1M+</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Annual run-rate</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <div className="font-display text-3xl text-forest">3×</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">TEDx speaker</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 relative animate-scale-in">
          <div className="relative" style={{ transform: `translate3d(0, ${y * -0.08}px, 0)` }}>
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-leaf opacity-25 blur-2xl" />
            <div className="relative rounded-[2rem] overflow-hidden border-4 border-white shadow-pop bg-mint">
              <img src={portrait} alt="Deepak Shukla" className="w-full h-auto object-cover" loading="eager" />
            </div>
            <div className="absolute -bottom-5 -left-5 bg-white shadow-card rounded-2xl px-4 py-3 flex items-center gap-3 animate-float-y">
              <div className="h-10 w-10 rounded-xl bg-gradient-leaf flex items-center justify-center text-white font-display text-lg">
                ★
              </div>
              <div className="text-xs">
                <div className="font-semibold">Trustpilot 5.0</div>
                <div className="text-muted-foreground">100+ reviews</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
