import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Served from GitHub Pages at /security-games/.
export default defineConfig({
  base: "/security-games/",
  plugins: [react(), tailwindcss()],
});
