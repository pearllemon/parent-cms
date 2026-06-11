// Inline automation panel for SEO files: shows the nightly cron status,
// triggers an on-demand server-side regenerate, and lets the admin store a
// webhook URL to ping after each regen (useful for parent/child sync).

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, Save, Webhook } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seo-regenerate`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const WEBHOOK_KEY = "pl_seo_webhook_url";

export function SeoAutomationPanel({ baseUrl, siteName }: { baseUrl: string; siteName?: string }) {
  const [webhook, setWebhook] = useState<string>(() => localStorage.getItem(WEBHOOK_KEY) || "");
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const reload = async () => {
    const { data } = await supabase
      .from("seo_files" as any)
      .select("file_type,auto_enabled,last_generated_at,manual_content")
      .order("file_type");
    setRows((data as any[]) || []);
  };

  useEffect(() => { reload(); }, []);

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({
          base_url: baseUrl,
          site_name: siteName,
          webhook: webhook || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || res.statusText);
      toast.success(`Regenerated ${json.results?.length || 0} file(s)`);
      await reload();
    } catch (e: any) {
      toast.error(`Regenerate failed: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const saveWebhook = () => {
    localStorage.setItem(WEBHOOK_KEY, webhook);
    toast.success("Webhook saved (local)");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="w-4 h-4" /> Automation & Webhooks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border border-border bg-muted/40 p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Nightly cron</span>
            <Badge variant="secondary">Active · 03:15 UTC daily</Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            A scheduled job calls the <code>seo-regenerate</code> edge function every night and refreshes
            any file with auto-regeneration enabled. Files without auto stay frozen at their last manual save.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {["sitemap", "robots", "llms"].map((t) => {
            const r = rows.find((x) => x.file_type === t);
            return (
              <div key={t} className="rounded-md border border-border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium uppercase">{t}</span>
                  <Badge variant={r?.auto_enabled ? "default" : "outline"} className="text-[10px]">
                    {r?.auto_enabled ? "Auto" : "Manual"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Last: {r?.last_generated_at ? new Date(r.last_generated_at).toLocaleString() : "never"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Size: {r?.manual_content ? `${r.manual_content.length} chars` : "—"}
                </p>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Notification webhook (POST after each regen)</Label>
          <div className="flex gap-2">
            <Input
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://parent.example.com/api/seo-sync"
            />
            <Button variant="outline" onClick={saveWebhook}>
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Stored locally and sent with each on-demand run. Configure the same URL on every child site
            to fan-out notifications, or point it at a parent collector to mirror the cached files.
          </p>
        </div>

        <Button onClick={runNow} disabled={running} className="w-full">
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
          Run regenerate now
        </Button>
      </CardContent>
    </Card>
  );
}
