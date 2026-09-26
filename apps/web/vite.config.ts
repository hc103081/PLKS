import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
// apps/web/vite.config.ts
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@plks/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@plks/web": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
