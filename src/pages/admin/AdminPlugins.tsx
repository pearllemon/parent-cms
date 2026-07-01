import { useEffect, useState } from "react";
import { supabase as cloud } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plug, Check, AlertCircle, Plus, Info } from "lucide-react";

type Plugin = {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  isPro: boolean;
};

const AVAILABLE_PLUGINS: Plugin[] = [
  {
    id: "elementor",
    name: "Elementor",
    version: "4.1.3",
    description: "The core drag-and-drop website builder. Enables visual editing for all pages, posts, and custom post types.",
    author: "Elementor.com",
    isPro: false
  },
  {
    id: "elementor-pro",
    name: "Elementor Pro",
    version: "4.0.1",
    description: "Unlocks premium widgets (FAQ Accordions, Contact Forms, Blog Grids), advanced design controls, and theme building features.",
    author: "Elementor.com",
    isPro: true
  }
];

export default function AdminPlugins() {
  const { config, refresh } = useSiteConfig();
  const siteId = config?.site?.id;
  const [activePlugins, setActivePlugins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<any>(null);

  useEffect(() => {
    if (!siteId) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await cloud
          .from("site_settings")
          .select("*")
          .limit(1)
          .maybeSingle();
        if (data) {
          setSiteSettings(data);
          setActivePlugins(data.extras?.active_plugins || []);
        }
      } catch (e) {
        console.warn("Failed to load plugins:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [siteId]);

  const togglePlugin = async (pluginId: string, active: boolean) => {
    if (!siteId || !siteSettings) return;
    setUpdating(pluginId);
    try {
      let nextActive = [...activePlugins];
      if (active) {
        if (!nextActive.includes(pluginId)) {
          nextActive.push(pluginId);
        }
        // Elementor Pro requires core Elementor
        if (pluginId === "elementor-pro" && !nextActive.includes("elementor")) {
          nextActive.push("elementor");
          toast.info("Elementor Pro requires Elementor Core. Activating both.");
        }
      } else {
        nextActive = nextActive.filter(id => id !== pluginId);
        // Deactivating core Elementor also deactivates Pro
        if (pluginId === "elementor" && nextActive.includes("elementor-pro")) {
          nextActive = nextActive.filter(id => id !== "elementor-pro");
          toast.info("Deactivating Elementor Core also deactivates Elementor Pro.");
        }
      }

      const currentExtras = siteSettings.extras || {};
      const updatedExtras = {
        ...currentExtras,
        active_plugins: nextActive
      };

      const { error } = await cloud
        .from("site_settings")
        .update({
          extras: updatedExtras,
          updated_at: new Date().toISOString()
        })
        .eq("id", siteSettings.id);

      if (error) throw error;

      setActivePlugins(nextActive);
      setSiteSettings((s: any) => ({ ...s, extras: updatedExtras }));
      toast.success(`${AVAILABLE_PLUGINS.find(p => p.id === pluginId)?.name} ${active ? "activated" : "deactivated"} successfully.`);
      refresh();
    } catch (e: any) {
      toast.error("Failed to update plugin: " + e.message);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading plugins…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <Plug className="w-8 h-8 text-primary" />
            Plugins
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage website extensions and visual page builder capabilities.
          </p>
        </div>
        <Button variant="outline" onClick={() => toast.info("Custom plugin uploads are managed via the Plugins directory.")}>
          <Plus className="w-4 h-4 mr-1" /> Add New Plugin
        </Button>
      </div>

      <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-4 rounded-xl flex gap-3 text-xs leading-relaxed max-w-3xl">
        <Info className="w-5 h-5 shrink-0" />
        <div>
          <span className="font-semibold">Plugin Compatibility Layer Active:</span> WordPress plugins in the local <code>Plugins</code> directory are parsed and bridged using our React CMS compatibility system. Activated features are unlocked immediately in the Page/Post editors and visual canvas.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {AVAILABLE_PLUGINS.map((plugin) => {
          const isActive = activePlugins.includes(plugin.id);
          const isPending = updating === plugin.id;

          return (
            <Card key={plugin.id} className={`p-5 flex flex-col justify-between border transition-all ${isActive ? "border-primary/35 shadow-sm" : "border-border"}`}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      {plugin.name}
                      {plugin.isPro && (
                        <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 text-black border-0 text-[10px] py-0 px-2 font-bold">
                          PRO
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Version {plugin.version} | By {plugin.author}
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    disabled={isPending}
                    onCheckedChange={(checked) => togglePlugin(plugin.id, checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {plugin.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  {isActive ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-green-600 font-medium">Active</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                      <span className="text-muted-foreground">Inactive</span>
                    </>
                  )}
                </span>
                {isActive && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-green-500" /> Fully Synced
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
