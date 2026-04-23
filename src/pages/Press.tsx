import Layout from "@/components/site/Layout";
import Reveal from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mic, Newspaper, Radio } from "lucide-react";

const tedx = [
  { id: "kZpRBeKwJ7U", title: "The Secret to Recruiting for Long-term Success", venue: "TEDxHultLondonSalon" },
  { id: "KUhGeX0Mdtc", title: "How your randomness will be your best strength", venue: "TEDxAstonUniversity" },
  { id: "dmi6nsXxuBg", title: "How Networking Died and was Born Again", venue: "TEDxCambridgeUniversity" },
];

const podcasts = [
  { id: "ESBTuTdEXA8", title: "You Can’t Tell What’s Real Online Anymore: Trust, Reviews, and Getting Found", show: "DesignRush Podcast" },
  { id: "OklfsjUXVCE", title: "How To Build A 7-Figure Business That Needs Only 4 Hours Per Week", show: "Deepak Shukla Official" },
  { id: "vNB2Lkk4ppA", title: "How To Handle Sales Objections Effectively", show: "Deepak Shukla Official" },
  { id: "74JUbCe8N94", title: "The Mindset For Growth | Conference With Greek Business Owners", show: "Deepak Shukla Official" },
];

const features = [
  { name: "Entrepreneur", logo: "https://deepakshukla.com/wp-content/uploads/2026/02/Entreprenuer.webp" },
  { name: "Inc", logo: "https://deepakshukla.com/wp-content/uploads/2026/02/inc.webp" },
  { name: "Search Engine Journal", logo: "https://deepakshukla.com/wp-content/uploads/2019/01/download-1.png" },
  { name: "TEDx", logo: "https://deepakshukla.com/wp-content/uploads/2018/06/tedx.png" },
  { name: "Semrush", logo: "https://deepakshukla.com/wp-content/uploads/2018/06/semrush-1.png" },
  { name: "Huffington Post", logo: "https://deepakshukla.com/wp-content/uploads/2020/10/huffington-post.png" },
  { name: "BBC", logo: "https://deepakshukla.com/wp-content/uploads/2018/06/white-bbc-1.png" },
  { name: "Deloitte", logo: "https://deepakshukla.com/wp-content/uploads/2018/10/Deloitte.png" },
  { name: "AppSumo", logo: "https://deepakshukla.com/wp-content/uploads/2018/10/white-appsumo.png" },
];

const Press = () => (
  <Layout>
    <section className="bg-gradient-hero">
      <div className="container py-20 md:py-28 max-w-4xl">
        <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Press & Media</span>
        <h1 className="font-display text-5xl md:text-7xl mt-3 leading-[0.95] text-balance">
          Conversations, talks, <span className="text-primary">and headlines.</span>
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
          From TEDx stages to industry podcasts and tier-one publications — a snapshot of where Deepak has been
          quoted, hosted and invited to speak.
        </p>
      </div>
    </section>

    {/* Featured in */}
    <section className="bg-background border-y border-border">
      <div className="container py-12">
        <Reveal>
          <h2 className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">As featured in</h2>
        </Reveal>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-8 items-center">
          {features.map((f, i) => (
            <Reveal key={f.name} delay={i * 40}>
              <img src={f.logo} alt={f.name} className="h-10 w-auto mx-auto object-contain opacity-70 hover:opacity-100 transition-opacity" loading="lazy" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* TEDx */}
    <section className="bg-mint">
      <div className="container py-16 md:py-20">
        <Reveal>
          <div className="flex items-center gap-3 mb-3 text-primary">
            <Mic className="h-5 w-5" />
            <span className="text-xs uppercase tracking-[0.3em] font-semibold">TEDx Speaker</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-mint-foreground text-balance">
            Three TEDx talks. Three universities. One thread — randomness as advantage.
          </h2>
        </Reveal>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {tedx.map((t, i) => (
            <Reveal key={t.id} delay={i * 100}>
              <a
                href={`https://www.youtube.com/watch?v=${t.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block lift rounded-2xl overflow-hidden bg-white shadow-card border border-primary/10"
              >
                <div className="aspect-video overflow-hidden bg-muted">
                  <img src={`https://i.ytimg.com/vi/${t.id}/maxresdefault.jpg`} alt={t.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                </div>
                <div className="p-5">
                  <span className="text-xs uppercase tracking-widest text-primary font-semibold">{t.venue}</span>
                  <h3 className="font-display text-lg mt-2 leading-snug">{t.title}</h3>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* Podcasts */}
    <section className="bg-background">
      <div className="container py-16 md:py-20">
        <Reveal>
          <div className="flex items-center gap-3 mb-3 text-primary">
            <Radio className="h-5 w-5" />
            <span className="text-xs uppercase tracking-[0.3em] font-semibold">Podcasts & Interviews</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-balance">Long-form conversations on growth, sales and sanity.</h2>
        </Reveal>
        <div className="mt-10 grid sm:grid-cols-2 gap-6">
          {podcasts.map((p, i) => (
            <Reveal key={p.id} delay={i * 80}>
              <a href={`https://www.youtube.com/watch?v=${p.id}`} target="_blank" rel="noopener noreferrer" className="group block lift rounded-2xl overflow-hidden bg-card border border-border shadow-soft">
                <div className="grid grid-cols-[160px_1fr]">
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img src={`https://i.ytimg.com/vi/${p.id}/hqdefault.jpg`} alt={p.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  </div>
                  <div className="p-4">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{p.show}</span>
                    <h3 className="font-display text-base leading-snug mt-1 line-clamp-3 group-hover:text-primary transition-colors">{p.title}</h3>
                  </div>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* Press CTA */}
    <section className="bg-gradient-forest text-forest-foreground">
      <div className="container py-14 md:py-16 grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <Reveal>
          <div className="flex items-center gap-3 mb-2 text-primary-glow">
            <Newspaper className="h-5 w-5" />
            <span className="text-xs uppercase tracking-[0.3em] font-semibold">Press enquiries</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl text-balance">Writing a piece, hosting a podcast, or planning a panel?</h2>
        </Reveal>
        <Reveal delay={100}>
          <Button asChild size="lg" className="bg-primary hover:bg-primary-glow">
            <a href="mailto:info@pearllemongroup.com">Email press team <ExternalLink className="ml-1 h-4 w-4" /></a>
          </Button>
        </Reveal>
      </div>
    </section>
  </Layout>
);

export default Press;
