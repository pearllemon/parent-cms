import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Twitter, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { submitLead } from "@/lib/parent";
import { toast } from "sonner";

const FOOTER_LOGO = "https://deepakshukla.com/wp-content/uploads/2018/06/Logo-DS-New-.webp";

const Footer = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Please share your name and email.");
      return;
    }
    setLoading(true);
    try {
      await submitLead(form);
      toast.success("Thanks — we’ll be in touch shortly.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast.error("Could not send right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="relative bg-forest text-forest-foreground">
      <div className="container py-16 grid gap-12 lg:grid-cols-12">
        {/* Brand */}
        <div className="lg:col-span-4 space-y-5">
          <img src={FOOTER_LOGO} alt="Deepak Shukla" className="h-12 w-auto" />
          <p className="text-sm text-white/75 max-w-sm">
            Hire our SEO agency Pearl Lemon. Lead investor at the Pearl Lemon Group — operating 12+ businesses
            from London, with 125+ team members worldwide.
          </p>
          <div className="flex items-center gap-3">
            {[
              { Icon: Facebook, href: "https://www.facebook.com/deepakshukla" },
              { Icon: Instagram, href: "https://www.instagram.com/deepakshuklaofficial" },
              { Icon: Linkedin, href: "https://www.linkedin.com/in/deepakshukla1/" },
              { Icon: Twitter, href: "https://twitter.com/deepakshukla" },
              { Icon: Youtube, href: "https://www.youtube.com/@deepakshuklaofficial" },
            ].map(({ Icon, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="lg:col-span-2">
          <h4 className="font-display text-lg mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-sm text-white/80">
            <li><Link to="/about" className="hover:text-primary">About Us</Link></li>
            <li><Link to="/blog" className="hover:text-primary">Blog</Link></li>
            <li><a href="https://deepakshukla.com/all-services/" className="hover:text-primary" target="_blank" rel="noreferrer">Services</a></li>
            <li><Link to="/contact" className="hover:text-primary">Contact Me</Link></li>
            <li><Link to="/book-a-call" className="hover:text-primary">Book A Call</Link></li>
          </ul>
        </div>

        {/* Contact info */}
        <div className="lg:col-span-3">
          <h4 className="font-display text-lg mb-4">Contact Us</h4>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 text-primary" /> US +1 650 278 4421</li>
            <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 text-primary" /> UK +44 207 183 3436</li>
            <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 text-primary" /> UK +44 7454 539 583</li>
            <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 text-primary" /> info@pearllemongroup.com</li>
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-primary" /> Kemp House, 152 City Road, London EC1V 2NX</li>
          </ul>
        </div>

        {/* Footer form */}
        <div className="lg:col-span-3">
          <h4 className="font-display text-lg mb-4">Send a message</h4>
          <form onSubmit={onSubmit} className="space-y-2.5">
            <Input
              required
              maxLength={100}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-white/95 text-foreground border-white/20"
            />
            <Input
              required
              type="email"
              maxLength={255}
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-white/95 text-foreground border-white/20"
            />
            <Input
              maxLength={32}
              placeholder="Phone No"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-white/95 text-foreground border-white/20"
            />
            <Textarea
              maxLength={1000}
              rows={3}
              placeholder="Message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="bg-white/95 text-foreground border-white/20"
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Send"}
            </Button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/65">
          <p>© 2026 All rights Reserved. Design by{" "}
            <a className="text-primary hover:underline" href="https://pearllemonweb.com" target="_blank" rel="noreferrer">
              Pearl Lemon Web
            </a>
          </p>
          <div className="flex items-center gap-5">
            <a href="https://deepakshukla.com/sitemap_index.xml" className="hover:text-white">Sitemap</a>
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
