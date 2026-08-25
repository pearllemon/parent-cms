import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  Layers,
  FileText,
  TrendingUp,
  Megaphone,
  Code,
  Users,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight
} from "lucide-react";
import { ONBOARDING_FORMS, ONBOARDING_CATEGORIES } from "@/data/onboardingForms";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<string, any> = {
  Layers,
  Search,
  TrendingUp,
  Megaphone,
  Code,
  Users,
  FileText
};

export function OnboardingDirectoryHub({ branding = { primary: "#F4B80E", accent: "#111111" } }: { branding?: any }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const handleCopyLink = (path: string, slug: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const filteredForms = useMemo(() => {
    return ONBOARDING_FORMS.filter((form) => {
      const matchesCategory = selectedCategory === "All" || form.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        form.title.toLowerCase().includes(q) ||
        form.slug.toLowerCase().includes(q) ||
        form.category.toLowerCase().includes(q) ||
        form.excerpt.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  // Schema for SEO & Structured Nav
  const structuredData = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Pearl Lemon Client Onboarding & Intake Portals Directory",
      "description": "Comprehensive index of Pearl Lemon client onboarding forms, intake questionnaires, and department portals.",
      "numberOfItems": ONBOARDING_FORMS.length,
      "itemListElement": ONBOARDING_FORMS.map((form, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": form.title,
        "description": form.excerpt,
        "url": `https://pearllemongroup.com${form.path}`
      }))
    };
  }, []);

  return (
    <main id="main-content" className="min-h-screen bg-slate-50/50 pb-24 font-sans text-slate-900">
      {/* Schema Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-[#0c0d0e] py-20 px-6 text-white text-center">
        <div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: branding.primary }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: branding.primary }}
        />

        <div className="relative z-10 mx-auto max-w-4xl space-y-6">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest bg-white/10 text-white border border-white/10"
          >
            <Sparkles className="size-3.5 text-yellow-400" />
            Centralized Client Intake Directory
          </span>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl font-display leading-tight">
            Client Onboarding &amp;{" "}
            <span style={{ color: branding.primary }}>Intake Portals</span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Select your project onboarding form below to initiate campaign kickoff, share credentials, and configure growth parameters with the Pearl Lemon team.
          </p>

          {/* QUICK STATS BAR */}
          <div className="mx-auto grid max-w-3xl grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-left">
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-sm">
              <div className="text-2xl font-black text-white" style={{ color: branding.primary }}>{ONBOARDING_FORMS.length}+</div>
              <div className="text-xs text-slate-400 font-medium">Active Portals</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-sm">
              <div className="text-2xl font-black text-white">7</div>
              <div className="text-xs text-slate-400 font-medium">Departments</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-1 text-2xl font-black text-emerald-400">
                <ShieldCheck className="size-6 text-emerald-400" /> 256-Bit
              </div>
              <div className="text-xs text-slate-400 font-medium">SSL Encrypted</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-1 text-2xl font-black text-yellow-400">
                <Clock className="size-5 text-yellow-400" /> &lt;4 min
              </div>
              <div className="text-xs text-slate-400 font-medium">Review SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* FILTER & SEARCH CONTROL BAR */}
      <section className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-6 py-4 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Box */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search forms by service, name, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-yellow-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Results Count Badge */}
            <div className="text-xs font-semibold text-slate-500">
              Showing <span className="font-bold text-slate-900">{filteredForms.length}</span> of {ONBOARDING_FORMS.length} onboarding portals
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {ONBOARDING_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              const count = cat === "All" ? ONBOARDING_FORMS.length : ONBOARDING_FORMS.filter(f => f.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* DIRECTORY CARDS GRID */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        {filteredForms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4">
            <Search className="mx-auto size-10 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-900">No onboarding forms found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              We couldn't find any forms matching "{searchQuery}". Try clearing your search query or choosing another department category.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForms.map((form) => {
              const IconComponent = ICON_MAP[form.iconName] || FileText;
              const isPaperform = !!form.paperformId;
              const isCopied = copiedSlug === form.slug;

              return (
                <div
                  key={form.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="space-y-4">
                    {/* Category & Embed Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        <IconComponent className="size-3.5 text-yellow-600" />
                        {form.category}
                      </span>
                      {isPaperform ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Paperform Ready
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200">
                          Intake Portal
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-2">
                        <Link to={form.path}>{form.title}</Link>
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-3">
                        {form.excerpt}
                      </p>
                    </div>

                    {/* URL Path Box */}
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 border border-slate-150 text-[11px] font-mono text-slate-600">
                      <span className="truncate max-w-[200px]" title={form.path}>
                        {form.path}
                      </span>
                      <button
                        onClick={() => handleCopyLink(form.path, form.slug)}
                        className="ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-sans font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                        title="Copy page link"
                      >
                        {isCopied ? (
                          <>
                            <Check className="size-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <Link
                      to={form.path}
                      className="inline-flex items-center gap-1.5 font-bold text-xs hover:underline"
                      style={{ color: "#111" }}
                    >
                      Open Form <ArrowRight className="size-3 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <a
                      href={form.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-700"
                      title="Open in new tab"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTER HELPER CALLOUT */}
      <section className="mx-auto max-w-4xl px-6 pt-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-3 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Need a custom onboarding workflow?</h3>
          <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
            If you need a dedicated questionnaire, proprietary API webhook integration, or custom client portal setup, get in touch with our operations team.
          </p>
          <div className="pt-2">
            <a
              href="mailto:info@pearlemongroup.com"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-md"
            >
              Contact Operations Team &rarr;
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default OnboardingDirectoryHub;
