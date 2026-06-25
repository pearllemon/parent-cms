import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { NavItem } from "./types";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  logoAlt: string;
  tagline: string;
  accentColor?: string;
}

const MobileMenu = ({ isOpen, onClose, navItems, logoAlt, tagline, accentColor }: MobileMenuProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: accentColor ? `hsl(${accentColor})` : `hsl(var(--primary))` }}
          >
            <span className="text-xs font-bold" style={{ color: `hsl(var(--primary-foreground))` }}>🍋</span>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{logoAlt}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{tagline}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="overflow-y-auto h-[calc(100vh-4rem)] p-4 space-y-1">
        {navItems.map((item) => {
          const hasMega = item.megaMenu && item.megaMenu.length > 0;
          const isExpanded = expandedId === item.id;

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasMega) {
                    setExpandedId(isExpanded ? null : item.id);
                  } else {
                    onClose();
                  }
                }}
                className="flex items-center justify-between w-full px-3 py-3 text-sm font-medium text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <span>{item.label}</span>
                {hasMega && (isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
              </button>

              {hasMega && isExpanded && (
                <div className="pl-3 pb-2 space-y-3 animate-fade-in">
                  {item.megaMenu!.map((col) => (
                    <div key={col.id} className="pl-3 border-l-2 border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pt-2">
                        {col.heading}
                      </p>
                      {col.items.map((link) => (
                        <a
                          key={link.id}
                          href={link.href}
                          className="block py-1.5 text-sm text-foreground/80 hover:text-foreground"
                          onClick={onClose}
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileMenu;
