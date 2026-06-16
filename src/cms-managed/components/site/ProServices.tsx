import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

type Service = {
  title: string;
  to: string;
  img: string;
  tint: string;
};

const services: Service[] = [
  { title: "Sales Expert London", to: "/services/sales-expert-london", img: "https://deepakshukla.com/wp-content/uploads/2024/08/sales-expert.png", tint: "from-emerald-700/80 to-emerald-900/90" },
  { title: "Growth Hacking Expert London", to: "/services/growth-hacking-expert-london", img: "https://deepakshukla.com/wp-content/uploads/2024/08/JSHFJS.png", tint: "from-emerald-600/80 to-teal-900/90" },
  { title: "Heatmaps Expert", to: "/services/heatmaps-expert", img: "https://deepakshukla.com/wp-content/uploads/2024/08/BLUE.png", tint: "from-sky-700/80 to-indigo-900/90" },
  { title: "Negative SEO Removal", to: "/services/negative-seo-removal", img: "https://deepakshukla.com/wp-content/uploads/2024/08/Negative-Seo.png", tint: "from-stone-700/80 to-stone-900/90" },
  { title: "Communications Consultant", to: "/services/communications-consultant", img: "https://deepakshukla.com/wp-content/uploads/2024/08/1sr.png", tint: "from-amber-700/80 to-rose-900/90" },
  { title: "Digital Marketing Expert", to: "/services/digital-marketing-expert", img: "https://deepakshukla.com/wp-content/uploads/2024/08/3rd-by-me.png", tint: "from-emerald-600/80 to-emerald-900/90" },
  { title: "Google Analytics Expert", to: "/services/google-analytics-expert", img: "https://deepakshukla.com/wp-content/uploads/2024/08/4th-11.png", tint: "from-cyan-700/80 to-blue-900/90" },
  { title: "Sales Trainer London", to: "/services/sales-trainer-london", img: "https://deepakshukla.com/wp-content/uploads/2024/08/5th-11.png", tint: "from-lime-700/80 to-emerald-900/90" },
  { title: "Google Search Console", to: "/services/google-search-console-expert", img: "https://deepakshukla.com/wp-content/uploads/2024/08/6th-11.png", tint: "from-violet-700/80 to-fuchsia-900/90" },
];

const ProServices = () => {
  const [page, setPage] = useState(0);
  const [perView, setPerView] = useState(4);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setPerView(w < 640 ? 1 : w < 1024 ? 2 : w < 1280 ? 3 : 4);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const pages = Math.max(1, Math.ceil(services.length / perView));
  const safePage = Math.min(page, pages - 1);
  const visible = services.slice(safePage * perView, safePage * perView + perView);

  return (
    <section className="bg-background">
      <div className="container py-16 md:py-20">
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Pro <span className="text-primary">Services</span>
          </h2>
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => setPage((p) => (p - 1 + pages) % pages)}
              className="h-10 w-10 rounded-full border border-border hover:bg-mint hover:border-primary transition-colors flex items-center justify-center"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setPage((p) => (p + 1) % pages)}
              className="h-10 w-10 rounded-full border border-border hover:bg-mint hover:border-primary transition-colors flex items-center justify-center"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((s) => (
            <Link
              key={s.title}
              to={s.to}
              className="group relative aspect-[4/5] rounded-2xl overflow-hidden lift shadow-card"
            >
              <img src={s.img} alt={s.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
              <div className={`absolute inset-0 bg-gradient-to-t ${s.tint}`} />
              <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
                <h3 className="font-display text-xl leading-tight">{s.title}</h3>
                <span className="mt-2 inline-flex items-center gap-1 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`Go to page ${i + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                i === safePage ? "w-8 bg-primary" : "w-2.5 bg-border hover:bg-primary/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProServices;
