import { Play } from "lucide-react";

const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

const big = {
  id: "KUhGeX0Mdtc",
  title: "How your randomness will be your best strength",
  channel: "TEDxAstonUniversity",
};
const small = [
  { id: "kZpRBeKwJ7U", title: "The Secret to Recruiting for Long-term Success", channel: "TEDxHultLondonSalon" },
  { id: "dmi6nsXxuBg", title: "How Networking Died and was Born Again", channel: "TEDxCambridgeUniversity" },
];

const TedxBento = () => {
  return (
    <section className="bg-muted/60">
      <div className="container py-16 md:py-20">
        <h2 className="font-display text-3xl sm:text-4xl text-center max-w-3xl mx-auto text-balance">
          How your randomness will be your <span className="text-primary">best strength</span>
        </h2>
        <p className="text-center text-muted-foreground mt-3">| Deepak Shukla | TEDxAstonUniversity</p>

        <div className="mt-10 grid lg:grid-cols-3 gap-5">
          <a
            href={`https://www.youtube.com/watch?v=${big.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group lg:col-span-2 lg:row-span-2 relative aspect-video lg:aspect-auto rounded-2xl overflow-hidden shadow-card"
          >
            <img src={ytThumb(big.id)} alt={big.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/95 flex items-center justify-center shadow-lift group-hover:scale-110 transition-transform">
                <Play className="h-9 w-9 text-primary-foreground fill-current ml-1" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <span className="text-xs uppercase tracking-widest opacity-80">{big.channel}</span>
              <h3 className="font-display text-2xl md:text-3xl mt-1">{big.title}</h3>
            </div>
          </a>

          {small.map((v) => (
            <a
              key={v.id}
              href={`https://www.youtube.com/watch?v=${v.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-video rounded-2xl overflow-hidden shadow-card"
            >
              <img src={ytThumb(v.id)} alt={v.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/0" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-primary/95 flex items-center justify-center shadow-lift group-hover:scale-110 transition-transform">
                  <Play className="h-5 w-5 text-primary-foreground fill-current ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <span className="text-[10px] uppercase tracking-widest opacity-80">{v.channel}</span>
                <h3 className="font-semibold text-sm md:text-base mt-0.5 line-clamp-2">{v.title}</h3>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TedxBento;
