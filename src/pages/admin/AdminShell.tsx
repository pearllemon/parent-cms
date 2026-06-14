import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase, getSchema, type Schema } from "@/lib/parent";
import { supabase as cloud } from "@/integrations/supabase/client";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, FileText, File, Layers, Image, Settings, LogOut,
  Database, Upload, Cloud, Search, Users, Palette, ChevronDown, ChevronRight, Plus,
  FolderTree, Tag, Activity, Rocket, Server, History, Wand2, type LucideIcon,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const titleCase = (s: string) =>
  s.split(/[_-]/).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

const TYPE_ICON: Record<string, LucideIcon> = { post: FileText, page: File };

const SECTION_TABLES: Record<string, string> = {
  testimonial_items: "Testimonials", stats_items: "Stats", faq_items: "FAQs",
  services: "Services", case_studies: "Case Studies", team_members: "Team",
  featured_logos: "Logos", popup_configs: "Popups", lead_form_configs: "Lead Forms",
  leads: "Leads", page_views: "Page Views", notifications: "Notifications",
};

type CPT = { slug: string; label: string; plural_label: string };
type Taxonomy = { id: string; slug: string; name: string; applies_to: string[] };
type PostType = { slug: string; singular: string; plural: string; icon: LucideIcon };

const AdminShell = () => {
  const nav = useNavigate();
  const location = useLocation();
  const { config } = useSiteConfig();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [cpts, setCpts] = useState<CPT[]>([]);
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [postTypes, setPostTypes] = useState<string[]>(["post", "page"]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("admin-sidebar-open") || "{}"); }
    catch { return {}; }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      if (!data.session) nav("/admin/login", { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      if (!session) nav("/admin/login", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  useEffect(() => { getSchema().then(setSchema); }, []);

  // Load CPTs + taxonomies
  useEffect(() => {
    (cloud.from("custom_post_types" as any) as any)
      .select("slug,label,plural_label")
      .not("slug", "in", "(__global__,__entry__)")
      .order("label")
      .then(({ data }: any) => setCpts((data as CPT[]) || []));
    (cloud.from("taxonomies" as any) as any)
      .select("id,slug,name,applies_to")
      .order("name")
      .then(({ data }: any) => setTaxonomies((data as Taxonomy[]) || []));
  }, []);

  // Discover post types on the current site
  useEffect(() => {
    if (!config?.site?.id) return;
    let cancelled = false;
    supabase
      .from("posts")
      .select("type")
      .eq("site_id", config.site.id)
      .limit(2000)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const types = Array.from(new Set((data as { type: string | null }[])
          .map((r) => r.type || "post").filter(Boolean)));
        ["post", "page"].forEach((t) => { if (!types.includes(t)) types.push(t); });
        setPostTypes(types);
      });
    return () => { cancelled = true; };
  }, [config?.site?.id]);

  const builtIn: PostType[] = useMemo(() => postTypes.map((t) => ({
    slug: t,
    singular: t === "post" ? "Post" : t === "page" ? "Page" : titleCase(t),
    plural: t === "post" ? "Posts" : t === "page" ? "Pages" : titleCase(t),
    icon: TYPE_ICON[t] || Layers,
  })), [postTypes]);

  const cptTypes: PostType[] = useMemo(() => cpts.map((c) => ({
    slug: c.slug, singular: c.label, plural: c.plural_label || c.label, icon: Layers,
  })), [cpts]);

  const allTypes = [...builtIn, ...cptTypes];

  const taxonomiesFor = (typeSlug: string): Taxonomy[] =>
    taxonomies.filter((tx) => tx.applies_to?.includes(typeSlug));

  const toggle = (key: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("admin-sidebar-open", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  };

  // Auto-open the group containing the current route
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const currentType = params.get("type");
    const currentTax = params.get("tax");
    if (currentType) {
      setOpenGroups((p) => (p[`pt:${currentType}`] ? p : { ...p, [`pt:${currentType}`]: true }));
    }
    if (currentTax) {
      // Find which type this taxonomy applies to and open it
      const tx = taxonomies.find((t) => t.slug === currentTax);
      const typeSlug = tx?.applies_to?.[0];
      if (typeSlug) {
        setOpenGroups((p) => (p[`pt:${typeSlug}`] ? p : { ...p, [`pt:${typeSlug}`]: true }));
      }
    }
  }, [location.search, taxonomies]);

  const dynamicRoutes = (schema?.tables || [])
    .filter((t) => t in SECTION_TABLES)
    .map((t) => ({ path: `/admin/data/${t}`, label: SECTION_TABLES[t], icon: Database }));

  if (authed === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading admin…</div>;
  }
  if (!authed) return null;

  const isOpen = (key: string) => !!openGroups[key];
  const isActivePath = (path: string) => {
    const [p, q] = path.split("?");
    if (location.pathname !== p) return false;
    if (!q) return !location.search;
    const linkParams = new URLSearchParams(q);
    const cur = new URLSearchParams(location.search);
    for (const [k, v] of linkParams.entries()) if (cur.get(k) !== v) return false;
    return true;
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="w-64 bg-foreground text-background p-4 flex flex-col">
        <Link to="/" className="font-display text-xl mb-6">
          {config?.site?.name?.toString().slice(0, 22) || "CMS"}
        </Link>

        <nav className="space-y-4 text-sm">
          {/* Dashboard */}
          <SidebarItem to="/admin" label="Dashboard" Icon={LayoutDashboard} end active={location.pathname === "/admin"} />

          {/* Content (per post type, collapsible) */}
          <div>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-50">Content</p>
            <div className="space-y-0.5">
              {allTypes.map((t) => {
                const groupKey = `pt:${t.slug}`;
                const taxes = taxonomiesFor(t.slug);
                const params = new URLSearchParams(location.search);
                const groupActive =
                  location.pathname.startsWith("/admin/posts") && params.get("type") === t.slug ||
                  location.pathname.startsWith(`/admin/cpt/${t.slug}`) ||
                  (location.pathname === "/admin/taxonomies" && taxes.some((tx) => tx.slug === params.get("tax")));
                return (
                  <div key={t.slug}>
                    <button
                      type="button"
                      onClick={() => toggle(groupKey)}
                      className={`w-full flex items-center gap-2 py-2 px-3 rounded text-left ${
                        groupActive && !isOpen(groupKey) ? "bg-primary/30" : "hover:bg-background/10"
                      }`}
                    >
                      {isOpen(groupKey) ? <ChevronDown className="w-3.5 h-3.5 opacity-70" /> : <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                      <t.icon className="w-4 h-4" />
                      <span className="flex-1">{t.plural}</span>
                    </button>

                    {isOpen(groupKey) && (
                      <div className="ml-3 pl-3 border-l border-background/10 space-y-0.5 py-1">
                        <SubItem
                          to={builtInListPath(t.slug)}
                          label={`All ${t.plural}`}
                          active={isActivePath(builtInListPath(t.slug))}
                        />
                        <SubItem
                          to={builtInNewPath(t.slug)}
                          label={`Add New ${t.singular}`}
                          Icon={Plus}
                          active={isActivePath(builtInNewPath(t.slug))}
                        />
                        {taxes.map((tx) => (
                          <SubItem
                            key={tx.id}
                            to={`/admin/taxonomies?tax=${tx.slug}`}
                            label={tx.name}
                            Icon={tx.slug === "tag" || tx.slug.endsWith("tags") ? Tag : FolderTree}
                            active={
                              location.pathname === "/admin/taxonomies" &&
                              new URLSearchParams(location.search).get("tax") === tx.slug
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <SidebarItem to="/admin/cpt" label="Custom Types" Icon={Layers} active={location.pathname === "/admin/cpt"} />
              <SidebarItem to="/admin/media" label="Media" Icon={Image} active={location.pathname.startsWith("/admin/media")} />
              <SidebarItem to="/admin/authors" label="Authors" Icon={Users} active={location.pathname.startsWith("/admin/authors")} />
            </div>
          </div>

          {/* Design */}
          <div>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-50">Design</p>
            <div className="space-y-0.5">
              <SidebarItem to="/admin/theme" label="Theme Designer" Icon={Palette} active={location.pathname.startsWith("/admin/theme")} />
            </div>
          </div>

          {/* Manage */}
          <div>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-50">Manage</p>
            <div className="space-y-0.5">
              <SidebarItem to="/admin/users" label="Users" Icon={Users} active={location.pathname.startsWith("/admin/users")} />
              <SidebarItem to="/admin/import" label="Import (WP XML)" Icon={Upload} active={location.pathname.startsWith("/admin/import")} />
              <SidebarItem to="/admin/sync" label="Sync" Icon={Cloud} active={location.pathname.startsWith("/admin/sync")} />
              <SidebarItem to="/admin/seo-workspace" label="SEO Workspace" Icon={Search} active={location.pathname.startsWith("/admin/seo")} />
              <SidebarItem to="/admin/activity" label="Activity Log" Icon={Activity} active={location.pathname.startsWith("/admin/activity")} />
              <SidebarItem to="/admin/settings" label="Settings" Icon={Settings} active={location.pathname.startsWith("/admin/settings")} />
            </div>
          </div>

          {/* Distribution */}
          <div>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-50">Distribution</p>
            <div className="space-y-0.5">
              <SidebarItem to="/admin/releases" label="Releases" Icon={Rocket} active={location.pathname.startsWith("/admin/releases")} />
              <SidebarItem to="/admin/installations" label="Installations" Icon={Server} active={location.pathname.startsWith("/admin/installations")} />
              <SidebarItem to="/admin/upgrade-log" label="Upgrade Log" Icon={History} active={location.pathname.startsWith("/admin/upgrade-log")} />
            </div>
          </div>

          {/* Data */}
          {dynamicRoutes.length > 0 && (
            <div>
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-50">Data</p>
              <div className="space-y-0.5">
                {dynamicRoutes.map((r) => (
                  <SidebarItem key={r.path} to={r.path} label={r.label} Icon={r.icon} active={location.pathname === r.path} />
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-6 text-xs opacity-60 space-y-1">
          {schema && (<><p>{schema.total_tables} tables</p><p>API v{schema.version}</p></>)}
          <Button
            size="sm" variant="ghost"
            className="mt-2 text-background hover:bg-background/10 w-full justify-start"
            onClick={async () => { await supabase.auth.signOut(); nav("/admin/login", { replace: true }); }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-x-auto"><Outlet /></main>
    </div>
  );
};

const builtInListPath = (typeSlug: string) =>
  typeSlug === "post" || typeSlug === "page"
    ? `/admin/posts?type=${typeSlug}`
    : `/admin/cpt/${typeSlug}/entries`;

const builtInNewPath = (typeSlug: string) =>
  typeSlug === "post" || typeSlug === "page"
    ? `/admin/posts?type=${typeSlug}&new=1`
    : `/admin/cpt/${typeSlug}/entries?new=1`;

function SidebarItem({ to, label, Icon, active, end }: { to: string; label: string; Icon: LucideIcon; active?: boolean; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={() =>
        `flex items-center gap-2 py-2 px-3 rounded ${active ? "bg-primary text-primary-foreground" : "hover:bg-background/10"}`
      }
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </NavLink>
  );
}

function SubItem({ to, label, Icon, active }: { to: string; label: string; Icon?: LucideIcon; active?: boolean }) {
  return (
    <NavLink
      to={to}
      className={() =>
        `flex items-center gap-2 py-1.5 px-3 rounded text-[13px] ${active ? "bg-primary text-primary-foreground" : "hover:bg-background/10 opacity-90"}`
      }
    >
      {Icon ? <Icon className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5" />}
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default AdminShell;
