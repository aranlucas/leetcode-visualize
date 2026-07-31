import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 520,
    rolldownOptions: {
      input: {
        sidepanel: resolve(import.meta.dirname, "sidepanel.html"),
        background: resolve(import.meta.dirname, "src/background.ts"),
        content: resolve(import.meta.dirname, "src/content/index.ts"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
