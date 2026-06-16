const teamImg = "https://deepakshukla.com/wp-content/uploads/2024/08/Team-Picture-3.webp";

const press = [
  { name: "TEDx", src: "https://deepakshukla.com/wp-content/uploads/2018/06/tedx.png" },
  { name: "Semrush", src: "https://deepakshukla.com/wp-content/uploads/2018/06/semrush-1.png" },
  { name: "Huffington Post", src: "https://deepakshukla.com/wp-content/uploads/2020/10/huffington-post.png" },
  { name: "BBC", src: "https://deepakshukla.com/wp-content/uploads/2018/06/white-bbc-1.png" },
  { name: "Deloitte", src: "https://deepakshukla.com/wp-content/uploads/2018/10/Deloitte.png" },
  { name: "AppSumo", src: "https://deepakshukla.com/wp-content/uploads/2018/10/white-appsumo.png" },
  { name: "Entrepreneur", src: "https://deepakshukla.com/wp-content/uploads/2026/02/Entreprenuer.webp" },
  { name: "Inc", src: "https://deepakshukla.com/wp-content/uploads/2026/02/inc.webp" },
  { name: "SEJ", src: "https://deepakshukla.com/wp-content/uploads/2019/01/download-1.png" },
];

const TeamAndPress = () => {
  return (
    <section className="bg-background">
      <div className="container py-16 md:py-20 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <div className="relative rounded-3xl overflow-hidden shadow-card">
            <img src={teamImg} alt="Pearl Lemon team — 125+ people and growing" className="w-full h-auto" loading="lazy" />
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl px-4 py-3">
              <div className="font-display text-2xl text-forest">125+ people</div>
              <div className="text-xs text-muted-foreground">…and growing across 12 divisions</div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 space-y-5">
          <h2 className="font-display text-3xl sm:text-4xl text-balance leading-tight">
            One operator. <span className="text-primary">Twelve businesses.</span> A growing tribe.
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            From Pearl Lemon SEO to Pearl Lemon Catering, my team of 125+ specialists works across SEO, leads,
            accountancy, PR, web, games, legal, properties, pet transport, events and Lemstudio.
          </p>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {["Pearl Lemon", "Pearl Lemon Leads", "Pearl Lemon Accountants", "Pearl Lemon Properties", "Pearl Lemon PR", "Pearl Lemon Web", "Pearl Lemon Games", "Pearl Lemon Legal", "Pets Let’s Travel", "Pearl Lemon Catering", "Event Management", "Lemstudio"].map((b) => (
              <li key={b} className="flex items-center gap-2 text-foreground/80">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Press logos marquee */}
      <div className="border-y border-border bg-muted/60 py-8 overflow-hidden">
        <div className="container mb-5 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          As featured in
        </div>
        <div className="relative">
          <div className="flex marquee-track w-max gap-16 px-8 items-center">
            {[...press, ...press].map((p, i) => (
              <img
                key={p.name + i}
                src={p.src}
                alt={p.name}
                className="h-8 md:h-10 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TeamAndPress;
