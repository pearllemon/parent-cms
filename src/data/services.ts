export interface ServiceEntry {
  slug: string;
  title: string;
  description: string;
}

/**
 * Static service routes used by SEO tooling (sitemaps, audits, internal links).
 * Keep in sync with the service pages published on the site.
 */
export const services: ServiceEntry[] = [
  {
    slug: "pay-per-lead",
    title: "Pay Per Lead",
    description: "Performance-based lead generation where you only pay for qualified leads.",
  },
  {
    slug: "appointment-setting",
    title: "Appointment Setting",
    description: "Booked sales appointments delivered straight to your calendar.",
  },
  {
    slug: "cold-email-outreach",
    title: "Cold Email Outreach",
    description: "Targeted outbound email campaigns that start real conversations.",
  },
  {
    slug: "linkedin-outreach",
    title: "LinkedIn Outreach",
    description: "Social selling campaigns that reach decision makers directly.",
  },
  {
    slug: "paid-ads",
    title: "Paid Ads",
    description: "Google and Meta ad campaigns optimised for cost per qualified lead.",
  },
  {
    slug: "seo",
    title: "SEO",
    description: "Organic search growth that compounds into inbound pipeline.",
  },
];

export default services;
