import { createContext, useContext, useEffect, useState } from "react";
import { getSiteConfig, supabase, type SiteConfig } from "@/lib/parent";

type Ctx = { config: SiteConfig | null; loading: boolean; refresh: () => Promise<void> };
const SiteCtx = createContext<Ctx>({ config: null, loading: true, refresh: async () => {} });

const SYNC_TABLES = [
  "sites",
  "header_configs",
  "footer_configs",
  "themes",
  "popup_configs",
  "error_page_configs",
  "seo_configs",
  "custom_code_entries",
  "dynamic_section_assignments",
  "faq_items",
  "featured_logos",
  "testimonial_items",
  "stats_items",
  "lead_form_configs",
];

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const cfg = await getSiteConfig(true);
    setConfig(cfg);
  };

  useEffect(() => {
    let mounted = true;
    getSiteConfig().then((cfg) => {
      if (!mounted) return;
      setConfig(cfg);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Inject SEO + custom code whenever config updates
  useEffect(() => {
    if (!config) return;
    const seo = config.seoConfig;
    if (seo?.meta_title) document.title = seo.meta_title;
    if (seo?.meta_description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", seo.meta_description);
    }

    const injected: HTMLElement[] = [];
    const inject = (code: string, where: "head" | "body") => {
      const wrapper = document.createElement("div");
      wrapper.dataset.plInject = where;
      wrapper.innerHTML = code;
      Array.from(wrapper.childNodes).forEach((n) => {
        if (n.nodeType === 1) {
          const el = n as HTMLElement;
          (where === "head" ? document.head : document.body).appendChild(el);
          injected.push(el);
        }
      });
    };
    config.customCode?.head?.forEach((e) => inject(e.code, "head"));
    config.customCode?.body?.forEach((e) => inject(e.code, "body"));
    config.customCode?.footer?.forEach((e) => inject(e.code, "body"));

    return () => {
      injected.forEach((el) => el.parentNode?.removeChild(el));
    };
  }, [config]);

  // Realtime sync: re-fetch config whenever any tracked table changes
  useEffect(() => {
    if (!config?.site?.id) return;
    const channel = supabase.channel(`pl-sync-${config.site.id}`);
    SYNC_TABLES.forEach((table) => {
      (channel as unknown as {
        on: (
          ev: string,
          filter: { event: string; schema: string; table: string },
          cb: () => void,
        ) => unknown;
      }).on("postgres_changes", { event: "*", schema: "public", table }, () => {
        refresh();
      });
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [config?.site?.id]);

  return <SiteCtx.Provider value={{ config, loading, refresh }}>{children}</SiteCtx.Provider>;
}

export const useSiteConfig = () => useContext(SiteCtx);
