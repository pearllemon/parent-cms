import { Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

const videos = [
  {
    id: "OklfsjUXVCE",
    title: "How To Build A 7-Figure Business That Needs Only 4 Hours Per Week",
  },
  {
    id: "vNB2Lkk4ppA",
    title: "How To Handle Sales Objections Effectively",
  },
  {
    id: "74JUbCe8N94",
    title: "The Mindset For Growth | London First Aid Training Speech",
  },
];

const YouTubeSection = () => {
  return (
    <section className="bg-background">
      <div className="container py-16 md:py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Follow Me on <span className="text-primary">YouTube</span>
          </h2>
          <Button asChild variant="outline">
            <a
              href="https://www.youtube.com/@deepakshuklaofficial/videos"
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch More <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {videos.map((v) => (
            <a
              key={v.id}
              href={`https://www.youtube.com/watch?v=${v.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block lift rounded-2xl overflow-hidden bg-card border border-border shadow-soft"
            >
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img
                  src={ytThumb(v.id)}
                  alt={v.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-14 w-14 rounded-full bg-primary/95 group-hover:scale-110 transition-transform flex items-center justify-center shadow-lift">
                    <Play className="h-6 w-6 text-primary-foreground fill-current ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-base leading-snug line-clamp-2">{v.title}</h3>
                <span className="mt-2 inline-block text-xs text-muted-foreground">Deepak Shukla · YouTube</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default YouTubeSection;
