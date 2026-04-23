import Layout from "@/components/site/Layout";
import { Calendar, ArrowRight } from "lucide-react";

const posts = [
  { title: "The Real Cost of Staying in London: Why I Chose Italy for Space, Savings, and Sanity", date: "April 2, 2026", cat: "News", image: "https://images.unsplash.com/photo-1499678329028-101435549a4e?auto=format&fit=crop&w=900&q=70", href: "https://deepakshukla.com/the-real-cost-of-staying-in-london/" },
  { title: "How Post-COVID London Forced Me to Rethink Home, Work, and Life — and Move to Italy", date: "February 8, 2026", cat: "News", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=70", href: "https://deepakshukla.com/post-covid-london-italy/" },
  { title: "Leaving London Behind: The Personal Struggle and Unexpected Joy of Starting Fresh in Italy", date: "February 2, 2026", cat: "News", image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=70", href: "https://deepakshukla.com/leaving-london-behind/" },
  { title: "How To Build A 7-Figure Business That Needs Only 4 Hours Per Week", date: "March 18, 2026", cat: "Business", image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=70", href: "https://www.youtube.com/watch?v=OklfsjUXVCE" },
  { title: "How To Handle Sales Objections Effectively", date: "March 4, 2026", cat: "Sales", image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=70", href: "https://www.youtube.com/watch?v=vNB2Lkk4ppA" },
  { title: "The Mindset For Growth | Conference With Greek Business Owners", date: "February 22, 2026", cat: "Mindset", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=70", href: "https://www.youtube.com/watch?v=74JUbCe8N94" },
];

const Blog = () => (
  <Layout>
    <section className="bg-gradient-hero">
      <div className="container py-20 md:py-24 max-w-4xl">
        <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Blog</span>
        <h1 className="font-display text-5xl md:text-6xl mt-3 leading-tight text-balance">
          Notes from the <span className="text-primary">field.</span>
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl">
          Business, life, relationships, books, and the lessons I keep learning the hard way.
        </p>
      </div>
    </section>

    <section className="bg-background">
      <div className="container py-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </section>
  </Layout>
);

export default Blog;
