// SEO Settings — actual configuration only (no sitemap/robots duplication).
// Edits the singleton seo_settings row: base URL, default metadata,
// social/organization identity.

import { useEffect, useState } from "react";
import { getSeoSettings, saveSeoSettings, type SeoSettings } from "@/lib/seoSettings";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSeoSettings() {
  const { data, loading, refresh } = useCachedQuery<SeoSettings>("seo:settings", getSeoSettings);
  const [form, setForm] = useState<SeoSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !form) setForm(data);
    // eslint-disable-next-line
  }, [data]);

  if (loading && !form) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }
  if (!form) return null;

  const set = (patch: Partial<SeoSettings>) => setForm({ ...form, ...patch });

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSeoSettings({
        base_url: form.base_url,
        default_title_suffix: form.default_title_suffix,
        default_meta_description: form.default_meta_description,
        default_focus_keyword: form.default_focus_keyword,
        twitter_handle: form.twitter_handle,
        organization_name: form.organization_name,
        organization_logo: form.organization_logo,
        social_image: form.social_image,
      });
      toast.success("SEO settings saved");
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-display">SEO Settings</h2>
          <p className="text-sm text-muted-foreground">
            Site-wide SEO configuration. Sitemap, robots.txt and llms.txt are managed under the Technical tab.
          </p>
        </div>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save settings
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-medium">Site identity</h3>
        <div>
          <Label className="text-xs">Base URL (canonicals, sitemap, social tags)</Label>
          <Input value={form.base_url || ""} onChange={(e) => set({ base_url: e.target.value })} placeholder="https://yourdomain.com" />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Organization name</Label>
            <Input value={form.organization_name || ""} onChange={(e) => set({ organization_name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Organization logo URL</Label>
            <Input value={form.organization_logo || ""} onChange={(e) => set({ organization_logo: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-medium">Default metadata</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Default title suffix</Label>
            <Input value={form.default_title_suffix || ""} onChange={(e) => set({ default_title_suffix: e.target.value })} placeholder=" — Brand Name" />
          </div>
          <div>
            <Label className="text-xs">Default focus keyword</Label>
            <Input value={form.default_focus_keyword || ""} onChange={(e) => set({ default_focus_keyword: e.target.value })} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Default meta description (used when a page has none)</Label>
          <Textarea rows={3} value={form.default_meta_description || ""} onChange={(e) => set({ default_meta_description: e.target.value })} />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-medium">Social</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Twitter / X handle</Label>
            <Input value={form.twitter_handle || ""} onChange={(e) => set({ twitter_handle: e.target.value })} placeholder="@handle" />
          </div>
          <div>
            <Label className="text-xs">Default social share image URL</Label>
            <Input value={form.social_image || ""} onChange={(e) => set({ social_image: e.target.value })} />
          </div>
        </div>
      </Card>
    </div>
  );
}
