// Technical SEO group — Focus Keywords, Social Sharing and SEO files
// (sitemap.xml / robots.txt / llms.txt) consolidated under one tab.

import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Target, Share2, FileText } from "lucide-react";
import AdminSeoFiles from "./AdminSeoFiles";
import { Card } from "@/components/ui/card";

export default function AdminSeoTechnical() {
  const [params, setParams] = useSearchParams();
  const sub = params.get("sub") || "files";

  const onSub = (v: string) => {
    setParams((p) => { p.set("sub", v); return p; }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <Tabs value={sub} onValueChange={onSub}>
        <TabsList className="bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="files" className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> <span className="text-xs">Sitemap · robots.txt · llms.txt</span>
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> <span className="text-xs">Focus Keywords</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> <span className="text-xs">Social Sharing</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="pt-4">
          <AdminSeoFiles />
        </TabsContent>

        <TabsContent value="keywords" className="pt-4">
          <Card className="p-6 space-y-2">
            <h3 className="text-lg font-medium">Focus Keywords</h3>
            <p className="text-sm text-muted-foreground">
              Focus keywords are managed per page inside each post's editor (SEO panel → Focus Keyword).
              Multiple keywords are supported — comma separated. The SEO score badge on the Posts list
              reflects keyword optimization, and the Overview tab aggregates the results.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="pt-4">
          <Card className="p-6 space-y-2">
            <h3 className="text-lg font-medium">Social Sharing</h3>
            <p className="text-sm text-muted-foreground">
              Per-post Open Graph and Twitter cards live inside the post editor under the SEO panel → Social tab.
              Site-wide defaults (default share image, Twitter handle) are configured in SEO Settings.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
