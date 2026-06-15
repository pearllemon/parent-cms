import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Item = {
  key: string;
  tab: string;
  title: string;
  bullets?: string[];
  excerpt?: string;
  cta: { label: string; href: string };
  image: string;
};

const items: Item[] = [
  {
    key: "highlights",
    tab: "Highlights",
    title: "A decade of intentional adventure",
    bullets: [
      "Living in 9 cities (Malaga, Lisbon, Lausanne, Tbilisi, Rio, Turin, Warwick, London & Malta)",
      "Backpacking across 60+ countries over a decade",
      "Hitchhiking 1,100km for a stag do in Estonia",
      "A 24-hour walk to prep for a 27-hour ultramarathon",
      "TEDx speaker · 3 talks delivered",
      "PADI Scuba Diver (20+ dives) & FA-qualified football coach",
      "Living homelessly for a week in London",
    ],
    cta: { label: "Read the full story", href: "https://deepakshukla.com/about-me/" },
    image: "https://deepakshukla.com/wp-content/uploads/2021/06/image6-768x744.png",
  },
  {
    key: "marathons",
    tab: "4 Marathons in 4 Weeks",
    title: "London, Vienna, Helsinki, Stockholm — back to back",
    excerpt:
      "When life felt uncertain I needed something solid to work toward. So I chose four marathons in four consecutive weeks. No structured build-up — the events themselves became the training. Hostels. Budget travel. Start lines stacked back to back.",
    cta: { label: "Read the story", href: "https://deepakshukla.com/running-4-marathons/" },
    image: "https://deepakshukla.com/wp-content/uploads/2026/02/My-4-Marathons-in-4-Weeks-683x1024.webp",
  },
  {
    key: "muaythai",
    tab: "Muay Thai in Rio",
    title: "From film inspiration to a ring in Rio",
    excerpt:
      "What began as inspiration from a film turned into 5–6 days a week of training with amateur and professional fighters in Brazil. The gym did not care who I was — it only cared if I showed up. Fight night was about stepping forward when stepping back would have been easier.",
    cta: { label: "Read the story", href: "https://deepakshukla.com/fighting-muay-thai-and-winning/" },
    image: "https://deepakshukla.com/wp-content/uploads/2026/02/My-Muay-Thai-Fight-in-Rio.webp",
  },
  {
    key: "tri1",
    tab: "Triathlon — Lausanne",
    title: "Two weeks of prep for an Olympic-distance triathlon",
    excerpt:
      "1.5km swim, 40km bike ride, 10km run — with two weeks of preparation. Old mountain bike. Pool sessions where I realised I was slow. Race day made it clear: a lesson in humility and resilience.",
    cta: { label: "Read part 1", href: "https://deepakshukla.com/coming-last-in-my-very-first-triathlon/" },
    image: "https://deepakshukla.com/wp-content/uploads/2026/02/My-First-Triathlon-in-Lausanne-e1772131674159-688x1024.webp",
  },
  {
    key: "tri2",
    tab: "Triathlon — Part 2",
    title: "When you realise you’re last on course",
    excerpt:
      "The swim exposed me — no wetsuit, no open water experience. The bike confirmed it — heavy frame, empty roads. Eventually a police motorbike followed behind me as the final rider on course. There’s a strange place you reach when you realise you are last. Embarrassment fades. Acceptance settles in.",
    cta: { label: "Read part 2", href: "https://deepakshukla.com/last-in-my-first-triathlon-part-2/" },
    image: "https://deepakshukla.com/wp-content/uploads/2026/02/My-First-Triathlon-in-Lausanne-Part-2-1024x683.webp",
  },
];

const Adventure = () => {
  const [active, setActive] = useState(items[0].key);
  const item = items.find((i) => i.key === active) ?? items[0];

  return (
    <section className="relative bg-gradient-forest text-forest-foreground overflow-hidden">
      <div aria-hidden className="absolute inset-0 grain opacity-30" />
      <div className="container relative py-16 md:py-20">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-center">
          Adventure
        </h2>
        <p className="text-center text-white/70 mt-2">A life lived in motion.</p>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {items.map((i) => (
            <button
              key={i.key}
              onClick={() => setActive(i.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                i.key === active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white/5 text-white/85 border-white/15 hover:bg-white/10"
              }`}
            >
              {i.tab}
            </button>
          ))}
        </div>

        <div key={item.key} className="mt-10 grid lg:grid-cols-2 gap-8 items-center animate-fade-in">
          <div className="space-y-5">
            <h3 className="font-display text-2xl md:text-3xl text-white leading-tight">{item.title}</h3>
            {item.bullets ? (
              <ul className="space-y-2.5">
                {item.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-white/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {b}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white/85 leading-relaxed">{item.excerpt}</p>
            )}
            <Button asChild className="group">
              <a href={item.cta.href} target="_blank" rel="noopener noreferrer">
                {item.cta.label} <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-pop aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] bg-white/5">
            <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Adventure;
