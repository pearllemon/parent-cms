import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
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

  useEffect(() => {
    getSchema().then(setSchema);
  }, []);

  const dynamicRoutes: AdminRoute[] = (schema?.tables || [])
    .filter((t) => t in SECTION_TABLES)
    .map((t) => ({
      path: `/admin/data/${t}`,
      label: SECTION_TABLES[t],
      table: t,
      icon: "Database",
    }));

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
        <nav className="space-y-1 text-sm">
          {[...KNOWN, ...dynamicRoutes].map((r) => (
            <NavLink
              key={r.path}
              to={r.path}
              end={r.path === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-3 rounded ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-background/10"
                }`
              }
            >
              {r.icon === "LayoutDashboard" && <LayoutDashboard className="w-4 h-4" />}
              {r.icon === "FileText" && <FileText className="w-4 h-4" />}
              {r.icon === "Image" && <Image className="w-4 h-4" />}
              {r.icon === "Upload" && <Upload className="w-4 h-4" />}
              {r.icon === "Cloud" && <Cloud className="w-4 h-4" />}
              {r.icon === "Settings" && <Settings className="w-4 h-4" />}
              {r.icon === "Database" && <Database className="w-4 h-4" />}
              {r.label}
            </NavLink>
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
