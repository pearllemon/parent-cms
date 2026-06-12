// Consolidated SEO Workspace — all SEO tools in one tabbed page.
// Tabs: Overview · SEO Audit · Internal Linking · Schema Builder ·
// Technical (keywords, social, sitemap, robots, llms) · Redirects · SEO Settings.

import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Gauge, ListChecks, Link2, Database, Wrench, ArrowRightLeft, Settings as Cog,
} from "lucide-react";
import AdminSeoAudit from "./AdminSeoAudit";
import AdminSchemaBuilder from "./AdminSchemaBuilder";
import AdminInternalLinks from "./AdminInternalLinks";
import AdminRedirects from "./AdminRedirects";
import AdminSeoOverview from "./AdminSeoOverview";
import AdminSeoTechnical from "./AdminSeoTechnical";
import AdminSeoSettings from "./AdminSeoSettings";

const TABS = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "audit", label: "SEO Audit", icon: ListChecks },
  { id: "links", label: "Internal Linking", icon: Link2 },
  { id: "schema", label: "Schema Builder", icon: Database },
  { id: "technical", label: "Technical", icon: Wrench },
  { id: "redirects", label: "Redirects", icon: ArrowRightLeft },
  { id: "settings", label: "SEO Settings", icon: Cog },
];

// Old tab ids that were merged or removed — map to their new home.
const LEGACY: Record<string, string> = {
  metadata: "overview",
  keywords: "technical",
  social: "technical",
  sitemap: "technical",
  robots: "technical",
  llms: "technical",
};

export default function AdminSeoWorkspace() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") || "overview";
  const tab = TABS.some((t) => t.id === raw) ? raw : LEGACY[raw] || "overview";

  const onTab = (v: string) => {
    setParams((p) => { p.set("tab", v); p.delete("sub"); return p; }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">SEO Workspace</h1>
        <p className="text-sm text-muted-foreground">All your SEO tools in one place — audit, schema, internal links, technical files, redirects and settings.</p>
      </div>

      <Tabs value={tab} onValueChange={onTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-xl">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id} className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="pt-6"><AdminSeoOverview /></TabsContent>
        <TabsContent value="audit" className="pt-6"><AdminSeoAudit /></TabsContent>
        <TabsContent value="links" className="pt-6"><AdminInternalLinks /></TabsContent>
        <TabsContent value="schema" className="pt-6"><AdminSchemaBuilder /></TabsContent>
        <TabsContent value="technical" className="pt-6"><AdminSeoTechnical /></TabsContent>
        <TabsContent value="redirects" className="pt-6"><AdminRedirects /></TabsContent>
        <TabsContent value="settings" className="pt-6"><AdminSeoSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
