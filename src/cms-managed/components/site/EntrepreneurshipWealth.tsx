import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = {
  key: string;
  tab: string;
  title: string;
  bullets: string[];
  image: string;
};

const tabs: Tab[] = [
  {
    key: "business",
    tab: "Business",
    title: "Building a 7-figure agency from a London desk",
    bullets: [
      "Running Pearl Lemon — a 7-figure digital marketing agency (~$1.1M USD this year)",
      "How I became an SEO expert",
      "Launching a SaaS app (Word Pigeon) and failing",
      "Launching 2 Mac apps per month (Dr Hidden, Dr Cal pending) & failing",
      "Buying businesses (one is 7upsports, cloning another) & failing",
      "Raising £75k to launch an Ed-Tech platform in 2010",
      "20s ventures: Deep Impakt Recordings, Gobsmackers, Meet My Tutor, Studiobookers, The CV Guy, Haircut Heroes, The Pyjama Party",
      "Network Marketing adventures",
    ],
    image: "https://deepakshukla.com/wp-content/uploads/2021/06/image1.png",
  },
  {
    key: "investing",
    tab: "Investing",
    title: "From £250k FX accounts to ISAs and EIS",
    bullets: [
      "Putting £250k into a Forex trading account",
      "Losing £35k in one day, making £100k+",
      "EIS Schemes, ISAs, Pensions & Stocks",
    ],
    image: "https://deepakshukla.com/wp-content/uploads/2021/06/uk-money-1024x683.jpg",
  },
  {
    key: "property",
    tab: "Property",
    title: "Sourcing a portfolio I never even saw",
    bullets: [
      "Buying 5 houses/flats at once (4 of which I never saw)",
      "Using sourcing companies to avoid actually searching myself",
      "Getting a 3-bedroom house with a £54 a month mortgage",
      "Buying off-plan student accommodation",
    ],
    image: "https://deepakshukla.com/wp-content/uploads/2021/06/uk-property-1024x683.jpg",
  },
  {
    key: "personal",
    tab: "Personal Development",
    title: "1,000+ hours of therapy, 100+ self-development books",
    bullets: [
      "1,000+ hours in therapy (CBT, Psycho-dynamic, group counselling)",
      "Paid coaching with life, business & sports coaches",
      "Read 100+ self-development books",
      "Recorded 150+ rap songs, performed as a warm-up for Roll Deep, asked to manage Klashnekoff",
    ],
    image: "https://deepakshukla.com/wp-content/uploads/2021/11/hire-1024x683.jpg",
  },
];

const EntrepreneurshipWealth = () => {
  const [active, setActive] = useState(tabs[0].key);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <section className="relative bg-forest text-forest-foreground">
      <div className="container py-16 md:py-20">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-center">
          Entrepreneurship & <span className="text-primary-glow">Wealth Creation</span>
        </h2>

        <div className="mt-8 flex flex-wrap gap-2 bg-white/5 p-1.5 rounded-full max-w-fit mx-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                t.key === active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-white/85 hover:text-white"
              }`}
            >
              {t.tab}
            </button>
          ))}
        </div>

        <div key={tab.key} className="mt-12 grid lg:grid-cols-2 gap-10 items-center animate-fade-in">
          <div className="rounded-3xl overflow-hidden shadow-pop aspect-[5/4] bg-white/5">
            <img src={tab.image} alt={tab.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="space-y-5">
            <h3 className="font-display text-2xl md:text-3xl text-white leading-tight">{tab.title}</h3>
            <ul className="space-y-2.5">
              {tab.bullets.map((b) => (
                <li key={b} className="flex gap-3 text-white/90">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-glow" /> {b}
                </li>
              ))}
            </ul>
            <Button asChild>
              <a href="https://deepakshukla.com/all-services/" target="_blank" rel="noopener noreferrer">
                Explore all services <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EntrepreneurshipWealth;
