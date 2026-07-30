export interface MegaMenuItem {
  id: string;
  label: string;
  href: string;
  description?: string;
}

export interface MegaMenuColumn {
  id: string;
  heading: string;
  items: MegaMenuItem[];
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  hasDropdown?: boolean;
  megaMenu?: MegaMenuColumn[];
}

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
  id: "default",
  name: "Default",
  topBarBg: "#0f172a",
  topBarText: "#f8fafc",
  navBg: "#ffffff",
  navText: "#0f172a",
  logoBg: "#ffffff",
  logoText: "#0f172a",
  ctaBg: "#2563eb",
  ctaText: "#ffffff",
  ctaBorderRadius: "9999px",
  accentColor: "#2563eb",
};

export const defaultContactSet: ContactSet = {
  id: "default",
  name: "Default Contact",
  email: "hello@example.com",
  phones: [
    { id: "phone-1", label: "Sales", number: "000 000 0000", dialCode: "+1" },
  ],
};

export const defaultHeaderConfig: HeaderConfig = {
  id: "default",
  name: "Default Header",
  logoUrl: "",
  logoAlt: "Logo",
  tagline: "",
  navItems: [],
  ctaText: "Get Started",
  ctaLink: "/contact",
  contactSet: defaultContactSet,
  theme: defaultTheme,
  contentMaxWidth: 1280,
  showProgressBar: false,
  transparentMode: false,
  stickyHeader: true,
};
