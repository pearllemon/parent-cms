import Layout from "@/components/site/Layout";
import ContactBlock from "@/components/site/ContactBlock";
import { Mail, Phone, MapPin } from "lucide-react";
import { useSEO } from "@/lib/seo";

const Contact = () => {
  useSEO({
    title: "Contact Deepak Shukla — Hire for SEO, Growth & Sales",
    description:
      "Drop a note, send a message or call my team. We’ve scaled companies from $100k/month to $1M/month.",
    canonical: "/contact",
    type: "website",
  });
  return (
  <Layout>
    <section className="bg-gradient-hero">
      <div className="container py-20 md:py-24 max-w-4xl">
        <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Contact me</span>
        <h1 className="font-display text-5xl md:text-6xl mt-3 leading-tight text-balance">
          Let’s talk about your <span className="text-primary">growth.</span>
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
          Drop a note, send a message or call my team. We’ve scaled companies from $100k/month to $1M/month —
          we’d love to do the same for you.
        </p>
      </div>
    </section>

    <section className="bg-background">
      <div className="container py-12 grid md:grid-cols-3 gap-6">
        {[
          { Icon: Phone, t: "Call us", lines: ["US +1 650 278 4421", "UK +44 207 183 3436"] },
          { Icon: Mail, t: "Email", lines: ["info@pearllemongroup.com"] },
          { Icon: MapPin, t: "Visit", lines: ["Kemp House, 152 City Road", "London EC1V 2NX"] },
        ].map(({ Icon, t, lines }) => (
          <div key={t} className="rounded-2xl border border-border p-6 bg-card shadow-soft">
            <div className="h-11 w-11 rounded-xl bg-mint flex items-center justify-center mb-3">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-lg">{t}</h3>
            {lines.map((l) => (
              <p key={l} className="text-muted-foreground text-sm">{l}</p>
            ))}
          </div>
        ))}
      </div>
    </section>

    <ContactBlock />
  </Layout>
  );
};

export default Contact;
