import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import NotFound from "./pages/NotFound.tsx";
import PageTracker from "./components/PageTracker.tsx";
import PopupManager from "./components/PopupManager.tsx";

import AdminShell from "./pages/admin/AdminShell.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminPosts from "./pages/admin/AdminPosts.tsx";
import AdminPostEditor from "./pages/admin/AdminPostEditor.tsx";
import AdminPageEditor from "./pages/admin/AdminPageEditor.tsx";
import AdminMedia from "./pages/admin/AdminMedia.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminImport from "./pages/admin/AdminImport.tsx";
import AdminSync from "./pages/admin/AdminSync.tsx";
import AdminSeo from "./pages/admin/AdminSeo.tsx";
import AdminSeoFiles from "./pages/admin/AdminSeoFiles.tsx";
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
          <PopupManager />
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

            {/* Admin CMS */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<AdminDashboard />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="posts/:id" element={<AdminPostEditor />} />
              <Route path="edit/:id" element={<AdminPageEditor />} />
              <Route path="media" element={<AdminMedia />} />
              <Route path="import" element={<AdminImport />} />
              <Route path="sync" element={<AdminSync />} />
              <Route path="seo" element={<AdminSeo />} />
              <Route path="seo-files" element={<AdminSeoFiles />} />
              <Route path="settings" element={<AdminSettings />} />
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
