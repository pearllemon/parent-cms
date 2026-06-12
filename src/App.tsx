import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteProvider } from "@/providers/SiteProvider";
import Index from "./pages/Index.tsx";
import About from "./pages/About.tsx";
import Blog from "./pages/Blog.tsx";
import Contact from "./pages/Contact.tsx";
import BookACall from "./pages/BookACall.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Press from "./pages/Press.tsx";
import Books from "./pages/Books.tsx";
import Service from "./pages/Service.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import BlogTaxonomy from "./pages/BlogTaxonomy.tsx";
import DynamicPage from "./pages/DynamicPage.tsx";
import AuthorArchive from "./pages/AuthorArchive.tsx";
import TaxonomyArchive from "./pages/TaxonomyArchive.tsx";
import NotFound from "./pages/NotFound.tsx";
import PageTracker from "./components/PageTracker.tsx";
import PopupManager from "./components/PopupManager.tsx";
import PageSchemaInjector from "./components/PageSchemaInjector.tsx";
import RedirectsGate from "./components/RedirectsGate.tsx";

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
import GenericCRUD from "./pages/admin/GenericCRUD.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" richColors />
      <BrowserRouter>
        <SiteProvider>
          <PageTracker />
          <RedirectsGate />
          <PopupManager />
          <PageSchemaInjector />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/category/:slug" element={<BlogTaxonomy mode="category" />} />
            <Route path="/blog/tag/:slug" element={<BlogTaxonomy mode="tag" />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/book-a-call" element={<BookACall />} />
            <Route path="/press" element={<Press />} />
            <Route path="/books" element={<Books />} />
            <Route path="/services/:slug" element={<Service />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            {/* Imported WordPress pages — keep last before admin/catch-all */}
            <Route path="/p/:slug" element={<DynamicPage />} />
            <Route path="/author/:slug" element={<AuthorArchive />} />
            {/* Public taxonomy archives: /category/:slug, /tag/:slug, /:taxonomy/:slug */}
            <Route path="/:taxonomy/:slug" element={<TaxonomyArchive />} />

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
              <Route path="activity" element={<AdminActivityLog />} />
              <Route path="categories" element={<Navigate to="/admin/taxonomies?tax=category" replace />} />
              <Route path="tags" element={<Navigate to="/admin/taxonomies?tax=tag" replace />} />
              <Route path="data/:table" element={<GenericCRUD />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SiteProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
