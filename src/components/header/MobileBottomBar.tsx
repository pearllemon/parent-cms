import { useState } from "react";
import { Mail, Phone, ChevronUp } from "lucide-react";
import { ContactSet } from "./types";

interface MobileBottomBarProps {
  contactSet: ContactSet;
  ctaText: string;
  ctaLink: string;
  ctaBg?: string;
  ctaTextColor?: string;
}

const MobileBottomBar = ({ contactSet, ctaText, ctaLink, ctaBg, ctaTextColor }: MobileBottomBarProps) => {
  const [phoneDropdownOpen, setPhoneDropdownOpen] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] md:hidden">
      {/* Phone dropdown */}
      {phoneDropdownOpen && contactSet.phones.length > 1 && (
        <div className="bg-card border border-border rounded-t-xl shadow-lg mx-2 mb-0 animate-fade-in">
          {contactSet.phones.map((phone) => (
            <a
              key={phone.id}
              href={`tel:${phone.number}`}
              className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted border-b border-border last:border-0"
            >
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{phone.label}:</span>
              <span className="text-muted-foreground">{phone.number}</span>
            </a>
          ))}
        </div>
      )}

      {/* Bottom bar */}
      <div
        className="flex items-center justify-between px-2 py-2 gap-2"
        style={{ backgroundColor: ctaBg ? `hsl(${ctaBg})` : `hsl(var(--primary))` }}
      >
        {/* Email */}
        <a
          href={`mailto:${contactSet.email}`}
          className="flex items-center justify-center w-11 h-11 rounded-lg"
          style={{ color: ctaTextColor ? `hsl(${ctaTextColor})` : `hsl(var(--primary-foreground))` }}
        >
          <Mail className="w-5 h-5" />
        </a>

        {/* CTA */}
        <a
          href={ctaLink}
          className="flex-1 text-center py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider"
          style={{
            backgroundColor: `hsl(var(--foreground))`,
            color: `hsl(var(--background))`,
          }}
        >
          {ctaText}
        </a>

        {/* Phone */}
        <button
          onClick={() => {
            if (contactSet.phones.length === 1) {
              window.location.href = `tel:${contactSet.phones[0].number}`;
            } else {
              setPhoneDropdownOpen(!phoneDropdownOpen);
            }
          }}
          className="flex items-center justify-center w-11 h-11 rounded-lg relative"
          style={{ color: ctaTextColor ? `hsl(${ctaTextColor})` : `hsl(var(--primary-foreground))` }}
        >
          <Phone className="w-5 h-5" />
          {contactSet.phones.length > 1 && (
            <ChevronUp className="w-3 h-3 absolute -top-0.5 right-0.5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default MobileBottomBar;
