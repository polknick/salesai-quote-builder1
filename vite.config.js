import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static build, no server-side code. Output goes to /dist for Cloudflare Pages.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
