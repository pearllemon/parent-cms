import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitLead } from "@/lib/parent";
import { toast } from "sonner";

const portrait = "https://deepakshukla.com/wp-content/uploads/2024/08/Heading-4.png";

const LearnMoreCTA = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Please share your name and email.");
      return;
    }
    setLoading(true);
    try {
      await submitLead({ ...form, message: "Wants to learn more (homepage CTA)" });
      toast.success("You’re on the list — talk soon!");
      setForm({ name: "", email: "", phone: "" });
    } catch {
      toast.error("Could not submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-gradient-forest text-forest-foreground">
      <div className="container py-16 md:py-20 grid lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-5">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl leading-tight text-balance">
            Want to <span className="text-primary-glow">Learn More?</span>
          </h2>
          <p className="text-white/85 text-lg max-w-md">
            From Deepak Shukla. <strong>7-Figure Agency Owner. 6-Figure FX Trader. SaaS Founder. Property
            Investor. Entrepreneur.</strong>
          </p>
          <form onSubmit={onSubmit} className="space-y-3 max-w-md">
            <Input
              required
              maxLength={100}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-white/95 text-foreground border-0 h-12"
            />
            <Input
              required
              type="email"
              maxLength={255}
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-white/95 text-foreground border-0 h-12"
            />
            <Input
              maxLength={32}
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-white/95 text-foreground border-0 h-12"
            />
            <p className="text-xs text-white/60">
              By clicking Sign Up you confirm that you accept our terms and conditions.
            </p>
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? "Sending…" : "Sign Up"}
            </Button>
          </form>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-leaf opacity-25 blur-3xl rounded-full" />
          <div className="relative rounded-3xl overflow-hidden border-4 border-white/20 shadow-pop">
            <img src={portrait} alt="Deepak Shukla" className="w-full h-auto" loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LearnMoreCTA;
