import { useState, useEffect } from "react";
import { Phone, Mail, ChevronDown, Menu } from "lucide-react";
import { HeaderConfig, defaultHeaderConfig } from "./types";
import ScrollProgressBar from "./ScrollProgressBar";
import MegaMenu from "./MegaMenu";
import MobileMenu from "./MobileMenu";
import MobileBottomBar from "./MobileBottomBar";

interface SiteHeaderProps {
  config?: HeaderConfig;
}

const SiteHeader = ({ config = defaultHeaderConfig }: SiteHeaderProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { theme, contactSet, navItems, ctaText, ctaLink, logoAlt, tagline, contentMaxWidth, showProgressBar, transparentMode } = config;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isTransparent = transparentMode && !scrolled;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        onMouseLeave={() => setActiveMegaMenu(null)}
      >
        {/* Progress Bar */}
        {showProgressBar && (
          <ScrollProgressBar color={`hsl(${theme.accentColor})`} />
        )}

        {/* Top Bar - hidden on mobile, hidden when transparent & not scrolled */}
        <div
          className={`hidden md:block transition-all duration-300 ${isTransparent ? "max-h-0 overflow-hidden opacity-0" : "max-h-12 opacity-100"}`}
          style={{
            backgroundColor: `hsl(${theme.topBarBg})`,
            color: `hsl(${theme.topBarText})`,
          }}
        >
          <div className="mx-auto flex items-center justify-center gap-6 py-2 px-6 text-xs" style={{ maxWidth: contentMaxWidth }}>
            {contactSet.phones.map((phone) => (
              <a key={phone.id} href={`tel:${phone.number}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <Phone className="w-3 h-3" style={{ color: `hsl(${theme.accentColor})` }} />
                <span className="text-muted-foreground/60">{phone.label}:</span>
                <span>{phone.number}</span>
              </a>
            ))}
            <a href={`mailto:${contactSet.email}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <Mail className="w-3 h-3" style={{ color: `hsl(${theme.accentColor})` }} />
              <span>{contactSet.email}</span>
            </a>
          </div>
        </div>

        {/* Main Nav */}
        <div
          className="transition-all duration-300 border-b"
          style={{
            backgroundColor: isTransparent ? "transparent" : `hsl(${theme.navBg})`,
            borderColor: isTransparent ? "transparent" : `hsl(var(--border))`,
          }}
        >
          <div className="mx-auto flex items-center justify-between px-6 h-16" style={{ maxWidth: contentMaxWidth }}>
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `hsl(${isTransparent ? theme.topBarText : theme.logoBg})` }}
              >
                <span className="text-base">🍋</span>
              </div>
              <div>
                <p
                  className="text-base font-bold leading-tight"
                  style={{ color: isTransparent ? `hsl(${theme.topBarText})` : `hsl(${theme.navText})`, fontStyle: "italic" }}
                >
                  {logoAlt}
                </p>
                <p
                  className="text-[8px] uppercase tracking-[0.15em] font-medium"
                  style={{ color: isTransparent ? `hsl(${theme.topBarText} / 0.7)` : `hsl(var(--muted-foreground))` }}
                >
                  {tagline}
                </p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const hasMega = item.hasDropdown && item.megaMenu && item.megaMenu.length > 0;
                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => hasMega && setActiveMegaMenu(item.id)}
                  >
                    <button
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-muted/50"
                      style={{ color: isTransparent ? `hsl(${theme.topBarText})` : `hsl(${theme.navText})` }}
                    >
                      {item.label}
                      {hasMega && <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                );
              })}
            </nav>

            {/* CTA + Hamburger */}
            <div className="flex items-center gap-3">
              <a
                href={ctaLink}
                className="hidden md:inline-flex items-center px-5 py-2 text-sm font-bold uppercase tracking-wider transition-all hover:opacity-90"
                style={{
                  backgroundColor: `hsl(${theme.ctaBg})`,
                  color: `hsl(${theme.ctaText})`,
                  borderRadius: theme.ctaBorderRadius,
                }}
              >
                {ctaText}
              </a>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2"
                style={{ color: isTransparent ? `hsl(${theme.topBarText})` : `hsl(${theme.navText})` }}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mega Menu */}
        {activeMegaMenu && (() => {
          const item = navItems.find((n) => n.id === activeMegaMenu);
          if (!item?.megaMenu?.length) return null;
          return <MegaMenu columns={item.megaMenu} maxWidth={contentMaxWidth} />;
        })()}
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navItems={navItems}
        logoAlt={logoAlt}
        tagline={tagline}
        accentColor={theme.accentColor}
      />

      {/* Mobile Bottom Bar */}
      <MobileBottomBar
        contactSet={contactSet}
        ctaText={ctaText}
        ctaLink={ctaLink}
        ctaBg={theme.ctaBg}
        ctaTextColor={theme.ctaText}
      />
    </>
  );
};

export default SiteHeader;
