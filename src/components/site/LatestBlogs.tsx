import { ArrowRight, Calendar } from "lucide-react";

const posts = [
  {
    title: "The Real Cost of Staying in London: Why I Chose Italy for Space, Savings, and Sanity",
    cat: "News",
    date: "April 2, 2026",
    image: "https://images.unsplash.com/photo-1499678329028-101435549a4e?auto=format&fit=crop&w=900&q=70",
    href: "https://deepakshukla.com/the-real-cost-of-staying-in-london/",
  },
  {
    title: "How Post-COVID London Forced Me to Rethink Home, Work, and Life — and Move to Italy",
    cat: "News",
    date: "February 8, 2026",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=70",
    href: "https://deepakshukla.com/post-covid-london-italy/",
  },
  {
    title: "Leaving London Behind: The Personal Struggle and Unexpected Joy of Starting Fresh in Italy",
    cat: "News",
    date: "February 2, 2026",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=70",
    href: "https://deepakshukla.com/leaving-london-behind/",
  },
];

const LatestBlogs = () => {
  return (
    <section className="bg-background">
      <div className="container py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl">
            Latest <span className="text-primary">Blogs</span>
          </h2>
          <p className="text-muted-foreground mt-2">Notes on business, life, and the in-between.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((p) => (
            <a key={p.title} href={p.href} target="_blank" rel="noopener noreferrer" className="group block lift rounded-2xl overflow-hidden bg-card border border-border shadow-soft">
              <div className="aspect-[16/10] overflow-hidden bg-muted">
                <img src={p.image} alt={p.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
              </div>
              <div className="p-6 space-y-3">
                <span className="inline-block bg-mint text-mint-foreground text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">{p.cat}</span>
                <h3 className="font-display text-lg leading-snug group-hover:text-primary transition-colors line-clamp-3">{p.title}</h3>
                <div className="flex items-center justify-between pt-2 text-sm">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {p.date}
                  </span>
                  <span className="inline-flex items-center gap-1 text-primary font-medium">
                    Read More <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestBlogs;
