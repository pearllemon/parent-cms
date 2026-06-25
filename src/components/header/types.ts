export interface PhoneNumber {
  id: string;
  label: string;
  number: string;
  dialCode: string;
}

export interface ContactSet {
  id: string;
  name: string;
  email: string;
  phones: PhoneNumber[];
}

export interface MegaMenuItem {
  id: string;
  label: string;
  href: string;
}

export interface MegaMenuColumn {
  id: string;
  heading: string;
  items: MegaMenuItem[];
}

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  hasDropdown: boolean;
  megaMenu?: MegaMenuColumn[];
}

export interface HeaderTheme {
  id: string;
  name: string;
  topBarBg: string;
  topBarText: string;
  navBg: string;
  navText: string;
  logoBg: string;
  logoText: string;
  ctaBg: string;
  ctaText: string;
  ctaBorderRadius: string;
  accentColor: string;
}

export interface HeaderConfig {
  id: string;
  name: string;
  logoUrl: string;
  logoAlt: string;
  tagline: string;
  navItems: NavItem[];
  ctaText: string;
  ctaLink: string;
  contactSet: ContactSet;
  theme: HeaderTheme;
  contentMaxWidth: number;
  showProgressBar: boolean;
  transparentMode: boolean;
  stickyHeader: boolean;
}

export const defaultTheme: HeaderTheme = {
  id: "default-gold",
  name: "Pearl Lemon Gold",
  topBarBg: "0 0% 4%",
  topBarText: "0 0% 100%",
  navBg: "0 0% 100%",
  navText: "0 0% 4%",
  logoBg: "46 100% 49%",
  logoText: "0 0% 4%",
  ctaBg: "46 100% 49%",
  ctaText: "0 0% 4%",
  ctaBorderRadius: "4px",
  accentColor: "46 100% 49%",
};

export const defaultContactSet: ContactSet = {
  id: "default",
  name: "Global",
  email: "info@pearllemongroup.com",
  phones: [
    { id: "us", label: "US", number: "+16502784421", dialCode: "+1" },
    { id: "uk1", label: "UK", number: "+447454539583", dialCode: "+44" },
    { id: "uk2", label: "UK", number: "+442071833436", dialCode: "+44" },
  ],
};

export const defaultNavItems: NavItem[] = [
  {
    id: "services",
    label: "Catering Services",
    hasDropdown: true,
    megaMenu: [
      {
        id: "corporate",
        heading: "Corporate & Business",
        items: [
          { id: "c1", label: "Corporate Event and Conference Catering", href: "#" },
          { id: "c2", label: "Corporate Event Catering", href: "#" },
          { id: "c3", label: "Exhibition Catering Services", href: "#" },
          { id: "c4", label: "Financial Institution Catering", href: "#" },
          { id: "c5", label: "Fortune 500 Corporate Catering", href: "#" },
          { id: "c6", label: "Office Lunch Catering", href: "#" },
          { id: "c7", label: "Office Party Catering", href: "#" },
        ],
      },
      {
        id: "event",
        heading: "Event Catering",
        items: [
          { id: "e1", label: "Exhibition & Trade Show Catering", href: "#" },
          { id: "e2", label: "Fine Dining Event Catering", href: "#" },
          { id: "e3", label: "International Conference Catering", href: "#" },
          { id: "e4", label: "Luxury Wedding Catering London", href: "#" },
          { id: "e5", label: "Special Occasion Catering", href: "#" },
          { id: "e6", label: "VIP Sports Event Catering", href: "#" },
        ],
      },
      {
        id: "food",
        heading: "Food & Beverages",
        items: [
          { id: "f1", label: "Afternoon Tea Catering", href: "#" },
          { id: "f2", label: "BBQ Catering Services", href: "#" },
          { id: "f3", label: "Bubble Tea Catering", href: "#" },
          { id: "f4", label: "Canape Catering Services", href: "#" },
          { id: "f5", label: "Cocktail Catering Services", href: "#" },
          { id: "f6", label: "Coffee Catering Services", href: "#" },
          { id: "f7", label: "Halal Event Catering", href: "#" },
          { id: "f8", label: "Vegan Catering", href: "#" },
        ],
      },
      {
        id: "support",
        heading: "Event Support & Services",
        items: [
          { id: "s1", label: "Catering Equipment Hire", href: "#" },
          { id: "s2", label: "Event Bartender Services", href: "#" },
          { id: "s3", label: "Hospitality and Events Staff", href: "#" },
          { id: "s4", label: "Private Bartenders for Hire", href: "#" },
          { id: "s5", label: "Wedding Bartenders for Hire", href: "#" },
          { id: "s6", label: "Wedding Staffing Services", href: "#" },
        ],
      },
    ],
  },
  { id: "locations", label: "Locations Served", hasDropdown: true, megaMenu: [] },
  { id: "menus", label: "Our Menus", hasDropdown: true, megaMenu: [] },
  { id: "about", label: "About Us", hasDropdown: true, megaMenu: [] },
];

export const defaultHeaderConfig: HeaderConfig = {
  id: "default",
  name: "Default Header",
  logoUrl: "",
  logoAlt: "Pearl Lemon",
  tagline: "FOR WHEN LIFE GIVES YOU..",
  navItems: defaultNavItems,
  ctaText: "BOOK A CALL",
  ctaLink: "#",
  contactSet: defaultContactSet,
  theme: defaultTheme,
  contentMaxWidth: 1440,
  showProgressBar: true,
  transparentMode: false,
  stickyHeader: true,
};
