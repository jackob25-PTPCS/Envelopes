import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // relative paths so the built app loads over file:// inside Electron
  base: "./",
  server: { host: true, port: 5173 },
  build: { outDir: "dist", emptyOutDir: true },
});
