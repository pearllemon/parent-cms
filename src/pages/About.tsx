import Layout from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const About = () => {
  const stats = [
    { k: "9", v: "Cities lived in" },
    { k: "60+", v: "Countries backpacked" },
    { k: "33", v: "Marathons run" },
    { k: "3", v: "TEDx talks" },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero">
        <div className="container py-20 md:py-28 max-w-4xl">
          <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">My life</span>
          <h1 className="font-display text-5xl md:text-7xl mt-3 leading-[0.95] text-balance">
            A life lived in <span className="text-primary">motion.</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-6 max-w-2xl leading-relaxed">
            Lead investor at Pearl Lemon Group. SAS applicant. Marathon runner. Muay Thai fighter. Property
            investor. SaaS founder. TEDx speaker — three times. Below, a tiny taste of the journey.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-background border-y border-border">
        <div className="container py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.v} className="text-center">
              <div className="font-display text-4xl md:text-5xl text-primary">{s.k}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mt-2">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Bio */}
      <section className="bg-background">
        <div className="container py-16 grid lg:grid-cols-2 gap-12 max-w-6xl">
          <img
            src="https://deepakshukla.com/wp-content/uploads/2024/08/Heading-4.png"
            alt="Deepak Shukla"
            className="rounded-3xl shadow-card w-full"
            loading="lazy"
          />
          <div className="space-y-4 text-foreground/85 leading-relaxed">
            <h2 className="font-display text-3xl">Hi, I’m Deepak.</h2>
            <p>
              I’m the lead investor at the Pearl Lemon Group, which operates multiple businesses such as Pearl
              Lemon, Pearl Lemon Leads, Pearl Lemon Accountants, Pearl Lemon Properties, Pearl Lemon PR, Pearl
              Lemon Web, Pearl Lemon Games, Pearl Lemon Legal, Pets Let’s Travel, Pearl Lemon Catering, Event
              Management Services, and Lemstudio.
            </p>
            <p>
              On this site you’ll find my musings about my life, business, relationships, books I’ve read and
              my philosophies on growth — both personally and professionally.
            </p>
            <div className="flex gap-3 pt-2">
              <Button asChild>
                <Link to="/contact">
                  Get in touch <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href="https://deepakshukla.com/press-and-media/" target="_blank" rel="noreferrer">In the Press</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
