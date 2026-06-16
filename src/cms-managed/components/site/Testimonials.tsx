import { Star, ExternalLink } from "lucide-react";

const testimonials = [
  {
    name: "Carl O",
    quote:
      "Deepak possesses such a drive for achievement, always including and caring for others along his journey. He is a leader, with a passion for self development. He has an incredible pro-active energy which sets him apart from most, always coming from a place of great integrity, value and authenticity.",
  },
  {
    name: "Oli P",
    quote:
      "Deepak has worked with us, perfecting our marketing strategy. His knowledge of the inbound and outbound marketing industry is unbeatable. If 10 stars were available I would be issuing them. His six-figure lead gen course pushed my agency to another level.",
  },
];

const Testimonials = () => {
  return (
    <section className="relative bg-gradient-forest text-forest-foreground overflow-hidden">
      <div aria-hidden className="absolute inset-0 opacity-40 grain" />
      <div className="container relative py-20 md:py-24">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-center max-w-4xl mx-auto leading-tight text-balance">
          What award-winning and critically acclaimed entrepreneurs <span className="text-primary-glow">say about Deepak?</span>
        </h2>

        <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-7 shadow-soft hover:bg-white/[0.08] transition-colors"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary-glow text-primary-glow" />
                ))}
              </div>
              <p className="text-white/90 leading-relaxed">{t.quote}</p>
              <div className="mt-5 font-display text-lg">— {t.name}</div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <a
            href="https://www.trustpilot.com/review/www.deepakshukla.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary-glow transition-colors"
          >
            Read more testimonials <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
