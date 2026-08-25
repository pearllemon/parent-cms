export interface OnboardingFormItem {
  id: string;
  title: string;
  slug: string;
  path: string;
  category: string;
  iconName: string;
  paperformId?: string | null;
  excerpt: string;
}

export const ONBOARDING_CATEGORIES = [
  "All",
  "Omnichannel & Growth",
  "SEO & Search Marketing",
  "Lead Generation & Sales",
  "PR & Outreach",
  "Web Design & Dev",
  "Operations & Internal",
  "General Onboarding"
] as const;

export const ONBOARDING_FORMS: OnboardingFormItem[] = [
  {
    id: "d1ee636f-9d0d-4ff1-9f1a-858bfaff7815",
    title: "Omnichannel Client Lead Generation Form",
    slug: "omnichannel-client-lead-generation-form",
    path: "/omnichannel-client-lead-generation-form/",
    category: "Omnichannel & Growth",
    iconName: "Layers",
    paperformId: "omnichannel-leadgenform",
    excerpt: "Primary intake portal for multi-channel client acquisition, outreach infrastructure, and inbound/outbound sync."
  },
  {
    id: "efcfea40-ecab-4692-aff6-e66d290d2a86",
    title: "Omnichannel Onboarding",
    slug: "omnichannel-onboarding",
    path: "/omnichannel-onboarding/",
    category: "Omnichannel & Growth",
    iconName: "Layers",
    paperformId: "omnichannel-leadgenform",
    excerpt: "Comprehensive campaign parameters intake for full omnichannel growth, sequences, and automation pipelines."
  },
  {
    id: "26fe6e00-ed59-4fd8-9076-d613794d45a6",
    title: "SEO Onboarding",
    slug: "seo-onboarding",
    path: "/seo-onboarding/",
    category: "SEO & Search Marketing",
    iconName: "Search",
    paperformId: null,
    excerpt: "SEO project onboarding: website architecture, search goals, keyword targets, Google Search Console, and analytics setup."
  },
  {
    id: "b093b77a-7d6c-405b-bcf9-8d9754b3286a",
    title: "SEO Client Onboarding",
    slug: "seo-client-onboarding",
    path: "/seo-client-onboarding/",
    category: "SEO & Search Marketing",
    iconName: "Search",
    paperformId: null,
    excerpt: "Detailed search engine optimization briefing form for technical audits, backlink profiles, and content strategy."
  },
  {
    id: "6c0c0bec-1a18-4f32-baae-de19fb84a385",
    title: "Walmart SEO Onboarding",
    slug: "walmart-seo-onboarding",
    path: "/walmart-seo-onboarding/",
    category: "SEO & Search Marketing",
    iconName: "Search",
    paperformId: null,
    excerpt: "Marketplace optimization intake for Walmart seller accounts, product listing rankings, and sponsored advertising."
  },
  {
    id: "f4716732-ec63-4b16-b588-30392ca74821",
    title: "YouTube SEO Client Onboarding Form",
    slug: "youtube-seo-client-onboarding-form",
    path: "/youtube-seo-client-onboarding-form/",
    category: "SEO & Search Marketing",
    iconName: "Search",
    paperformId: null,
    excerpt: "Video search optimization intake: YouTube channel access, audience targeting, metadata tags, and video content pipeline."
  },
  {
    id: "28e23f03-6e3e-46cf-ab17-3aa575d33682",
    title: "Cold Email & B2B Lead Generation Onboarding",
    slug: "cold-email-lead-generation-onboarding",
    path: "/cold-email-lead-generation-onboarding/",
    category: "Lead Generation & Sales",
    iconName: "TrendingUp",
    paperformId: null,
    excerpt: "Outbound campaign launch form: ICP definition, email domain warming, messaging angles, and inbox deliverability parameters."
  },
  {
    id: "5da9142f-8761-460d-83b4-f3c984da09c4",
    title: "Appointment Setting Onboarding",
    slug: "appointment-setting-onboarding",
    path: "/appointment-setting-onboarding/",
    category: "Lead Generation & Sales",
    iconName: "TrendingUp",
    paperformId: null,
    excerpt: "Sales appointment setting configuration: calendar integration, qualifying criteria, target accounts, and objections playbook."
  },
  {
    id: "9729a502-d900-47bf-b306-38bf6417be1f",
    title: "LinkedIn Lead Generation Onboarding",
    slug: "linkedin-lead-generation-onboarding",
    path: "/linkedin-lead-generation-onboarding/",
    category: "Lead Generation & Sales",
    iconName: "TrendingUp",
    paperformId: null,
    excerpt: "LinkedIn outreach intake: target job titles, Sales Navigator searches, connection copy, and conversation workflows."
  },
  {
    id: "cfd3a1fb-3db4-469b-8be9-c124c153fc80",
    title: "LinkedIn Profile Optimization Onboarding",
    slug: "linkedin-profile-optimization-onboarding",
    path: "/linkedin-profile-optimization-onboarding/",
    category: "Lead Generation & Sales",
    iconName: "TrendingUp",
    paperformId: null,
    excerpt: "Personal branding intake: headline positioning, banner design, featured assets, and executive thought-leadership parameters."
  },
  {
    id: "cb0ece77-0567-4803-a2d0-0da6b24766a7",
    title: "Sales Training Consultation Form",
    slug: "sales-training-consultation-form",
    path: "/sales-training-consultation-form/",
    category: "Lead Generation & Sales",
    iconName: "TrendingUp",
    paperformId: null,
    excerpt: "Corporate sales coaching intake: team skill assessment, sales pitch review, discovery questions, and closing frameworks."
  },
  {
    id: "357c7d53-2fde-4800-9127-e7aa136b3d2f",
    title: "PR Onboarding",
    slug: "pr-onboarding",
    path: "/pr-onboarding/",
    category: "PR & Outreach",
    iconName: "Megaphone",
    paperformId: null,
    excerpt: "Public relations client setup: press angles, founder story, target publications, HARO pitching, and media kit assets."
  },
  {
    id: "b01788e4-402e-4b31-af34-8575b6a4089f",
    title: "Pearl Lemon PR Client Onboarding",
    slug: "pearl-lemon-pr-client-onboarding",
    path: "/pearl-lemon-pr-client-onboarding/",
    category: "PR & Outreach",
    iconName: "Megaphone",
    paperformId: null,
    excerpt: "Client media intake for press releases, digital PR link building, journalist relations, and brand authority features."
  },
  {
    id: "b7dcd52e-9e41-457f-9c21-b7d8f5d919e2",
    title: "Pearl Lemon PR Client Onboarding Form",
    slug: "pearl-lemon-pr-client-onboarding-form",
    path: "/pearl-lemon-pr-client-onboarding-form/",
    category: "PR & Outreach",
    iconName: "Megaphone",
    paperformId: null,
    excerpt: "Official PR campaign specification form for thought leadership placements and top-tier editorial outreach."
  },
  {
    id: "6bc49f6b-79ef-4b8d-94ec-101346e22184",
    title: "Podcast Onboarding",
    slug: "podcast-onboarding",
    path: "/podcast-onboarding/",
    category: "PR & Outreach",
    iconName: "Megaphone",
    paperformId: null,
    excerpt: "Guest podcast booking intake: host topics, speaker bio, interview equipment, target listener demographic, and release schedule."
  },
  {
    id: "eec42665-e2cd-4839-a8cf-4f5e4b3b0e8e",
    title: "Podcast Production & Booking Onboarding Form",
    slug: "podcast-onboarding-form",
    path: "/podcast-onboarding-form/",
    category: "PR & Outreach",
    iconName: "Megaphone",
    paperformId: null,
    excerpt: "Audio production and guest booking intake form: show notes, distribution feeds, and brand sponsorship guidelines."
  },
  {
    id: "c6fcc51a-5766-43cf-905d-53b45263c595",
    title: "Social Media Engagement Onboarding Form",
    slug: "social-media-engagement-onboarding-form",
    path: "/social-media-engagement-onboarding-form/",
    category: "PR & Outreach",
    iconName: "Megaphone",
    paperformId: null,
    excerpt: "Community management intake: channel handles, brand voice tone, response playbooks, and content calendar rhythm."
  },
  {
    id: "e2956668-266b-4715-894e-1b3fe8a98504",
    title: "Web Design & Development Onboarding",
    slug: "web-design-development-onboarding",
    path: "/web-design-development-onboarding/",
    category: "Web Design & Dev",
    iconName: "Code",
    paperformId: null,
    excerpt: "Full website development kickoff: wireframe preferences, tech stack, CMS requirements, branding assets, and conversion goals."
  },
  {
    id: "054e4ab1-5870-4b79-a54f-363767069a2e",
    title: "Web Design Onboarding",
    slug: "web-design-onboarding",
    path: "/web-design-onboarding/",
    category: "Web Design & Dev",
    iconName: "Code",
    paperformId: null,
    excerpt: "UI/UX design briefing: visual style guide, reference websites, layout prototypes, and design asset uploads."
  },
  {
    id: "03bab64b-1405-4ac5-a33c-6c7fb8abb1c3",
    title: "PPC & Paid Media Onboarding",
    slug: "ppc-onboarding",
    path: "/ppc-onboarding/",
    category: "General Onboarding",
    iconName: "FileText",
    paperformId: null,
    excerpt: "Paid advertising campaign launch: Google Ads, Meta Ads, conversion pixels, ad budgets, and negative keyword lists."
  },
  {
    id: "0939e41c-f0c6-42fb-b592-488c846d38fd",
    title: "Strategy & Advisory Onboarding",
    slug: "strategy-onboarding",
    path: "/strategy-onboarding/",
    category: "General Onboarding",
    iconName: "FileText",
    paperformId: null,
    excerpt: "Executive business consulting setup: commercial milestones, quarterly OKRs, competitor moat analysis, and growth roadmap."
  },
  {
    id: "8bac9da1-2018-4e7c-b6d0-a7c2398569a8",
    title: "Pearl Lemon Accountants Onboarding",
    slug: "pearl-lemon-accountants-onboarding",
    path: "/pearl-lemon-accountants-onboarding/",
    category: "General Onboarding",
    iconName: "FileText",
    paperformId: null,
    excerpt: "Accounting and financial advisory intake: business entity structure, tax compliance, payroll requirements, and Xero/QuickBooks sync."
  },
  {
    id: "39679eb8-e9bd-46ec-b0d5-3776ce928890",
    title: "PPL Client Onboarding Form",
    slug: "ppl-client-onboarding-form",
    path: "/ppl-client-onboarding-form/",
    category: "Operations & Internal",
    iconName: "Users",
    paperformId: null,
    excerpt: "Pearl Lemon partner and affiliate onboarding: service level agreements, billing contacts, and project governance."
  },
  {
    id: "b28041a4-1c0c-4211-a69d-767fd788de16",
    title: "Staff & Talent Onboarding",
    slug: "staff-onboarding",
    path: "/staff-onboarding/",
    category: "Operations & Internal",
    iconName: "Users",
    paperformId: null,
    excerpt: "Internal team and associate setup: communication channels, access provisioning, operational playbooks, and company values."
  }
];
