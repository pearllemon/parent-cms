// Schema.org templates and helpers for the page schema builder.
// Each template returns a JSON-LD object ready to embed as <script type="application/ld+json">.

export type SchemaType =
  | "Article"
  | "BlogPosting"
  | "FAQPage"
  | "HowTo"
  | "Product"
  | "Service"
  | "LocalBusiness"
  | "Organization"
  | "WebSite"
  | "BreadcrumbList"
  | "Event"
  | "Recipe"
  | "VideoObject"
  | "Person"
  | "Course";

export const SCHEMA_TYPES: SchemaType[] = [
  "Article", "BlogPosting", "FAQPage", "HowTo", "Product", "Service",
  "LocalBusiness", "Organization", "WebSite", "BreadcrumbList",
  "Event", "Recipe", "VideoObject", "Person", "Course",
];

export type SchemaTemplate = { type: SchemaType; label: string; description: string; example: any };

const tpl = (type: SchemaType, label: string, description: string, example: any): SchemaTemplate =>
  ({ type, label, description, example: { "@context": "https://schema.org", "@type": type, ...example } });

export const SCHEMA_TEMPLATES: SchemaTemplate[] = [
  tpl("Article", "Article", "News, magazine or blog post.", {
    headline: "Article headline (max 110 chars)",
    description: "Short summary",
    author: { "@type": "Person", name: "Author Name" },
    datePublished: new Date().toISOString().slice(0, 10),
    image: ["https://example.com/og.jpg"],
  }),
  tpl("BlogPosting", "Blog Posting", "Blog-specific article variant.", {
    headline: "Post title",
    author: { "@type": "Person", name: "Author Name" },
    datePublished: new Date().toISOString().slice(0, 10),
    mainEntityOfPage: "https://example.com/blog/slug",
  }),
  tpl("FAQPage", "FAQ Page", "Q&A list for answer engines.", {
    mainEntity: [
      { "@type": "Question", name: "What is X?", acceptedAnswer: { "@type": "Answer", text: "X is …" } },
      { "@type": "Question", name: "How does Y work?", acceptedAnswer: { "@type": "Answer", text: "Y works by …" } },
    ],
  }),
  tpl("HowTo", "How-To", "Step-by-step instructions.", {
    name: "How to do X",
    step: [
      { "@type": "HowToStep", name: "Step 1", text: "First, …" },
      { "@type": "HowToStep", name: "Step 2", text: "Then, …" },
    ],
  }),
  tpl("Product", "Product", "Physical or digital product.", {
    name: "Product name",
    image: ["https://example.com/p.jpg"],
    description: "Description",
    sku: "SKU-123",
    offers: { "@type": "Offer", price: "99.00", priceCurrency: "USD", availability: "https://schema.org/InStock" },
  }),
  tpl("Service", "Service", "Professional service offering.", {
    name: "Service name",
    description: "What the service includes",
    provider: { "@type": "Organization", name: "Provider" },
    areaServed: "Worldwide",
  }),
  tpl("LocalBusiness", "Local Business", "Physical business with an address.", {
    name: "Business",
    address: { "@type": "PostalAddress", streetAddress: "1 Main St", addressLocality: "City", postalCode: "12345", addressCountry: "US" },
    telephone: "+1-000-000-0000",
    openingHours: "Mo-Fr 09:00-17:00",
  }),
  tpl("Organization", "Organization", "Sitewide brand/organization.", {
    name: "Organization",
    url: "https://example.com",
    logo: "https://example.com/logo.png",
    sameAs: ["https://twitter.com/handle"],
  }),
  tpl("WebSite", "Web Site", "Sitewide search action.", {
    name: "Site name",
    url: "https://example.com",
    potentialAction: { "@type": "SearchAction", target: "https://example.com/search?q={query}", "query-input": "required name=query" },
  }),
  tpl("BreadcrumbList", "Breadcrumbs", "Navigational breadcrumb trail.", {
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://example.com/" },
      { "@type": "ListItem", position: 2, name: "Section", item: "https://example.com/section" },
    ],
  }),
  tpl("Event", "Event", "Conference, webinar, etc.", {
    name: "Event name",
    startDate: new Date().toISOString(),
    location: { "@type": "Place", name: "Venue", address: "Address" },
  }),
  tpl("Recipe", "Recipe", "Cooking recipe.", {
    name: "Recipe",
    recipeIngredient: ["1 cup …"],
    recipeInstructions: [{ "@type": "HowToStep", text: "Mix …" }],
  }),
  tpl("VideoObject", "Video", "Embedded video.", {
    name: "Video title",
    description: "Description",
    thumbnailUrl: "https://example.com/thumb.jpg",
    uploadDate: new Date().toISOString(),
    contentUrl: "https://example.com/video.mp4",
  }),
  tpl("Person", "Person", "Author or profile.", {
    name: "Full Name",
    jobTitle: "Title",
    url: "https://example.com/about",
  }),
  tpl("Course", "Course", "Educational course.", {
    name: "Course name",
    description: "Description",
    provider: { "@type": "Organization", name: "Provider" },
  }),
];

export function getTemplate(type: SchemaType): SchemaTemplate | undefined {
  return SCHEMA_TEMPLATES.find((t) => t.type === type);
}

// Lightweight validation — checks JSON-LD basics. Not full schema.org validation.
export function validateSchema(json: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!json || typeof json !== "object") errors.push("Schema must be a JSON object.");
  else {
    if (!json["@context"]) errors.push("Missing @context (use https://schema.org).");
    if (!json["@type"]) errors.push("Missing @type.");
    if (json["@type"] === "FAQPage" && !Array.isArray(json.mainEntity)) errors.push("FAQPage requires mainEntity array.");
    if (json["@type"] === "HowTo" && !Array.isArray(json.step)) errors.push("HowTo requires step array.");
    if (json["@type"] === "BreadcrumbList" && !Array.isArray(json.itemListElement)) errors.push("BreadcrumbList requires itemListElement array.");
  }
  return { ok: errors.length === 0, errors };
}
