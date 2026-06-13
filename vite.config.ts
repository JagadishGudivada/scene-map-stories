import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// @ts-ignore — plain .mjs script with no types
import { generateSitemap } from "./scripts/generate-sitemap.mjs";

function sitemapPlugin() {
  let ran = false;
  const run = () => {
    if (ran) return;
    ran = true;
    generateSitemap().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[sitemap] skipped:", msg);
    });
  };
  return {
    name: "sarevista-sitemap",
    buildStart() {
      run();
    },
    configureServer() {
      run();
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    sitemapPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

