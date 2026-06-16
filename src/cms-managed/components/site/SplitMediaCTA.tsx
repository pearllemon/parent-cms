import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const splitGif = "https://deepakshukla.com/wp-content/uploads/2024/08/0828-1.gif";

const SplitMediaCTA = () => {
  return (
    <section className="bg-background">
      <div className="container py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-6 rounded-3xl overflow-hidden shadow-card border border-border">
          <a
            href="https://www.youtube.com/watch?v=ESBTuTdEXA8"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-video md:aspect-auto bg-black"
          >
            <img
              src="https://i.ytimg.com/vi/ESBTuTdEXA8/maxresdefault.jpg"
              alt="Trust, Reviews, and Getting Found — DesignRush Podcast"
              className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-lift group-hover:scale-110 transition-transform">
                <Play className="h-7 w-7 text-primary-foreground fill-current ml-1" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <span className="text-xs uppercase tracking-widest opacity-80">DesignRush Podcast</span>
              <h3 className="font-display text-xl md:text-2xl mt-1 leading-snug">
                You Can’t Tell What’s Real Online Anymore: Trust, Reviews, and Getting Found
              </h3>
            </div>
          </a>

          <div className="relative bg-mint p-8 md:p-12 flex flex-col justify-center">
            <img
              src={splitGif}
              alt="Deepak in motion"
              className="rounded-2xl shadow-soft mb-6 w-full max-h-72 object-cover"
              loading="lazy"
            />
            <h3 className="font-display text-2xl md:text-3xl text-mint-foreground leading-tight">
              Ready to scale your business <span className="text-primary">past seven figures?</span>
            </h3>
            <p className="text-mint-foreground/80 mt-3 mb-5">
              Hand it to me and my team — or grab 30 minutes on my calendar.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="https://pearllemon.com/call/" target="_blank" rel="noopener noreferrer">
                  Hire Me & My Team
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-forest/30 text-forest hover:bg-forest hover:text-forest-foreground">
                <Link to="/book-a-call">Book a Call</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SplitMediaCTA;
