import { useState } from "react";
import { LayoutTemplate, Palette, PanelBottom, AlertTriangle, MessageCircle, Users, Calendar, Layers, TrendingUp, FileText, Quote, BarChart3 } from "lucide-react";
import HeaderManager from "./HeaderManager";
import FooterBuilder from "./FooterBuilder";
import DesignSystem from "./DesignSystem";
import ErrorPageBuilder from "./ErrorPageBuilder";
import PopupBuilder from "./PopupBuilder";
import TeamManager from "./TeamManager";
import BookingPageBuilder from "./BookingPageBuilder";
import ServicesManager from "./ServicesManager";
import CaseStudiesManager from "./CaseStudiesManager";
import BlogPostBuilder from "./BlogPostBuilder";
import TestimonialsManager from "./TestimonialsManager";
import StatsManager from "./StatsManager";

type Section = "header" | "footer" | "design" | "error404" | "popup" | "team" | "booking" | "services" | "case-studies" | "blog-post" | "testimonials" | "stats";

const componentCards = [
  { id: "header" as Section, label: "Header", icon: LayoutTemplate, description: "Top bar, navigation, mega menu, CTA, transparent mode, mobile bottom bar" },
  { id: "footer" as Section, label: "Footer", icon: PanelBottom, description: "Footer columns, links, social media, copyright, contact form, map, locations" },
  { id: "testimonials" as Section, label: "Testimonials", icon: Quote, description: "Carousel testimonials with ratings, avatars, dark/light themes, responsive preview" },
  { id: "stats" as Section, label: "Stats / Metrics", icon: BarChart3, description: "Big number stats sections with grid, hero, and banner layouts" },
  { id: "error404" as Section, label: "404 Error Page", icon: AlertTriangle, description: "Custom error pages with search, lead capture, and branded styling" },
  { id: "popup" as Section, label: "Popups", icon: MessageCircle, description: "Exit-intent & timed popups with CTA, categories, tracking analytics" },
  { id: "team" as Section, label: "Team Members", icon: Users, description: "Central database of team members by department with head/member hierarchy" },
  { id: "booking" as Section, label: "Book a Call", icon: Calendar, description: "Calendar embeds, team display sections, and custom HTML per site" },
  { id: "services" as Section, label: "Services", icon: Layers, description: "Service pages with feature images, descriptions, and visit links" },
  { id: "case-studies" as Section, label: "Case Studies", icon: TrendingUp, description: "Zigzag layouts with results, video, and visit links per site" },
  { id: "blog-post" as Section, label: "Blog Post Design", icon: FileText, description: "Post layout templates with sidebar widgets, social sharing, AI analysis, TOC, and author box" },
  { id: "design" as Section, label: "Design Tokens", icon: Palette, description: "Global colors, typography, spacing, and component variants" },
];

const ThemeBuilder = () => {
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {!activeSection && (
        <>
          <p className="text-sm text-muted-foreground">Select a component to configure. Create shared components here, then assign them to any child site from All Sites or from the builder itself.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {componentCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  onClick={() => setActiveSection(card.id)}
                  className="pearl-card p-6 text-left transition-all group hover:ring-2 hover:ring-primary cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{card.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {activeSection && (
        <>
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Components
          </button>
          {activeSection === "header" && <HeaderManager />}
          {activeSection === "footer" && <FooterBuilder />}
          {activeSection === "design" && <DesignSystem />}
          {activeSection === "error404" && <ErrorPageBuilder />}
          {activeSection === "popup" && <PopupBuilder />}
          {activeSection === "team" && <TeamManager />}
          {activeSection === "booking" && <BookingPageBuilder />}
          {activeSection === "services" && <ServicesManager />}
          {activeSection === "case-studies" && <CaseStudiesManager />}
          {activeSection === "blog-post" && <BlogPostBuilder />}
          {activeSection === "testimonials" && <TestimonialsManager />}
          {activeSection === "stats" && <StatsManager />}
        </>
      )}
    </div>
  );
};

export default ThemeBuilder;

