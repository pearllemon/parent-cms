// Consolidated SEO Workspace — all SEO tools in one tabbed page.
// Replaces the separate sidebar entries for SEO, SEO Files, SEO Audit,
// Schema Builder, and Internal Links.

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Gauge, ListChecks, Tags, Target, Link2, Database,
  Share2, Map, FileText, Bot, ArrowRightLeft, Settings as Cog,
} from "lucide-react";
import AdminSeo from "./AdminSeo";
import AdminSeoFiles from "./AdminSeoFiles";
import AdminSeoAudit from "./AdminSeoAudit";
import AdminSchemaBuilder from "./AdminSchemaBuilder";
import AdminInternalLinks from "./AdminInternalLinks";
import AdminRedirects from "./AdminRedirects";
import AdminSeoOverview from "./AdminSeoOverview";

const TABS = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "audit", label: "SEO Audit", icon: ListChecks },
  { id: "metadata", label: "Metadata", icon: Tags },
  { id: "keywords", label: "Focus Keywords", icon: Target },
  { id: "links", label: "Internal Linking", icon: Link2 },
  { id: "schema", label: "Schema Builder", icon: Database },
  { id: "social", label: "Social Sharing", icon: Share2 },
  { id: "sitemap", label: "Sitemap", icon: Map },
  { id: "robots", label: "Robots.txt", icon: FileText },
  { id: "llms", label: "llms.txt", icon: Bot },
  { id: "redirects", label: "Redirects", icon: ArrowRightLeft },
  { id: "settings", label: "SEO Settings", icon: Cog },
];

export default function AdminSeoWorkspace() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("tab") || "overview";
  const [tab, setTab] = useState(initial);

  const onTab = (v: string) => {
    setTab(v);
    setParams((p) => { p.set("tab", v); return p; }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">SEO Workspace</h1>
        <p className="text-sm text-muted-foreground">All your SEO tools in one place — audit, metadata, schema, internal links, sitemap, robots and more.</p>
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
        <TabsContent value="metadata" className="pt-6">
          <EmptyTab title="Metadata" hint="Edit per-page meta titles and descriptions from each post's editor (SEO score badge)." />
        </TabsContent>
        <TabsContent value="keywords" className="pt-6">
          <EmptyTab title="Focus Keywords" hint="Manage focus keywords from each post's editor. Multiple keywords are supported — comma separated." />
        </TabsContent>
        <TabsContent value="links" className="pt-6"><AdminInternalLinks /></TabsContent>
        <TabsContent value="schema" className="pt-6"><AdminSchemaBuilder /></TabsContent>
        <TabsContent value="social" className="pt-6">
          <EmptyTab title="Social Sharing" hint="Per-post Open Graph + Twitter cards live inside the post editor under the SEO panel → Social tab." />
        </TabsContent>
        <TabsContent value="sitemap" className="pt-6"><AdminSeoFiles /></TabsContent>
        <TabsContent value="robots" className="pt-6"><AdminSeoFiles /></TabsContent>
        <TabsContent value="llms" className="pt-6"><AdminSeoFiles /></TabsContent>
        <TabsContent value="redirects" className="pt-6"><AdminRedirects /></TabsContent>
        <TabsContent value="settings" className="pt-6"><AdminSeo /></TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyTab({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="border rounded-2xl p-8 text-center bg-muted/20">
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}
