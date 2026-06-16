import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Story = {
  key: string;
  tab: string;
  title: string;
  excerpt: string;
  readTime: string;
  href: string;
  image: string;
};

const stories: Story[] = [
  {
    key: "sas",
    tab: "SAS Pursuit",
    title: "My application to 21SAS (the British Special Forces)",
    readTime: "6 min",
    excerpt:
      "I want to talk through a journey I went on at the beginning of autumn 2014 — applying to 21SAS, the British Special Forces reservist programme, and getting some way into the programme itself.",
    href: "https://deepakshukla.com/applying-to-21sas-part-1/",
    image: "https://deepakshukla.com/wp-content/uploads/2021/06/image5-768x744.jpg",
  },
  {
    key: "sniper",
    tab: "Sniper Lessons",
    title: "Training with a Georgian former special forces sniper",
    readTime: "6 min",
    excerpt:
      "Before heading off into the unknown of British Special Forces selection, my friend Zurab took me through a private military training programme in Georgia.",
    href: "https://deepakshukla.com/train-with-georgian-special-forces-sniper/",
    image: "https://deepakshukla.com/wp-content/uploads/2022/12/kony-7VTeOoVXehA-unsplash-768x512.jpg",
  },
  {
    key: "soldier",
    tab: "Soldier Training",
    title: "Becoming a basically trained British Soldier (Alpha & Bravo)",
    readTime: "5 min",
    excerpt:
      "After Georgia, it was time to head out for the army assessment centre at ATC Pirbright — three days, two nights of general entry training.",
    href: "https://deepakshukla.com/applying-to-the-sas-part-2/",
    image: "https://deepakshukla.com/wp-content/uploads/2022/12/word-image-16482-1-1-768x1205.jpeg",
  },
  {
    key: "ultra",
    tab: "Ultra Challenges",
    title: "Running 5 ultramarathons in Italy, Poland, Wales and England",
    readTime: "6 min",
    excerpt:
      "August 2012 — bored of marathons, I went looking for a new challenge. Running an ultramarathon sounded like it would be a good idea.",
    href: "https://deepakshukla.com/preparing-for-a-ultramarathon/",
    image: "https://deepakshukla.com/wp-content/uploads/2022/12/1-1-768x576.jpg",
  },
  {
    key: "marathons",
    tab: "Marathon Madness",
    title: "Running 33 marathons in 20+ countries",
    readTime: "6 min",
    excerpt:
      "After my first marathon in Chicago, running became a lifestyle habit — racking up marathons across continents I didn't even live on.",
    href: "https://deepakshukla.com/running-4-marathons/",
    image: "https://deepakshukla.com/wp-content/uploads/2022/11/Untitled-768x1152.jpg",
  },
  {
    key: "ironman",
    tab: "Ironman Feat",
    title: "Completing an Ironman having never ridden a road bike",
    readTime: "6 min",
    excerpt:
      "A couple of months out from a flight to South Africa via Dubai — I was living in Turin trying to figure out my career, and signed up for Port Elizabeth.",
    href: "https://deepakshukla.com/training-with-a-paratrooper/",
    image: "https://deepakshukla.com/wp-content/uploads/2022/12/Untitled-7.jpg",
  },
  {
    key: "thai",
    tab: "Thai Triumph",
    title: "Training and winning my first Muay Thai fight in Rio, Brazil",
    readTime: "6 min",
    excerpt:
      "I stepped into the ring with my headgear on. This is what I'd been training relentlessly for — 5–6 sessions a week with pro and amateur fighters for 7 weeks.",
    href: "https://deepakshukla.com/fighting-muay-thai-and-winning/",
    image: "https://deepakshukla.com/wp-content/uploads/2022/12/1-2.jpg",
  },
];

const StoriesOfMyLife = () => {
  const [active, setActive] = useState(stories[0].key);
  const story = stories.find((s) => s.key === active) ?? stories[0];

  return (
    <section className="bg-muted/60">
      <div className="container py-16 md:py-20">
        <h2 className="font-display text-3xl sm:text-4xl mb-8">
          Stories of <span className="text-primary">My Life</span>
        </h2>

        <div className="flex gap-2 overflow-x-auto pb-3 -mx-2 px-2 mb-8 scrollbar-thin">
          {stories.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                s.key === active
                  ? "bg-primary text-primary-foreground border-primary shadow-soft"
                  : "bg-background text-foreground border-border hover:border-primary"
              }`}
            >
              {s.tab}
            </button>
          ))}
        </div>

        <div key={story.key} className="grid lg:grid-cols-2 gap-8 items-center animate-fade-in">
          <div className="rounded-2xl overflow-hidden shadow-card aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5]">
            <img src={story.image} alt={story.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="rounded-2xl border-2 border-primary/40 bg-background p-6 md:p-8 space-y-4">
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">Reading time · {story.readTime}</span>
            <h3 className="font-display text-2xl md:text-3xl leading-tight">{story.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{story.excerpt}</p>
            <Button asChild className="group">
              <a href={story.href} target="_blank" rel="noopener noreferrer">
                Learn More <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoriesOfMyLife;
