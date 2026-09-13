import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const configDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const extensionEnv = loadEnv(mode, configDirectory, "VITE_");
  const workspaceEnv = loadEnv(mode, resolve(configDirectory, ".."), "VITE_");
  const publicSupabaseUrl = extensionEnv.VITE_SUPABASE_URL || workspaceEnv.VITE_SUPABASE_URL || "";
  const publicSupabaseAnonKey = extensionEnv.VITE_SUPABASE_ANON_KEY || workspaceEnv.VITE_SUPABASE_ANON_KEY || "";

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(publicSupabaseUrl),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(publicSupabaseAnonKey)
    },
    plugins: [
      react(),
      {
        name: "copy-extension-manifest",
        closeBundle() {
          mkdirSync("dist", { recursive: true });
          copyFileSync("manifest.json", "dist/manifest.json");
        }
      }
    ],
    build: {
      emptyOutDir: true,
      rollupOptions: {
        input: {
          sidepanel: resolve(configDirectory, "src/sidepanel/index.html"),
          serviceWorker: resolve(configDirectory, "src/background/service-worker.ts"),
          contentScript: resolve(configDirectory, "src/content/content-script.ts")
        },
        output: {
          entryFileNames: (chunk) => {
            if (chunk.name === "serviceWorker") return "background/service-worker.js";
            if (chunk.name === "contentScript") return "content/content-script.js";
            return "assets/[name].js";
          },
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name][extname]"
        }
      }
    }
  };
});
