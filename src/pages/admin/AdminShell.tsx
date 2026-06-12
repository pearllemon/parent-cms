import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase, getSchema, type Schema } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  File,
  Layers,
  Image,
  Settings,
  LogOut,
  Database,
  Upload,
  Cloud,
  Search,
  Users,
  Palette,
  FolderTree,
  Tag,
  type LucideIcon,
} from "lucide-react";

export type AdminRoute = { path: string; label: string; table?: string; icon?: string };

const titleCase = (s: string) =>
  s
    .split(/[_-]/)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const TYPE_ICON: Record<string, string> = {
  post: "FileText",
  page: "File",
};

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, FileText, File, Layers, Image, Upload, Cloud, Settings, Search, Database, Users, Palette, FolderTree, Tag,
};

const SECTION_TABLES: Record<string, string> = {
  testimonial_items: "Testimonials",
  stats_items: "Stats",
  faq_items: "FAQs",
  services: "Services",
  case_studies: "Case Studies",
  team_members: "Team",
  featured_logos: "Logos",
  popup_configs: "Popups",
  lead_form_configs: "Lead Forms",
  leads: "Leads",
  page_views: "Page Views",
  notifications: "Notifications",
};

const AdminShell = () => {
  const nav = useNavigate();
  const location = useLocation();
  const { config } = useSiteConfig();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [schema, setSchema] = useState<Schema | null>(null);

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

  const [postTypes, setPostTypes] = useState<string[]>(["post", "page"]);

  useEffect(() => {
    getSchema().then(setSchema);
  }, []);

  // Discover post types (post, page, custom CPTs) for the current site
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
        const types = Array.from(
          new Set(
            (data as { type: string | null }[])
              .map((r) => r.type || "post")
              .filter(Boolean),
          ),
        );
        // Always surface post + page even if empty
        ["post", "page"].forEach((t) => {
          if (!types.includes(t)) types.push(t);
        });
        setPostTypes(types);
      });
    return () => {
      cancelled = true;
    };
  }, [config?.site?.id]);

  const dynamicRoutes: AdminRoute[] = (schema?.tables || [])
    .filter((t) => t in SECTION_TABLES)
    .map((t) => ({
      path: `/admin/data/${t}`,
      label: SECTION_TABLES[t],
      table: t,
      icon: "Database",
    }));

  // Sidebar entries for each content type
  const contentRoutes: AdminRoute[] = postTypes.map((t) => ({
    path: `/admin/posts?type=${t}`,
    label: t === "post" ? "Posts" : t === "page" ? "Pages" : titleCase(t),
    icon: TYPE_ICON[t] || "Layers",
  }));

  const groups: { label: string; items: AdminRoute[] }[] = [
    {
      label: "",
      items: [{ path: "/admin", label: "Dashboard", icon: "LayoutDashboard" }],
    },
    {
      label: "Content",
      items: [
        ...contentRoutes,
        { path: "/admin/taxonomies?tax=category", label: "Categories", icon: "FolderTree" },
        { path: "/admin/taxonomies?tax=tag", label: "Tags", icon: "Tag" },
        { path: "/admin/taxonomies", label: "Taxonomies", icon: "Database" },
        { path: "/admin/cpt", label: "Custom Types", icon: "Layers" },
        { path: "/admin/media", label: "Media", icon: "Image" },
        { path: "/admin/authors", label: "Authors", icon: "Users" },
      ],
    },
    {
      label: "Design",
      items: [
        { path: "/admin/theme", label: "Theme Designer", icon: "Palette" },
      ],
    },
    {
      label: "Manage",
      items: [
        { path: "/admin/users", label: "Users", icon: "Users" },
        { path: "/admin/import", label: "Import (WP XML)", icon: "Upload" },
        { path: "/admin/sync", label: "Sync", icon: "Cloud" },
        { path: "/admin/seo-workspace", label: "SEO Workspace", icon: "Search" },
        { path: "/admin/settings", label: "Settings", icon: "Settings" },
      ],
    },
    ...(dynamicRoutes.length ? [{ label: "Data", items: dynamicRoutes }] : []),
  ];

  if (authed === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading admin…</div>;
  }
  if (!authed) return null;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="w-60 bg-foreground text-background p-4 flex flex-col">
        <Link to="/" className="font-display text-xl mb-6">
          {config?.site?.name?.toString().slice(0, 22) || "CMS"}
        </Link>
        <nav className="space-y-3 text-sm">
          {groups.map((g, gi) => (
            <div key={g.label || gi}>
              {g.label && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-50">
                  {g.label}
                </p>
              )}
              <div className="space-y-0.5">
                {g.items.map((r) => {
                  const [rPath, rQuery] = r.path.split("?");
                  const isContentLink = rPath === "/admin/posts" && !!rQuery;
                  const currentType = new URLSearchParams(location.search).get("type");
                  const linkType = new URLSearchParams(rQuery || "").get("type");
                  const customActive = isContentLink
                    ? location.pathname.startsWith("/admin/posts") && currentType === linkType
                    : undefined;
                  const Icon = ICONS[r.icon || ""] || Layers;
                  return (
                    <NavLink
                      key={r.path}
                      to={r.path}
                      end={r.path === "/admin"}
                      className={({ isActive }) => {
                        const active =
                          customActive !== undefined
                            ? customActive
                            : isActive &&
                              // prevent default /admin/posts highlight when on a typed variant
                              !(rPath === "/admin/posts" && !rQuery && currentType);
                        return `flex items-center gap-2 py-2 px-3 rounded ${
                          active ? "bg-primary text-primary-foreground" : "hover:bg-background/10"
                        }`;
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {r.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto pt-6 text-xs opacity-60 space-y-1">
          {schema && (
            <>
              <p>{schema.total_tables} tables</p>
              <p>API v{schema.version}</p>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 text-background hover:bg-background/10 w-full justify-start"
            onClick={async () => {
              await supabase.auth.signOut();
              nav("/admin/login", { replace: true });
            }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminShell;
