import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { submitLead } from "@/lib/parent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ContactBlock = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Please add your name and email.");
      return;
    }
    setLoading(true);
    try {
      // Mirror into local leads CRM (non-blocking) and parent CMS in parallel.
      const localInsert = supabase.from("leads").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone || null,
        message: form.message || null,
        source: "contact_form",
        source_url: typeof window !== "undefined" ? window.location.href : null,
      });
      await Promise.allSettled([submitLead(form), localInsert]);
      toast.success("Got it — I’ll be in touch.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast.error("Something went wrong. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="bg-mint">
      <div className="container py-16 md:py-20 grid lg:grid-cols-2 gap-10 items-start">
        <div className="space-y-5">
          <h2 className="font-display text-4xl sm:text-5xl leading-tight text-balance text-mint-foreground">
            Contact <span className="text-primary">Me</span>
          </h2>
          <p className="text-base text-mint-foreground/85 max-w-lg leading-relaxed">
            If you want me to help grow your business then you can contact one of my team here. We’ve taken
            companies from <strong>$100k per month to $1 million per month</strong> in 18 months and less.
          </p>
          <p className="text-base text-mint-foreground/80 max-w-lg leading-relaxed">
            On this site you’ll find my musings about my life, business, relationships, books I’ve read and my
            philosophies on growth — both personally and professionally.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" variant="default">
              <a href="https://pearllemon.com/call/" target="_blank" rel="noopener noreferrer">
                Hire My Team
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-forest/30 text-forest hover:bg-forest hover:text-forest-foreground">
              <Link to="/book-a-call">Book a Call</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border-4 border-primary bg-white shadow-pop p-6 md:p-8">
          <h3 className="font-display text-2xl mb-4">Drop a quick note</h3>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                required
                maxLength={100}
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                required
                type="email"
                maxLength={255}
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <Input
              maxLength={32}
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Textarea
              rows={5}
              maxLength={1000}
              placeholder="What can I help with?"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send message"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactBlock;
