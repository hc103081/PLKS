import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
// apps/web/vite.config.ts
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");

console.log('__dirname:', __dirname);
console.log('root:', root);
console.log('VITE_API_BASE_URL (before load):', process.env['VITE_API_BASE_URL']);
console.log('VITE_TEST (before load):', process.env['VITE_TEST']);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@plks/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@plks/web": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../../public"),
    emptyOutDir: true,
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
  envDir: root,
});