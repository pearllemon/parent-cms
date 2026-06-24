import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  Menu,
  X,
  ChevronDown,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  MessageSquare,
  Globe
} from "lucide-react";
import { toast } from "sonner";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Form states for the footer contact form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Message sent! Our team will contact you shortly.");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setSubmitting(false);
    }, 1200);
  };

  const toggleDropdown = (name: string) => {
    if (activeDropdown === name) setActiveDropdown(null);
    else setActiveDropdown(name);
  };

  const navItemClass = "text-sm font-semibold text-foreground/80 hover:text-foreground flex items-center gap-1 cursor-pointer transition py-2";
  const dropdownItemClass = "block px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition";

  return (
    <div className="site-theme-root flex min-h-screen flex-col bg-background text-foreground">
      
      {/* 1. Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted-foreground/10 z-[100] select-none">
        <div 
          className="h-full bg-yellow-500 transition-all duration-75 ease-out" 
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Sticky Header Wrapper */}
      <header className="sticky top-1 z-[90] w-full bg-background shadow-sm border-b transition-all select-none">
        
        {/* 2. Black Top Bar with Contact Details */}
        <div className="bg-[#0b0c10] text-[#c5c6c7] text-[11px] py-2 px-4 hidden md:block border-b border-muted/10">
          <div className="container mx-auto flex justify-end items-center gap-6">
            <a href="tel:+442071833436" className="flex items-center gap-1.5 hover:text-yellow-500 transition">
              <Phone className="w-3 h-3 text-yellow-500" />
              <span>UK: +442071833436</span>
            </a>
            <a href="tel:+4474545439583" className="flex items-center gap-1.5 hover:text-yellow-500 transition">
              <Phone className="w-3 h-3 text-yellow-500" />
              <span>UK: +4474545439583</span>
            </a>
            <a href="tel:+16502784421" className="flex items-center gap-1.5 hover:text-yellow-500 transition">
              <Phone className="w-3 h-3 text-yellow-500" />
              <span>US: +16502784421</span>
            </a>
            <a href="mailto:info@pearllemongroup.com" className="flex items-center gap-1.5 hover:text-yellow-500 transition">
              <Mail className="w-3 h-3 text-yellow-500" />
              <span>info@pearllemongroup.com</span>
            </a>
          </div>
        </div>

        {/* 3. Main Navigation Header */}
        <div className="container mx-auto px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center font-display font-bold text-black text-lg shadow-sm">
                🍋
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-foreground">
                Pearl Lemon
              </span>
            </div>
          </Link>

          {/* Country flag selector & Menu */}
          <div className="hidden lg:flex items-center gap-6 flex-1 justify-center">
            
            {/* Country Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded border hover:bg-muted/50 transition">
                <span className="text-sm">🇬🇧</span>
                <span>UK</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
              <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-lg py-1 hidden group-hover:block w-24">
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-1.5">
                  <span>🇬🇧</span> UK
                </button>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-1.5">
                  <span>🇺🇸</span> US
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex items-center gap-6">
              
              {/* SEO Mega Menu */}
              <div className="relative group">
                <span className={navItemClass}>
                  SEO <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-popover border rounded-lg shadow-xl py-2 w-48 hidden group-hover:block transition-all animate-in fade-in-50">
                  <Link to="/seo/technical" className={dropdownItemClass}>Technical SEO</Link>
                  <Link to="/seo/local" className={dropdownItemClass}>Local SEO</Link>
                  <Link to="/seo/wordpress" className={dropdownItemClass}>WordPress SEO</Link>
                  <Link to="/seo/audit" className={dropdownItemClass}>SEO Audit</Link>
                </div>
              </div>

              {/* PPC Dropdown */}
              <div className="relative group">
                <span className={navItemClass}>
                  PPC <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-popover border rounded-lg shadow-xl py-2 w-40 hidden group-hover:block transition-all animate-in fade-in-50">
                  <Link to="/ppc/google-ads" className={dropdownItemClass}>Google Ads</Link>
                  <Link to="/ppc/remarketing" className={dropdownItemClass}>Remarketing</Link>
                </div>
              </div>

              {/* About Dropdown */}
              <div className="relative group">
                <span className={navItemClass}>
                  About <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-popover border rounded-lg shadow-xl py-2 w-40 hidden group-hover:block transition-all animate-in fade-in-50">
                  <Link to="/about/our-team" className={dropdownItemClass}>Our Team</Link>
                  <Link to="/about/why-us" className={dropdownItemClass}>Why Us</Link>
                </div>
              </div>

              {/* Contact Us */}
              <Link to="/contact" className={navItemClass}>
                Contact Us
              </Link>
            </nav>
          </div>

          {/* Action Buttons (Desktop) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Button asChild size="sm" className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold rounded-full text-xs px-4">
              <Link to="/seo/audit">GET MY FREE SEO AUDIT!</Link>
            </Button>
            <Button asChild size="sm" className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold rounded-full text-xs px-4">
              <Link to="/book-a-call">BOOK MY CALL</Link>
            </Button>
          </div>

          {/* Mobile Right Side (Flag + Hamburger) */}
          <div className="flex lg:hidden items-center gap-3 shrink-0">
            {/* Mobile Flag dropdown */}
            <div className="relative">
              <button className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded border bg-card">
                <span>🇬🇧</span>
              </button>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-background px-4 py-4 space-y-4 shadow-inner max-h-[70vh] overflow-y-auto select-none animate-in slide-in-from-top duration-200">
            <div className="space-y-1">
              {/* SEO Mobile Section */}
              <div>
                <button
                  onClick={() => toggleDropdown("seo")}
                  className="w-full flex justify-between items-center py-2 text-sm font-semibold text-foreground border-b border-muted/30"
                >
                  <span>SEO Services</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === "seo" ? "rotate-185" : ""}`} />
                </button>
                {activeDropdown === "seo" && (
                  <div className="pl-4 py-2 space-y-2 bg-muted/25 rounded-md mt-1">
                    <Link to="/seo/technical" className="block text-xs py-1 text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Technical SEO</Link>
                    <Link to="/seo/local" className="block text-xs py-1 text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Local SEO</Link>
                    <Link to="/seo/wordpress" className="block text-xs py-1 text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>WordPress SEO</Link>
                    <Link to="/seo/audit" className="block text-xs py-1 text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>SEO Audit</Link>
                  </div>
                )}
              </div>

              {/* PPC Mobile Section */}
              <div>
                <button
                  onClick={() => toggleDropdown("ppc")}
                  className="w-full flex justify-between items-center py-2 text-sm font-semibold text-foreground border-b border-muted/30"
                >
                  <span>PPC Campaign</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === "ppc" ? "rotate-185" : ""}`} />
                </button>
                {activeDropdown === "ppc" && (
                  <div className="pl-4 py-2 space-y-2 bg-muted/25 rounded-md mt-1">
                    <Link to="/ppc/google-ads" className="block text-xs py-1 text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Google Ads</Link>
                    <Link to="/ppc/remarketing" className="block text-xs py-1 text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Remarketing</Link>
                  </div>
                )}
              </div>

              {/* About Mobile Section */}
              <div>
                <button
                  onClick={() => toggleDropdown("about")}
                  className="w-full flex justify-between items-center py-2 text-sm font-semibold text-foreground border-b border-muted/30"
                >
                  <span>About Us</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === "about" ? "rotate-185" : ""}`} />
                </button>
                {activeDropdown === "about" && (
                  <div className="pl-4 py-2 space-y-2 bg-muted/25 rounded-md mt-1">
                    <Link to="/about/our-team" className="block text-xs py-1 text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Our Team</Link>
                    <Link to="/about/why-us" className="block text-xs py-1 text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Why Us</Link>
                  </div>
                )}
              </div>

              {/* Contact Link */}
              <Link
                to="/contact"
                className="block py-2 text-sm font-semibold text-foreground border-b border-muted/30"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact Us
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button asChild size="sm" className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold text-[10px] py-3 rounded-full">
                <Link to="/seo/audit" onClick={() => setMobileMenuOpen(false)}>GET FREE SEO AUDIT</Link>
              </Button>
              <Button asChild size="sm" className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold text-[10px] py-3 rounded-full">
                <Link to="/book-a-call" onClick={() => setMobileMenuOpen(false)}>BOOK MY CALL</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Body */}
      <main className="flex-1 shrink-0">{children}</main>

      {/* 4. Complete Premium Footer */}
      <footer className="bg-[#0b0c10] text-[#c5c6c7] pt-16 pb-20 md:pb-8 border-t border-muted/10 font-sans select-none">
        <div className="container mx-auto px-4 lg:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Column 1: Logo & Brief Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 text-white">
              <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center font-display font-bold text-black text-lg">
                🍋
              </div>
              <span className="font-display font-bold text-lg tracking-tight">
                Pearl Lemon
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground max-w-xs">
              Increase visibility, attract qualified leads, and convert more customers with expert SEO services.
            </p>
            <div className="pt-2">
              <p className="text-[10px] uppercase font-semibold text-yellow-500 tracking-wider mb-2">Our Internal Tool:</p>
              <div className="inline-flex items-center gap-2 bg-background/40 border px-3 py-1.5 rounded-lg">
                <span className="text-xs font-bold text-white">LemStudio</span>
                <span className="text-xs">⭐️</span>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase border-l-2 border-yellow-500 pl-2">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              {["Meet The Team", "Why Pearl Lemon", "We're Hiring!", "B2B Lead Generation", "Client Testimonials"].map((link) => (
                <li key={link}>
                  <Link to="#" className="hover:text-yellow-500 hover:underline transition text-muted-foreground">{link}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Addresses & Contact details */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase border-l-2 border-yellow-500 pl-2">Office & Contact</h4>
            
            <div className="space-y-1">
              <p className="text-xs font-semibold text-white">Pearl Lemon Ltd.</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Kemp House, 152 – 160 City Road<br />
                London, EC1V 2NX<br />
                United Kingdom
              </p>
            </div>

            <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
              <a href="tel:+442071833436" className="flex items-center gap-2 hover:text-yellow-500">
                <Phone className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                <span>UK: +442071833436</span>
              </a>
              <a href="tel:+4474545439583" className="flex items-center gap-2 hover:text-yellow-500">
                <Phone className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                <span>UK: +4474545439583</span>
              </a>
              <a href="tel:+16502784421" className="flex items-center gap-2 hover:text-yellow-500">
                <Phone className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                <span>US: +16502784421</span>
              </a>
              <a href="mailto:info@pearllemongroup.com" className="flex items-center gap-2 hover:text-yellow-500">
                <Mail className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                <span>info@pearllemongroup.com</span>
              </a>
            </div>
          </div>

          {/* Column 4: Send My Message Form */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase border-l-2 border-yellow-500 pl-2">Send Message</h4>
            <form onSubmit={handleFormSubmit} className="space-y-2">
              <input
                type="text"
                placeholder="First Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-background/40 border border-muted/30 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500 text-white"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-background/40 border border-muted/30 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500 text-white"
              />
              <input
                type="tel"
                placeholder="Phone/Mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-background/40 border border-muted/30 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500 text-white"
              />
              <textarea
                placeholder="What Can We Help You With?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={2}
                className="w-full bg-background/40 border border-muted/30 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500 text-white resize-none"
              />
              <Button type="submit" disabled={submitting} className="w-full bg-yellow-500 text-black hover:bg-yellow-600 font-bold text-xs py-2 rounded">
                {submitting ? "Sending…" : "Send My Message"}
              </Button>
            </form>
          </div>
        </div>

        {/* 5. Google Maps Embed (London Location) */}
        <div className="container mx-auto px-4 lg:px-6 mt-10 rounded-xl overflow-hidden shadow-md">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2482.383188981622!2d-0.08985168403212879!3d51.524589979637566!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48761ca94eb6c0c1%3A0xc3f83737b830d6bf!2sKemp%20House%2C%20152-160%20City%20Rd%2C%20London%20EC1V%202NX!5e0!3m2!1sen!2suk!4v1624564887358!5m2!1sen!2suk"
            width="100%"
            height="180"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            title="Office Location Map"
            className="grayscale opacity-80 contrast-125"
          />
        </div>

        {/* 6. Sub-footer with Copyright & Socials */}
        <div className="container mx-auto px-4 lg:px-6 mt-10 pt-6 border-t border-muted/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-muted-foreground">
          
          {/* Copyright text */}
          <div className="text-center md:text-left leading-relaxed">
            © 2026. All Rights Reserved | Serving Clients Since 2017 | Company Number: 10411490 | VAT Number: 252 7124 23
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-3">
            <a href="#" className="w-6 h-6 rounded-full bg-muted/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition">
              <Youtube className="w-3.5 h-3.5" />
            </a>
            <a href="#" className="w-6 h-6 rounded-full bg-muted/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition">
              <Facebook className="w-3.5 h-3.5" />
            </a>
            <a href="#" className="w-6 h-6 rounded-full bg-muted/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition">
              <Instagram className="w-3.5 h-3.5" />
            </a>
            <a href="#" className="w-6 h-6 rounded-full bg-muted/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition">
              <Twitter className="w-3.5 h-3.5" />
            </a>
            <a href="#" className="w-6 h-6 rounded-full bg-muted/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition">
              <Linkedin className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Policy Links */}
          <div className="flex items-center gap-3">
            <Link to="#" className="hover:text-yellow-500 hover:underline">Sitemap</Link>
            <span>|</span>
            <Link to="#" className="hover:text-yellow-500 hover:underline">Privacy Policy</Link>
            <span>|</span>
            <Link to="#" className="hover:text-yellow-500 hover:underline">Term of Services</Link>
          </div>
        </div>
      </footer>

      {/* 7. Sticky Mobile Bottom Bar (Only visible in mobile, hidden on desktop/tablet) */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#0b0c10] border-t border-muted/15 flex items-center justify-between px-6 z-50 md:hidden select-none">
        <a href="tel:+442071833436" className="flex flex-col items-center justify-center text-muted-foreground hover:text-yellow-500">
          <Phone className="w-5 h-5 text-yellow-500" />
          <span className="text-[8px] mt-0.5">Call</span>
        </a>
        
        <Button asChild size="sm" className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold px-6 py-2 h-9 rounded-full text-xs shrink-0 shadow-lg">
          <Link to="/book-a-call">BOOK A CALL</Link>
        </Button>

        <a href="mailto:info@pearllemongroup.com" className="flex flex-col items-center justify-center text-muted-foreground hover:text-yellow-500">
          <Mail className="w-5 h-5 text-yellow-500" />
          <span className="text-[8px] mt-0.5">Email</span>
        </a>
      </div>

    </div>
  );
}
