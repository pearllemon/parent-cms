// Library-mode build for the admin bundle that the child wizard mounts at
// runtime. Output: dist/admin-bundle/admin-<hash>.js + admin.css.
//
// IMPORTANT aliasing: `@/integrations/supabase/client` is redirected to our
// runtime proxy so every admin module talks to the CHILD's Supabase project,
// not the parent's.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8"));
const version: string = pkg.version || "0.0.0";

export default defineConfig({
  define: {
    __ADMIN_BUNDLE_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      // Redirect parent-baked Supabase client to the runtime-configurable proxy.
      "@/integrations/supabase/client": path.resolve(__dirname, "src/admin-bundle/supabase-runtime.ts"),
      "@": path.resolve(__dirname, "src"),
    },
    dedupe: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
  },
  plugins: [react()],
  build: {
    outDir: "dist/admin-bundle",
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    minify: "esbuild",
    target: "es2020",
    lib: {
      entry: path.resolve(__dirname, "src/admin-bundle/entry.tsx"),
      name: "CmsAdminBundle",
      formats: ["es"],
      fileName: () => "admin.js",
    },
    rollupOptions: {
      // Externalize peer deps the child app already provides — avoids React
      // dup-instance bugs (hooks/router context).
      external: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-router-dom",
        "@tanstack/react-query",
      ],
      output: {
        // Single chunk so the wizard fetches one URL.
        inlineDynamicImports: true,
        assetFileNames: (info) => (info.name?.endsWith(".css") ? "admin.css" : "[name][extname]"),
      },
    },
  },
});
