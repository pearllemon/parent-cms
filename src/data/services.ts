// Service catalog used by the dynamic /services/:slug route and the Pro Services carousel.
export type ServiceContent = {
  slug: string;
  title: string;
  tagline: string;
  intro: string;
  image: string;
  externalUrl: string;
  highlights: { title: string; body: string }[];
  bullets: string[];
  cta: string;
};

export const services: ServiceContent[] = [
  {
    slug: "sales-expert-london",
    title: "Sales Expert London",
    tagline: "Close more, faster — with a system that holds up under pressure.",
    intro:
      "I help founders and sales teams in London (and beyond) install repeatable outbound, qualify smarter and shorten cycles — using the same playbooks I built at Pearl Lemon to scale us past seven figures.",
    image: "https://deepakshukla.com/wp-content/uploads/2024/08/sales-expert.png",
    externalUrl: "https://deepakshukla.com/sales-expert-london/",
    highlights: [
      { title: "Outbound that actually books", body: "Multi-channel sequences (email + LinkedIn + cold call) tuned to your ICP and tone." },
      { title: "Qualification frameworks", body: "BANT, MEDDIC or custom — installed across discovery so you stop wasting cycles." },
      { title: "Sales ops & CRM hygiene", body: "Pipelines that tell the truth, dashboards leaders trust, and forecasts you can stand behind." },
    ],
    bullets: [
      "Audit of your current sales motion (calls, copy, CRM)",
      "ICP refinement and target-account list build",
      "Multi-touch outbound sequences (cold email + LinkedIn + cold call)",
      "Discovery, demo and objection-handling scripts",
      "Sales hiring scorecards and onboarding playbooks",
    ],
    cta: "Hire me as your fractional sales expert",
  },
  {
    slug: "growth-hacking-expert-london",
    title: "Growth Hacking Expert London",
    tagline: "Compound growth — built from acquisition, activation and monetisation experiments.",
    intro:
      "Growth is a system, not a stunt. I run weekly experiment cycles across acquisition, activation and monetisation so you compound — instead of chasing the next channel.",
    image: "https://deepakshukla.com/wp-content/uploads/2024/08/JSHFJS.png",
    externalUrl: "https://deepakshukla.com/growth-hacking-expert-london/",
    highlights: [
      { title: "Experiment engine", body: "Hypothesis → test → result loops every 1–2 weeks across the funnel." },
      { title: "AARRR audit", body: "Acquisition, activation, retention, referral, revenue — diagnosed before we ship." },
      { title: "Channel diversification", body: "SEO, paid, partnerships, lifecycle, community — sequenced to compound, not collide." },
    ],
    bullets: [
      "Funnel teardown with bottleneck identification",
      "Backlog of 50–100 prioritised growth experiments (ICE-scored)",
      "Lifecycle email & in-app messaging set-up",
      "Paid + organic acquisition mix recommendations",
      "Weekly review cadence with your team",
    ],
    cta: "Build my growth engine",
  },
  {
    slug: "digital-marketing-expert",
    title: "Digital Marketing Expert",
    tagline: "Strategy, execution and accountability — across every channel that matters.",
    intro:
      "From SEO and content to paid social and lifecycle, I’ve operated every major digital channel in-house at Pearl Lemon. I’ll help you stop guessing and start picking the channels that actually move revenue for your business.",
    image: "https://deepakshukla.com/wp-content/uploads/2024/08/3rd-by-me.png",
    externalUrl: "https://deepakshukla.com/digital-marketing-expert/",
    highlights: [
      { title: "Full-funnel strategy", body: "Top-of-funnel awareness through bottom-of-funnel conversion mapped to revenue." },
      { title: "Channel selection", body: "We pick 2–3 channels you can win, not 12 you can’t resource." },
      { title: "Measurement that holds", body: "GA4, server-side tracking, attribution & dashboards your CFO will trust." },
    ],
    bullets: [
      "Brand & positioning audit",
      "Channel mix recommendation (with budgets)",
      "Content & SEO strategy",
      "Paid media set-up (Meta, Google, LinkedIn)",
      "Lifecycle email and retention plans",
    ],
    cta: "Plan my digital marketing",
  },
  {
    slug: "communications-consultant",
    title: "Communications Consultant",
    tagline: "Tighten the message. Lift the brand. Win the room.",
    intro:
      "Whether you’re pitching investors, opening keynotes, or trying to get noticed in a crowded market — your communications either pull people closer or push them away. I help you make sure it’s the former.",
    image: "https://deepakshukla.com/wp-content/uploads/2024/08/1sr.png",
    externalUrl: "https://deepakshukla.com/communications-consultant/",
    highlights: [
      { title: "Narrative architecture", body: "Find the one story that everything else hangs off — for sales, PR and hiring." },
      { title: "Founder voice", body: "Sharpen your written and spoken voice so you sound unmistakably like you." },
      { title: "Stakeholder comms", body: "Investor updates, board memos, and crisis comms that build trust under pressure." },
    ],
    bullets: [
      "Founder & brand narrative workshop",
      "Pitch deck and investor-update templates",
      "Talk-track development for keynotes & sales",
      "Internal comms (all-hands, written updates)",
      "Crisis communications playbook",
    ],
    cta: "Sharpen my communications",
  },
  {
    slug: "sales-trainer-london",
    title: "Sales Trainer London",
    tagline: "Train your team on the same systems I use at Pearl Lemon.",
    intro:
      "I’ve trained hundreds of SDRs, AEs and founders on cold outbound, discovery, demo and closing. Workshops are practical, role-play heavy, and built around your real pipeline — not slides.",
    image: "https://deepakshukla.com/wp-content/uploads/2024/08/5th-11.png",
    externalUrl: "https://deepakshukla.com/sales-trainer-london/",
    highlights: [
      { title: "Outbound bootcamp", body: "Cold email, cold call, LinkedIn — your team writes & sends live." },
      { title: "Discovery mastery", body: "Question stacks that uncover real pain instead of vanity problems." },
      { title: "Closing under pressure", body: "Objection handling, multi-threading, negotiation and procurement playbooks." },
    ],
    bullets: [
      "Half-day or multi-day on-site workshops",
      "Recorded follow-up modules for self-paced practice",
      "Live call shadowing & feedback",
      "Custom scripts and templates for your ICP",
      "30/60/90 ramp plans for new hires",
    ],
    cta: "Train my sales team",
  },
  {
    slug: "negative-seo-removal",
    title: "Negative SEO Removal",
    tagline: "Detect attacks. Disavow toxicity. Recover rankings.",
    intro:
      "If your traffic dropped after a wave of spammy backlinks, scraped content or fake reviews, you’re likely the target of a negative SEO attack. I’ll help you identify, neutralise and recover.",
    image: "https://deepakshukla.com/wp-content/uploads/2024/08/Negative-Seo.png",
    externalUrl: "https://deepakshukla.com/negative-seo-removal/",
    highlights: [
      { title: "Attack diagnosis", body: "Backlink, content and SERP audit to confirm what’s actually happening." },
      { title: "Disavow & cleanup", body: "Coordinated outreach + Google disavow file + content de-duplication." },
      { title: "Long-term defence", body: "Monitoring stack so you catch the next attack within 24 hours." },
    ],
    bullets: [
      "Full backlink audit (Ahrefs + Semrush + GSC)",
      "Toxic link removal outreach",
      "Disavow file creation and submission",
      "Content scraping & duplicate content review",
      "Ongoing monitoring & alerting",
    ],
    cta: "Recover my rankings",
  },
  {
    slug: "google-analytics-expert",
    title: "Google Analytics Expert",
    tagline: "GA4 set up properly. Reports your team will actually use.",
    intro:
      "Most GA4 set-ups I see are broken in three places before lunch. I’ll get your tracking, conversions, server-side tagging and dashboards right — so the numbers you make decisions on are real.",
    image: "https://deepakshukla.com/wp-content/uploads/2024/08/4th-11.png",
    externalUrl: "https://deepakshukla.com/google-analytics-expert/",
    highlights: [
      { title: "GA4 audit", body: "Event tracking, conversions, audiences and integrations checked end-to-end." },
      { title: "Server-side tagging", body: "First-party, privacy-safe tracking that survives ad-blockers and iOS." },
      { title: "Looker dashboards", body: "Cross-channel dashboards your team can read at a glance." },
    ],
    bullets: [
      "GA4 + GTM audit",
      "Conversion event mapping",
      "Server-side GTM set-up",
      "Looker / Looker Studio dashboards",
      "Quarterly review cadence",
    ],
    cta: "Fix my analytics",
  },
  {
    slug: "google-search-console-expert",
    title: "Google Search Console Expert",
    tagline: "Diagnose drops. Surface opportunity. Ship the fix.",
    intro:
      "Search Console is the most underused tool in SEO. I’ll mine it for the queries you’re almost ranking for, the pages that are leaking authority, and the technical issues quietly holding you back.",
    image: "https://deepakshukla.com/wp-content/uploads/2024/08/6th-11.png",
    externalUrl: "https://deepakshukla.com/google-search-console-expert/",
    highlights: [
      { title: "Coverage & indexation", body: "Find pages Google can’t — or won’t — index, and fix the root cause." },
      { title: "Query mining", body: "Surface page-by-page striking-distance opportunities." },
      { title: "Core Web Vitals", body: "Diagnose LCP, INP and CLS issues with field & lab data." },
    ],
    bullets: [
      "Full GSC audit (coverage, performance, vitals, manual actions)",
      "Striking-distance keyword report",
      "Internal linking recommendations",
      "Core Web Vitals fix plan",
      "Monthly SEO performance review",
    ],
    cta: "Audit my Search Console",
  },
  {
    slug: "heatmaps-expert",
    title: "Heatmaps Expert",
    tagline: "Watch what users actually do — then fix it.",
    intro:
      "Heatmaps, scroll maps and session recordings are gold — if you know what to look for. I’ll set up the tooling, run the analysis and turn it into prioritised CRO fixes that lift conversion.",
    image: "https://deepakshukla.com/wp-content/uploads/2024/08/BLUE.png",
    externalUrl: "https://deepakshukla.com/heatmaps-expert/",
    highlights: [
      { title: "Tooling set-up", body: "Hotjar, Microsoft Clarity, FullStory or LogRocket — installed cleanly." },
      { title: "Behavioural analysis", body: "We watch sessions, segment by intent, and find the friction." },
      { title: "CRO backlog", body: "Prioritised list of A/B tests with expected lift and effort." },
    ],
    bullets: [
      "Heatmap & recording tool set-up",
      "Funnel & form analysis",
      "Top 10 friction points report",
      "A/B test backlog (ICE-scored)",
      "Implementation support",
    ],
    cta: "Find my conversion leaks",
  },
];

export const findService = (slug: string) => services.find((s) => s.slug === slug);
