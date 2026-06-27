import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteProvider } from "@/providers/SiteProvider";
import SiteHeadInjection from "@/components/SiteHeadInjection";
import PageTracker from "./components/PageTracker.tsx";
import RedirectsGate from "./components/RedirectsGate.tsx";

import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";

import AdminShell from "./pages/admin/AdminShell.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminPosts from "./pages/admin/AdminPosts.tsx";
import AdminPostEditor from "./pages/admin/AdminPostEditor.tsx";
import AdminPageEditor from "./pages/admin/AdminPageEditor.tsx";
import AdminMedia from "./pages/admin/AdminMedia.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminImport from "./pages/admin/AdminImport.tsx";
import AdminSyncHub from "./pages/admin/AdminSyncHub.tsx";
import AdminSeo from "./pages/admin/AdminSeo.tsx";
import AdminSeoFiles from "./pages/admin/AdminSeoFiles.tsx";
import AdminSeoAudit from "./pages/admin/AdminSeoAudit.tsx";
import AdminSeoWorkspace from "./pages/admin/AdminSeoWorkspace.tsx";
import AdminSchemaBuilder from "./pages/admin/AdminSchemaBuilder.tsx";
import AdminInternalLinks from "./pages/admin/AdminInternalLinks.tsx";
import AdminAuthors from "./pages/admin/AdminAuthors.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminCPTs from "./pages/admin/AdminCPTs.tsx";
import AdminCPTEntries from "./pages/admin/AdminCPTEntries.tsx";
import AdminThemeDesigner from "./pages/admin/AdminThemeDesigner.tsx";
import AdminTaxonomies from "./pages/admin/AdminTaxonomies.tsx";
import AdminActivityLog from "./pages/admin/AdminActivityLog.tsx";
import AdminReleases from "./pages/admin/AdminReleases.tsx";
import AdminInstallations from "./pages/admin/AdminInstallations.tsx";
import AdminUpgradeLog from "./pages/admin/AdminUpgradeLog.tsx";
import AdminSetupWizard from "./pages/admin/AdminSetupWizard.tsx";
import AdminApiRegistry from "./pages/admin/AdminApiRegistry.tsx";
import AdminSigningKeys from "./pages/admin/AdminSigningKeys.tsx";
import AdminForms from "./pages/admin/AdminForms.tsx";
import AdminLeads from "./pages/admin/AdminLeads.tsx";
import AdminComponentCloud from "./pages/admin/AdminComponentCloud.tsx";
import AdminManagementLink from "./pages/admin/AdminManagementLink.tsx";
import GenericCRUD from "./pages/admin/GenericCRUD.tsx";
import ThemeTokensInjector from "@/components/ThemeTokensInjector";
import ComponentCloudSync from "@/components/ComponentCloudSync";
import PageView from "./pages/PageView.tsx";

const queryClient = new QueryClient();

const IS_CHILD = (import.meta.env.VITE_CMS_MODE || "parent") === "child";
const ParentOnly = ({ element }: { element: JSX.Element }) =>
  IS_CHILD ? <Navigate to="/admin" replace /> : element;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" richColors />
      <BrowserRouter>
        <SiteProvider>
          <PageTracker />
          <RedirectsGate />
          <SiteHeadInjection />
          <ThemeTokensInjector />
          <ComponentCloudSync />
          <Routes>
            <Route path="/" element={<PageView type="page" homepage={true} />} />
            <Route path="/p/:slug" element={<PageView type="page" />} />
            <Route path="/:slug" element={<PageView type="page" />} />
            <Route path="/blog/:slug" element={<PageView type="post" />} />
            <Route path="/blog" element={<PageView type="post" homepage={true} />} />

            {/* Admin CMS */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<AdminDashboard />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="posts/:id" element={<AdminPostEditor />} />
              <Route path="edit/:id" element={<AdminPageEditor />} />
              <Route path="media" element={<AdminMedia />} />
              <Route path="import" element={<AdminImport />} />
              <Route path="sync" element={<AdminSyncHub />} />
              <Route path="sync-control" element={<Navigate to="/admin/sync?tab=control" replace />} />
              <Route path="seo" element={<AdminSeo />} />
              <Route path="seo-files" element={<AdminSeoFiles />} />
              <Route path="seo-audit" element={<AdminSeoAudit />} />
              <Route path="seo-workspace" element={<AdminSeoWorkspace />} />
              <Route path="schema" element={<AdminSchemaBuilder />} />
              <Route path="links" element={<AdminInternalLinks />} />
              <Route path="redirects" element={<Navigate to="/admin/seo-workspace?tab=redirects" replace />} />
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
              <Route path="categories" element={<Navigate to="/admin/taxonomies?tax=category" replace />} />
              <Route path="tags" element={<Navigate to="/admin/taxonomies?tax=tag" replace />} />
              <Route path="releases" element={<ParentOnly element={<AdminReleases />} />} />
              <Route path="installations" element={<ParentOnly element={<AdminInstallations />} />} />
              <Route path="upgrade-log" element={<ParentOnly element={<AdminUpgradeLog />} />} />
              <Route path="setup-wizard" element={<ParentOnly element={<AdminSetupWizard />} />} />
              <Route path="apis" element={<ParentOnly element={<AdminApiRegistry />} />} />
              <Route path="signing-keys" element={<ParentOnly element={<AdminSigningKeys />} />} />
              <Route path="management-link" element={<AdminManagementLink />} />
              <Route path="forms" element={<AdminForms />} />
              <Route path="data/:table" element={<GenericCRUD />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </SiteProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
