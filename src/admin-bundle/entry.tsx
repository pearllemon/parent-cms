// Admin bundle entry point.
// Compiled by `vite build --config vite.admin.config.ts` into
// dist/admin-bundle/admin.[hash].js + admin.css and published with each release.
//
// The child wizard dynamically imports this module, calls configure(), then
// renders <AdminApp /> inside its existing <BrowserRouter><Route path="/admin/*">.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteProvider } from "@/providers/SiteProvider";

import AdminShell from "@/pages/admin/AdminShell";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminPosts from "@/pages/admin/AdminPosts";
import AdminPostEditor from "@/pages/admin/AdminPostEditor";
import AdminPageEditor from "@/pages/admin/AdminPageEditor";
import AdminMedia from "@/pages/admin/AdminMedia";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminImport from "@/pages/admin/AdminImport";
import AdminSyncHub from "@/pages/admin/AdminSyncHub";
import AdminSeo from "@/pages/admin/AdminSeo";
import AdminSeoFiles from "@/pages/admin/AdminSeoFiles";
import AdminSeoAudit from "@/pages/admin/AdminSeoAudit";
import AdminSeoWorkspace from "@/pages/admin/AdminSeoWorkspace";
import AdminSchemaBuilder from "@/pages/admin/AdminSchemaBuilder";
import AdminInternalLinks from "@/pages/admin/AdminInternalLinks";
import AdminAuthors from "@/pages/admin/AdminAuthors";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminCPTs from "@/pages/admin/AdminCPTs";
import AdminCPTEntries from "@/pages/admin/AdminCPTEntries";
import AdminThemeDesigner from "@/pages/admin/AdminThemeDesigner";
import AdminTaxonomies from "@/pages/admin/AdminTaxonomies";
import AdminActivityLog from "@/pages/admin/AdminActivityLog";
import AdminReleases from "@/pages/admin/AdminReleases";
import AdminInstallations from "@/pages/admin/AdminInstallations";
import AdminUpgradeLog from "@/pages/admin/AdminUpgradeLog";
import AdminSetupWizard from "@/pages/admin/AdminSetupWizard";
import AdminApiRegistry from "@/pages/admin/AdminApiRegistry";
import AdminSigningKeys from "@/pages/admin/AdminSigningKeys";
import AdminForms from "@/pages/admin/AdminForms";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminComponentCloud from "@/pages/admin/AdminComponentCloud";
import GenericCRUD from "@/pages/admin/GenericCRUD";

// Re-export so wizard can flip Supabase before first render.
export { configureSupabase } from "./supabase-runtime";

// Stamped at build time by Vite define().
export const BUNDLE_VERSION: string = (typeof __ADMIN_BUNDLE_VERSION__ !== "undefined" ? __ADMIN_BUNDLE_VERSION__ : "dev");

const qc = new QueryClient();

/**
 * AdminApp — renders the full admin under whatever parent route the child
 * mounts it at. The parent route MUST be `path="/admin/*"`; routes here are
 * relative to that.
 */
export function AdminApp() {
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" richColors />
        <SiteProvider>
          <Routes>
            <Route path="login" element={<AdminLogin />} />
            <Route path="/" element={<AdminShell />}>
              <Route index element={<AdminDashboard />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="posts/:id" element={<AdminPostEditor />} />
              <Route path="edit/:id" element={<AdminPageEditor />} />
              <Route path="media" element={<AdminMedia />} />
              <Route path="import" element={<AdminImport />} />
              <Route path="sync" element={<AdminSyncHub />} />
              <Route path="sync-control" element={<Navigate to="../sync?tab=control" replace />} />
              <Route path="seo" element={<AdminSeo />} />
              <Route path="seo-files" element={<AdminSeoFiles />} />
              <Route path="seo-audit" element={<AdminSeoAudit />} />
              <Route path="seo-workspace" element={<AdminSeoWorkspace />} />
              <Route path="schema" element={<AdminSchemaBuilder />} />
              <Route path="links" element={<AdminInternalLinks />} />
              <Route path="redirects" element={<Navigate to="../seo-workspace?tab=redirects" replace />} />
              <Route path="authors" element={<AdminAuthors />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="cpt" element={<AdminCPTs />} />
              <Route path="cpt/:slug/entries" element={<AdminCPTEntries />} />
              <Route path="cpt/:slug/entries/:id" element={<AdminCPTEntries />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="theme" element={<AdminThemeDesigner />} />
              <Route path="taxonomies" element={<AdminTaxonomies />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="component-cloud" element={<AdminComponentCloud />} />
              <Route path="activity" element={<AdminActivityLog />} />
              <Route path="categories" element={<Navigate to="../taxonomies?tax=category" replace />} />
              <Route path="tags" element={<Navigate to="../taxonomies?tax=tag" replace />} />
              <Route path="releases" element={<AdminReleases />} />
              <Route path="installations" element={<AdminInstallations />} />
              <Route path="upgrade-log" element={<AdminUpgradeLog />} />
              <Route path="setup-wizard" element={<AdminSetupWizard />} />
              <Route path="apis" element={<AdminApiRegistry />} />
              <Route path="signing-keys" element={<AdminSigningKeys />} />
              <Route path="forms" element={<AdminForms />} />
              <Route path="data/:table" element={<GenericCRUD />} />
            </Route>
          </Routes>
        </SiteProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Type stub for the build-time constant.
declare const __ADMIN_BUNDLE_VERSION__: string;
