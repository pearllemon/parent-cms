import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const HEADER_LOGO = "https://deepakshukla.com/wp-content/uploads/2024/08/Deepak-Shukla.png";

const services = [
  { label: "Growth Hacking Expert", to: "/services/growth-hacking-expert-london" },
  { label: "Communications Consultant", to: "/services/communications-consultant" },
  { label: "Digital Marketing Expert", to: "/services/digital-marketing-expert" },
  { label: "Sales Trainer", to: "/services/sales-trainer-london" },
  { label: "Sales Expert", to: "/services/sales-expert-london" },
  { label: "Negative SEO Removal", to: "/services/negative-seo-removal" },
  { label: "Heatmaps Expert", to: "/services/heatmaps-expert" },
  { label: "Google Analytics Expert", to: "/services/google-analytics-expert" },
];

const aboutItems = [
  { label: "My Life", to: "/about" },
  { label: "In The Press", to: "/press" },
  { label: "Reading List", to: "/books" },
];

const pingItems = [
  { label: "Contact Me", to: "/contact" },
  { label: "Hire My Team", href: "https://pearllemon.com/call" },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Top utility bar */}
      <div className="hidden md:block bg-forest text-forest-foreground text-xs">
        <div className="container flex h-9 items-center justify-between">
          <div className="flex items-center gap-5 opacity-90">
            <a href="tel:+442071833436" className="flex items-center gap-1.5 hover:text-white">
              <Phone className="h-3 w-3" /> UK +44 207 183 3436
            </a>
            <a href="mailto:info@pearllemongroup.com" className="hover:text-white">
              info@pearllemongroup.com
            </a>
          </div>
          <a
            href="https://pearllemongroup.com/divisions/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
            A Pearl Lemon Group company →
          </a>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 w-full border-b border-border/60 backdrop-blur transition-all ${
          scrolled ? "bg-background/95 shadow-soft" : "bg-background/80"
        }`}
      >
        <div className="container flex h-16 md:h-20 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={HEADER_LOGO} alt="Deepak Shukla" className="h-8 md:h-10 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            <DropdownNav label="All Services" items={services} />
            <DropdownNav
              label="About Me"
              items={aboutItems.map((i) => ({ label: i.label, href: i.href, to: i.to }))}
            />
            <NavLink
              to="/blog"
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive ? "text-primary" : "text-foreground hover:text-primary"
                }`
              }
            >
              Blog
            </NavLink>
            <DropdownNav
              label="Ping Me"
              items={pingItems.map((i) => ({ label: i.label, href: i.href, to: i.to }))}
            />
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/contact">Contact</Link>
            </Button>
            <Button asChild size="sm" variant="default">
              <Link to="/book-a-call">Book a Call</Link>
            </Button>
          </div>

          <button
            className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted"
            onClick={() => setOpen((s) => !s)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden border-t border-border bg-background animate-fade-in">
            <div className="container py-4 flex flex-col gap-1">
              <MobileGroup label="All Services" items={services} />
              <MobileGroup label="About Me" items={aboutItems} />
              <Link to="/blog" onClick={() => setOpen(false)} className="py-2.5 px-2 text-sm font-medium">
                Blog
              </Link>
              <MobileGroup label="Ping Me" items={pingItems} />
              <div className="flex gap-2 pt-3">
                <Button asChild variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  <Link to="/contact">Contact</Link>
                </Button>
                <Button asChild className="flex-1" onClick={() => setOpen(false)}>
                  <Link to="/book-a-call">Book a Call</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

type DropItem = { label: string; href?: string; to?: string };

const DropdownNav = ({ label, items }: { label: string; items: DropItem[] }) => (
  <div className="relative group">
    <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
      {label} <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
    </button>
    <div className="absolute left-0 top-full pt-2 w-64 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all">
      <div className="rounded-lg border border-border bg-popover shadow-card p-2">
        {items.map((it) =>
          it.to ? (
            <Link
              key={it.label}
              to={it.to}
              className="block rounded-md px-3 py-2 text-sm hover:bg-mint hover:text-mint-foreground"
            >
              {it.label}
            </Link>
          ) : (
            <a
              key={it.label}
              href={it.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md px-3 py-2 text-sm hover:bg-mint hover:text-mint-foreground"
            >
              {it.label}
            </a>
          )
        )}
      </div>
    </div>
  </div>
);

const MobileGroup = ({ label, items }: { label: string; items: DropItem[] }) => (
  <details className="group border-b border-border/60 last:border-0">
    <summary className="flex items-center justify-between py-2.5 px-2 cursor-pointer text-sm font-semibold list-none">
      {label}
      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
    </summary>
    <div className="pl-4 pb-2 flex flex-col">
      {items.map((it) =>
        it.to ? (
          <Link key={it.label} to={it.to} className="py-1.5 text-sm text-muted-foreground hover:text-primary">
            {it.label}
          </Link>
        ) : (
          <a
            key={it.label}
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 text-sm text-muted-foreground hover:text-primary"
          >
            {it.label}
          </a>
        )
      )}
    </div>
  </details>
);

export default Header;
