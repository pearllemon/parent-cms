import { useState } from "react";
import Layout from "@/components/site/Layout";
import Reveal from "@/components/Reveal";
import { BookOpen, Star } from "lucide-react";

type Book = {
  title: string;
  author: string;
  category: "Business" | "Sales" | "Mindset" | "Marketing" | "Biography";
  rating: number;
  cover: string;
  takeaway: string;
};

const books: Book[] = [
  {
    title: "The Hard Thing About Hard Things",
    author: "Ben Horowitz",
    category: "Business",
    rating: 5,
    cover: "https://m.media-amazon.com/images/I/71RvI3yKueL._SY425_.jpg",
    takeaway: "The honest playbook on running a company when there is no playbook. Re-read every 18 months.",
  },
  {
    title: "Shoe Dog",
    author: "Phil Knight",
    category: "Biography",
    rating: 5,
    cover: "https://m.media-amazon.com/images/I/91pBxGNRsvL._SY425_.jpg",
    takeaway: "Most honest founder memoir I’ve read. The early Nike years are pure grit and luck and obsession.",
  },
  {
    title: "$100M Offers",
    author: "Alex Hormozi",
    category: "Sales",
    rating: 5,
    cover: "https://m.media-amazon.com/images/I/71fDeI5Q5JL._SY425_.jpg",
    takeaway: "The clearest framework I’ve seen for building offers people feel stupid saying no to.",
  },
  {
    title: "Built to Sell",
    author: "John Warrillow",
    category: "Business",
    rating: 4,
    cover: "https://m.media-amazon.com/images/I/71L0fAdHcKL._SY425_.jpg",
    takeaway: "Builds the case for productising services — exactly what we did to scale Pearl Lemon.",
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    category: "Mindset",
    rating: 5,
    cover: "https://m.media-amazon.com/images/I/91bYsX41DVL._SY425_.jpg",
    takeaway: "The systems-not-goals frame changed how I think about training, business and discipline.",
  },
  {
    title: "Can’t Hurt Me",
    author: "David Goggins",
    category: "Mindset",
    rating: 5,
    cover: "https://m.media-amazon.com/images/I/91k2OdBRgKL._SY425_.jpg",
    takeaway: "Carried me through ultras, marathons and a Muay Thai fight in Rio. The 40% rule is real.",
  },
  {
    title: "SPIN Selling",
    author: "Neil Rackham",
    category: "Sales",
    rating: 5,
    cover: "https://m.media-amazon.com/images/I/71nLWoXAKKL._SY425_.jpg",
    takeaway: "Discovery questions, scientifically. Still the foundation of every sales training I run.",
  },
  {
    title: "Influence",
    author: "Robert Cialdini",
    category: "Marketing",
    rating: 5,
    cover: "https://m.media-amazon.com/images/I/71f-3sfsdgL._SY425_.jpg",
    takeaway: "The six principles of persuasion — used and abused everywhere. Understand them defensively.",
  },
  {
    title: "Traction",
    author: "Gabriel Weinberg & Justin Mares",
    category: "Marketing",
    rating: 4,
    cover: "https://m.media-amazon.com/images/I/81Fz-i+M2-L._SY425_.jpg",
    takeaway: "Bullseye framework for testing 19 channels. Stops you falling in love with one.",
  },
  {
    title: "Principles",
    author: "Ray Dalio",
    category: "Mindset",
    rating: 4,
    cover: "https://m.media-amazon.com/images/I/71fCl6qbFmL._SY425_.jpg",
    takeaway: "Radical transparency and writing your decisions down. Influences how I run team meetings.",
  },
];

const categories = ["All", "Business", "Sales", "Mindset", "Marketing", "Biography"] as const;

const Books = () => {
  const [active, setActive] = useState<(typeof categories)[number]>("All");
  const filtered = active === "All" ? books : books.filter((b) => b.category === active);

  return (
    <Layout>
      <section className="bg-gradient-hero">
        <div className="container py-20 md:py-28 max-w-4xl">
          <div className="flex items-center gap-3 mb-3 text-primary">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs uppercase tracking-[0.3em] font-semibold">Reading List</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl mt-2 leading-[0.95] text-balance">
            Books that shaped <span className="text-primary">how I think.</span>
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
            100+ self-development books read. Below are the ones I keep coming back to — sorted by what they
            actually changed in how I run businesses, train, and live.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-background border-y border-border sticky top-16 md:top-20 z-30 backdrop-blur bg-background/85">
        <div className="container py-4 flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                active === c
                  ? "bg-primary text-primary-foreground border-primary shadow-soft"
                  : "bg-background text-foreground border-border hover:border-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="bg-background">
        <div className="container py-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((b, i) => (
            <Reveal key={b.title} delay={i * 60}>
              <article className="lift h-full rounded-2xl bg-card border border-border shadow-soft overflow-hidden flex flex-col">
                <div className="bg-mint p-6 flex items-center justify-center">
                  <img
                    src={b.cover}
                    alt={`${b.title} by ${b.author}`}
                    className="h-56 w-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.25)] group-hover:scale-105 transition-transform"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "https://placehold.co/200x300/e8f5ea/2c5f2d?text=Book";
                    }}
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <span className="inline-block self-start bg-mint text-mint-foreground text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full">
                    {b.category}
                  </span>
                  <h3 className="font-display text-lg mt-3 leading-snug">{b.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">by {b.author}</p>
                  <div className="flex gap-0.5 mt-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className={`h-3.5 w-3.5 ${
                          j < b.rating ? "fill-primary text-primary" : "text-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/75 mt-3 leading-relaxed">{b.takeaway}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default Books;
